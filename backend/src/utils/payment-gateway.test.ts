import { afterEach, describe, expect, it, vi } from "vitest";
import { charge } from "./payment-gateway.js";

describe("payment-gateway charge", () => {
  it("returns a paid outcome with a reference for a positive amount", () => {
    const result = charge(1500);

    expect(result.outcome).toBe("paid");
    if (result.outcome === "paid") {
      expect(result.reference).toBeTypeOf("string");
      expect(result.reference.length).toBeGreaterThan(0);
    }
  });

  it("returns distinct references on each successful charge", () => {
    const first = charge(100);
    const second = charge(100);

    if (first.outcome === "paid" && second.outcome === "paid") {
      expect(first.reference).not.toBe(second.reference);
    }
  });

  it("returns a failed outcome with a reason for a zero amount", () => {
    const result = charge(0);

    expect(result.outcome).toBe("failed");
    if (result.outcome === "failed") {
      expect(result.reason).toBeTypeOf("string");
    }
  });

  it("returns a failed outcome for a negative amount", () => {
    const result = charge(-50);

    expect(result.outcome).toBe("failed");
  });

  describe("logging (AC: log amount and resulting outcome)", () => {
    afterEach(() => vi.restoreAllMocks());

    it("logs the amount and the paid outcome on a successful charge", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      charge(2500);

      const logged = logSpy.mock.calls.map((args) => String(args[0])).join("\n");
      expect(logged).toContain("2500");
      expect(logged).toMatch(/paid/i);
    });

    it("logs the amount and the failed outcome on a declined charge", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      charge(0);

      const logged = warnSpy.mock.calls.map((args) => String(args[0])).join("\n");
      expect(logged).toContain("0");
      expect(logged).toMatch(/failed/i);
    });
  });
});
