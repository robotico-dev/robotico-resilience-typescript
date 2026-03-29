const CODE = "ROBOTICO_OPERATION_TIMEOUT" as const;

export class OperationTimeoutError extends Error {
  override readonly name = "OperationTimeoutError";

  readonly code = CODE;

  constructor(
    message = "Operation timed out",
    readonly timeoutMs: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
