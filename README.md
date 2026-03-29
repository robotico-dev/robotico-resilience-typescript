# @robotico-dev/resilience

Retry with exponential backoff + jitter, circuit breaker, and `withTimeout`. Aligned with Robotico.Resilience (C#).

## Install

```bash
npm install @robotico-dev/resilience
```

## Usage

```ts
import {
  executeWithRetry,
  CircuitBreaker,
  withTimeout,
} from "@robotico-dev/resilience";

await executeWithRetry(() => fetch("/api"), {
  maxAttempts: 5,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  isRetryable: (e) => e instanceof TypeError,
});

const breaker = new CircuitBreaker({
  failureThreshold: 3,
  openDurationMs: 30_000,
});
await breaker.execute(() => callDownstream());

await withTimeout(slowCall(), 5000);
```

`CircuitBreaker.execute` queues concurrent calls so failure thresholds stay correct. `withTimeout` does not cancel the underlying promise—use abortable work if needed. On timeout, `OperationTimeoutError.cause` is the string `"timeout"` (from the internal `AbortController`).

`CircuitOpenError` and `OperationTimeoutError` expose stable `code` fields (`ROBOTICO_CIRCUIT_OPEN`, `ROBOTICO_OPERATION_TIMEOUT`). Timeouts set `cause` from the abort signal when available.

Publishing matches other `@robotico-dev/*` packages (GitHub Packages `publishConfig`).

## License

MIT
