# Changelog

## [Unreleased]

## [1.0.3] - 2026-03-30

### Added

- `executeWithRetryOperation` — retry wrapper for async operations returning `Result` (`RetryResultOperationOptions`).

## [1.0.1] - 2026-03-29

### Added

- `executeWithRetryResult`, `withTimeoutResult`, `CircuitBreaker.executeResult` (compose with `@robotico-dev/result`).
- Peer dependency `@robotico-dev/result` ^1.0.1.

## [1.0.0]

- `executeWithRetry`, `CircuitBreaker`, `withTimeout`, `sleepMs`, typed errors.
- `RetryIsRetryable` type export; ADR + CONTRIBUTING; API contract tests; fake-timer retry backoff test.
- **Breaking behavior:** `CircuitBreaker.execute` serializes concurrent calls (correct failure/half-open counts).
- `withTimeout` documents non-cancellation; `AbortError` for undefined abort reason; retry abort test; CI matrix; coverage gate; Dependabot; SECURITY/CONTRIBUTING.
- Tests, CI, coverage. One-type-per-file in `src/`.

## [0.1.0]

- Scaffold.
