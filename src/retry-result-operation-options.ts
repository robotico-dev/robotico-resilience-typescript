import type { IError } from "@robotico-dev/result";

import type { RetryOptions } from "./retry-options.js";

/** Retry policy for operations that return `Result<T>` (retry on `Err` when predicate allows). */
export type RetryResultOperationOptions = RetryOptions & {
  readonly isRetryableError?: (error: IError, attempt: number) => boolean;
};
