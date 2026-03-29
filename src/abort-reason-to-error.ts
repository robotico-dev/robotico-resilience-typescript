export function abortReasonToError(reason: unknown): Error {
  if (reason instanceof Error) {
    return reason;
  }
  if (reason === undefined) {
    const e = new Error("Aborted");
    e.name = "AbortError";
    return e;
  }
  if (typeof reason === "string") {
    return new Error(reason);
  }
  if (
    typeof reason === "number" ||
    typeof reason === "boolean" ||
    typeof reason === "bigint"
  ) {
    return new Error(String(reason));
  }
  return new Error("Aborted");
}
