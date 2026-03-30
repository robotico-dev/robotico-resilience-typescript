# Resilience invariants

1. **Retry** — `executeWithRetry` / `executeWithRetryResult` / `executeWithRetryOperation` stop when the operation succeeds, when `isRetryable` returns false, or when attempts are exhausted; abort signals are honored.
2. **Backoff** — `nextBackoffMs` is monotonic within configured bounds; jitter (if any) stays within the documented range.
3. **Circuit breaker** — Opens after failure threshold, half-open probe uses success/failure to close or re-open; `CircuitOpenError` is the stable failure type when open.
4. **Timeout** — `withTimeout` / `withTimeoutResult` fail with `OperationTimeoutError` when the deadline elapses; successful operations complete without extra delay.
