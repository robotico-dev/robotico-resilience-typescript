import { OperationTimeoutError } from "./operation-timeout-error.js";

/**
 * Races `promise` against a timer. On timeout, rejects with {@link OperationTimeoutError}.
 *
 * **Note:** The underlying `promise` is not cancelled; it continues in the background.
 * Pass an abortable operation if you need cancellation.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  if (timeoutMs <= 0) {
    return promise;
  }
  const controller = new globalThis.AbortController();
  const t = globalThis.setTimeout(() => {
    controller.abort("timeout");
  }, timeoutMs);
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener(
          "abort",
          () => {
            reject(
              new OperationTimeoutError(`Exceeded ${timeoutMs}ms`, timeoutMs, {
                cause: controller.signal.reason,
              })
            );
          },
          { once: true }
        );
      }),
    ]);
  } finally {
    globalThis.clearTimeout(t);
  }
}
