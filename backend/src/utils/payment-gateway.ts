import crypto from "node:crypto";
import { logInfo, logWarn } from "./logger.js";

const CONTEXT = "PaymentGateway";

/**
 * Outcome of a charge attempt. Discriminated union so a real provider can
 * replace the mock without changing callers.
 */
export type PaymentResult =
  | { outcome: "paid"; reference: string }
  | { outcome: "failed"; reason: string };

/**
 * Mock payment gateway. Deterministic for testing: a positive amount is
 * charged successfully; a non-positive amount is declined.
 */
export function charge(amount: number): PaymentResult {
  if (amount > 0) {
    const reference = crypto.randomUUID();
    logInfo(CONTEXT, `Charged ${amount} -> paid (${reference})`);
    return { outcome: "paid", reference };
  }

  const reason = `Invalid charge amount: ${amount}`;
  logWarn(CONTEXT, `Charged ${amount} -> failed (${reason})`);
  return { outcome: "failed", reason };
}
