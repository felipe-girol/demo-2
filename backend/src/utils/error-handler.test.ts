import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { sendPaymentRequired } from "./error-handler.js";

/** Minimal Express Response stub capturing status and JSON body. */
function mockResponse(): Response {
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  };
  return res as unknown as Response;
}

describe("error-handler sendPaymentRequired (AC: decline -> client error + message)", () => {
  it("responds 402 with the payment failure message", () => {
    const res = mockResponse();

    sendPaymentRequired(res, "Invalid charge amount: 0");

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid charge amount: 0" });
  });
});
