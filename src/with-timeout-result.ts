import type { Result } from "@robotico-dev/result";
import { tryAsync } from "@robotico-dev/result";
import { withTimeout } from "./with-timeout.js";

/**
 * Like {@link withTimeout}, but returns `Result<T>` instead of rejecting on timeout.
 */
export function withTimeoutResult<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<Result<T>> {
  if (timeoutMs <= 0) {
    return tryAsync(() => promise);
  }
  return tryAsync(() => withTimeout(promise, timeoutMs));
}
