import type { RetryOptions } from "./retry-options.js";
import { nextBackoffMs } from "./next-backoff-ms.js";
import { sleepMs } from "./sleep-ms.js";

const defaultRetryable = (): boolean => true;

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  signal?: AbortSignal
): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs = 60_000,
    jitterRatio = 0.25,
    isRetryable = defaultRetryable,
  } = options;

  if (maxAttempts < 1) {
    throw new RangeError("maxAttempts must be >= 1");
  }

  let attempt = 0;
  for (;;) {
    try {
      return await operation();
    } catch (e) {
      const isLast = attempt >= maxAttempts - 1;
      const retry = !isLast && isRetryable(e, attempt);
      if (!retry) {
        throw e;
      }
      const delay = nextBackoffMs(
        attempt,
        baseDelayMs,
        maxDelayMs,
        jitterRatio
      );
      await sleepMs(delay, signal);
      attempt++;
    }
  }
}
