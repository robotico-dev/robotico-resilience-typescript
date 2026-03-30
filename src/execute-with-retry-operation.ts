import type { IError, Result } from "@robotico-dev/result";
import {
  createExceptionError,
  errorOf,
  isError,
  isErrorOf,
  isSuccessOf,
  tryVoidAsync,
} from "@robotico-dev/result";

import type { RetryResultOperationOptions } from "./retry-result-operation-options.js";
import { nextBackoffMs } from "./next-backoff-ms.js";
import { sleepMs } from "./sleep-ms.js";

const defaultNotRetryable = (_error: IError, _attempt: number): boolean => false;

/**
 * Retries `operation` while it returns `Err` and `isRetryableError` is true, with backoff
 * matching {@link executeWithRetryResult}. Successful `Ok` returns immediately.
 */
export async function executeWithRetryOperation<T>(
  operation: () => Promise<Result<T>>,
  options: RetryResultOperationOptions,
  signal?: AbortSignal
): Promise<Result<T>> {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs = 60_000,
    jitterRatio = 0.25,
    isRetryableError = defaultNotRetryable,
  } = options;

  if (maxAttempts < 1) {
    return errorOf(
      createExceptionError(new RangeError("maxAttempts must be >= 1"))
    );
  }

  let attempt = 0;
  for (;;) {
    const r = await operation();
    if (isSuccessOf(r)) {
      return r;
    }
    if (!isErrorOf(r)) {
      return r;
    }
    const isLast = attempt >= maxAttempts - 1;
    const retry = !isLast && isRetryableError(r.error, attempt);
    if (!retry) {
      return r;
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
