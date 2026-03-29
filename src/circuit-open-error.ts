const CODE = "ROBOTICO_CIRCUIT_OPEN" as const;

export class CircuitOpenError extends Error {
  override readonly name = "CircuitOpenError";

  readonly code = CODE;

  constructor(message = "Circuit breaker is open", options?: ErrorOptions) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
