import type { Result } from "@robotico-dev/result";
import { tryAsync } from "@robotico-dev/result";
import type { BreakerState } from "./breaker-state.js";
import { CircuitOpenError } from "./circuit-open-error.js";
import type { CircuitBreakerSettings } from "./circuit-breaker-settings.js";

/**
 * Circuit breaker with **serialized** {@link execute} calls so concurrent operations
 * cannot corrupt failure counts or half-open probing.
 */
export class CircuitBreaker {
  private failures = 0;
  private consecutiveSuccesses = 0;
  private openedAt = 0;
  private state: BreakerState = "closed";
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly settings: CircuitBreakerSettings) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const run: Promise<T> = this.tail.then(() =>
      this.executeSerialized(operation)
    );
    this.tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  /**
   * Like {@link execute}, but returns `Result<T>` (open circuit or operation failure as `Err`).
   */
  executeResult<T>(operation: () => Promise<T>): Promise<Result<T>> {
    return tryAsync(() => this.execute(operation));
  }

  private async executeSerialized<T>(operation: () => Promise<T>): Promise<T> {
    this.tryTransitionFromOpen();
    if (this.state === "open") {
      throw new CircuitOpenError();
    }
    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (e) {
      this.recordFailure();
      throw e;
    }
  }

  private tryTransitionFromOpen(): void {
    if (this.state !== "open") {
      return;
    }
    if (Date.now() >= this.openedAt + this.settings.openDurationMs) {
      this.state = "half-open";
      this.consecutiveSuccesses = 0;
    }
  }

  private recordSuccess(): void {
    const threshold = this.settings.successThreshold ?? 1;
    if (this.state === "half-open") {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= threshold) {
        this.state = "closed";
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private recordFailure(): void {
    if (this.state === "half-open") {
      this.state = "open";
      this.openedAt = Date.now();
      return;
    }
    this.failures++;
    if (this.failures >= this.settings.failureThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }
}
