import type { RetryIsRetryable } from "./retry-is-retryable.js";

/**
 * Retry policy for {@link executeWithRetry}.
 */
export interface RetryOptions {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs?: number;
  /** 0–1 portion of delay to randomize (default 0.25). */
  readonly jitterRatio?: number;
  readonly isRetryable?: RetryIsRetryable;
}
