import type { Result } from "@robotico-dev/result";
import {
  createExceptionError,
  errorOf,
  isError,
  successOf,
  tryVoidAsync,
} from "@robotico-dev/result";
import type { RetryOptions } from "./retry-options.js";
import { nextBackoffMs } from "./next-backoff-ms.js";
import { sleepMs } from "./sleep-ms.js";

const defaultRetryable = (): boolean => true;

/**
 * Like {@link executeWithRetry}, but returns `Result<T>` instead of throwing.
 * Aborts during backoff are surfaced as `Err` via `createExceptionError` from `@robotico-dev/result`.
 */
export async function executeWithRetryResult<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  signal?: AbortSignal
): Promise<Result<T>> {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs = 60_000,
    jitterRatio = 0.25,
    isRetryable = defaultRetryable,
  } = options;

  if (maxAttempts < 1) {
    return errorOf(
      createExceptionError(new RangeError("maxAttempts must be >= 1"))
    );
  }

  let attempt = 0;
  for (;;) {
    try {
      return successOf(await operation());
    } catch (e) {
      const isLast = attempt >= maxAttempts - 1;
      const retry = !isLast && isRetryable(e, attempt);
      if (!retry) {
        return errorOf(createExceptionError(e));
      }
      const delay = nextBackoffMs(
        attempt,
        baseDelayMs,
        maxDelayMs,
        jitterRatio
      );
      const slept = await tryVoidAsync(() => sleepMs(delay, signal));
      if (isError(slept)) {
        return errorOf(slept.error);
      }
      attempt++;
    }
  }
}
