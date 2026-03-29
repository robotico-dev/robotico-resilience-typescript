import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { CircuitBreaker } from "./circuit-breaker.js";
import { CircuitOpenError } from "./circuit-open-error.js";
import { executeWithRetry } from "./execute-with-retry.js";
import { nextBackoffMs } from "./next-backoff-ms.js";

describe("resilience properties", () => {
  it("nextBackoffMs with zero jitter is exponential capped by maxDelayMs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5000 }),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 2_000_000 }),
        (baseDelayMs, attemptIndex, maxDelayMs) => {
          const exp = Math.min(
            maxDelayMs,
            baseDelayMs * Math.pow(2, Math.max(0, attemptIndex))
          );
          const expected = Math.min(maxDelayMs, Math.floor(exp));
          const got = nextBackoffMs(attemptIndex, baseDelayMs, maxDelayMs, 0);
          return got === expected;
        }
      ),
      { numRuns: 200 }
    );
  });

  it("nextBackoffMs is non-decreasing in attempt when jitter is zero", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2000 }),
        fc.integer({ min: 5, max: 25 }),
        fc.integer({ min: 50_000, max: 500_000 }),
        (base, maxAttempts, maxDelay) => {
          let prev = 0;
          for (let a = 0; a < maxAttempts; a++) {
            const d = nextBackoffMs(a, base, maxDelay, 0);
            if (d < prev) {
              return false;
            }
            prev = d;
          }
          return true;
        }
      ),
      { numRuns: 80 }
    );
  });

  it("executeWithRetry succeeds after transient failures", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 8 }),
        fc.integer({ min: 2, max: 12 }),
        async (failCount, maxAttempts) => {
          if (maxAttempts <= failCount) {
            return true;
          }
          let n = 0;
          const result = await executeWithRetry(
            () => {
              n++;
              if (n <= failCount) {
                return Promise.reject(new Error(`f${n}`));
              }
              return Promise.resolve(42);
            },
            {
              maxAttempts,
              baseDelayMs: 0,
              maxDelayMs: 0,
              jitterRatio: 0,
            }
          );
          return result === 42 && n === failCount + 1;
        }
      ),
      { numRuns: 60 }
    );
  });

  it("CircuitBreaker opens after N serialized failures", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 100, max: 5000 }),
        async (failureThreshold, openDurationMs) => {
          const cb = new CircuitBreaker({
            failureThreshold,
            openDurationMs,
          });
          for (let i = 0; i < failureThreshold; i++) {
            await expect(
              cb.execute(() => Promise.reject(new Error("x")))
            ).rejects.toThrow();
          }
          await expect(cb.execute(() => Promise.resolve(1))).rejects.toBeInstanceOf(
            CircuitOpenError
          );
          return true;
        }
      ),
      { numRuns: 25 }
    );
  });
});
