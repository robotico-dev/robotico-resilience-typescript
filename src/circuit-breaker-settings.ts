/**
 * Settings for {@link CircuitBreaker}.
 */
export interface CircuitBreakerSettings {
  readonly failureThreshold: number;
  readonly openDurationMs: number;
  /** Successes in half-open required to close (default 1). */
  readonly successThreshold?: number;
}
