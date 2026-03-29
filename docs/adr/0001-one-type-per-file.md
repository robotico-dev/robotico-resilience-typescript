# ADR 0001: One type per file

## Status

Accepted

## Decision

Split named types into single-purpose modules. `RetryOptions` references `RetryIsRetryable` instead of inline function types.

## Consequences

Clear public surface; easier to document and evolve predicates independently.
