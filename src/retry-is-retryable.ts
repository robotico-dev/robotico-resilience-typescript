/**
 * Predicate for {@link RetryOptions.isRetryable}: whether to retry after failure.
 */
export type RetryIsRetryable = (
  error: unknown,
  attemptIndex: number
) => boolean;
