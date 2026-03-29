import { describe, expect, expectTypeOf, it } from "vitest";
import type { Result } from "@robotico-dev/result";
import type { RetryIsRetryable } from "./retry-is-retryable.js";
import type { RetryOptions } from "./retry-options.js";
import { executeWithRetry } from "./execute-with-retry.js";
import { executeWithRetryResult } from "./execute-with-retry-result.js";
import { withTimeoutResult } from "./with-timeout-result.js";
import { RESILIENCE_VERSION } from "./resilience-version.js";

describe("API types", () => {
  it("RetryOptions and RetryIsRetryable", () => {
    const isRetryable: RetryIsRetryable = () => true;
    const opts: RetryOptions = {
      maxAttempts: 2,
      baseDelayMs: 1,
      isRetryable,
    };
    expectTypeOf(opts.isRetryable).toEqualTypeOf<RetryIsRetryable | undefined>();
    expectTypeOf(executeWithRetry(() => Promise.resolve(1), opts)).resolves.toEqualTypeOf<number>();
    expectTypeOf(
      executeWithRetryResult(() => Promise.resolve(1), opts)
    ).resolves.toEqualTypeOf<Result<number>>();
    expectTypeOf(
      withTimeoutResult(Promise.resolve(1), 10)
    ).resolves.toEqualTypeOf<Result<number>>();
  });

  it("RESILIENCE_VERSION is non-empty semver", () => {
    expect(RESILIENCE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
