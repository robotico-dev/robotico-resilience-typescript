# @robotico-dev/resilience

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/) [![ESM](https://img.shields.io/badge/module-ESM-FFCA28)](https://nodejs.org/api/esm.html) [![Vitest](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/) [![ESLint](https://img.shields.io/badge/lint-ESLint-4B32C3?logo=eslint&logoColor=white)](https://eslint.org/)

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
