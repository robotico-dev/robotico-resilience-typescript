# Contributing

## One type per file

Each `src/**/*.ts` file (except `index.ts` and tests) declares at most one `type`, `interface`, `class`, or `enum`. Callback shapes such as retry predicates use dedicated types (e.g. `RetryIsRetryable`).

See `docs/adr/0001-one-type-per-file.md`.
