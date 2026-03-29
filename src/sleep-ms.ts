import { abortReasonToError } from "./abort-reason-to-error.js";

export function sleepMs(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReasonToError(signal.reason));
      return;
    }
    const t = globalThis.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        globalThis.clearTimeout(t);
        reject(abortReasonToError(signal.reason));
      },
      { once: true }
    );
  });
}
