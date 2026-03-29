/**
 * @robotico-dev/resilience — retry, circuit breaker, timeout.
 *
 * @packageDocumentation
 */

export type { RetryIsRetryable } from "./retry-is-retryable.js";
export type { RetryOptions } from "./retry-options.js";
export type { CircuitBreakerSettings } from "./circuit-breaker-settings.js";
export { CircuitOpenError } from "./circuit-open-error.js";
export { OperationTimeoutError } from "./operation-timeout-error.js";
export { CircuitBreaker } from "./circuit-breaker.js";
export { executeWithRetry } from "./execute-with-retry.js";
export { executeWithRetryResult } from "./execute-with-retry-result.js";
export { withTimeout } from "./with-timeout.js";
export { withTimeoutResult } from "./with-timeout-result.js";
export { sleepMs } from "./sleep-ms.js";
export { nextBackoffMs } from "./next-backoff-ms.js";
export { abortReasonToError } from "./abort-reason-to-error.js";
export { RESILIENCE_VERSION } from "./resilience-version.js";
