import { describe, expect, it, vi } from "vitest";
import { isError, isSuccess } from "@robotico-dev/result";
import { abortReasonToError } from "./abort-reason-to-error.js";
import {
  CircuitBreaker,
  CircuitOpenError,
  executeWithRetry,
  executeWithRetryResult,
  sleepMs,
  withTimeout,
  withTimeoutResult,
} from "./index.js";

describe("executeWithRetry", () => {
  it("returns on first success", async () => {
    const fn = vi.fn().mockResolvedValueOnce(42);
    const r = await executeWithRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 1,
    });
    expect(r).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("a"))
      .mockResolvedValueOnce(7);
    const r = await executeWithRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 1,
      maxDelayMs: 10,
    });
    expect(r).toBe(7);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("rejects maxAttempts below 1", async () => {
    await expect(
      executeWithRetry(() => Promise.resolve(1), {
        maxAttempts: 0,
        baseDelayMs: 1,
      })
    ).rejects.toThrow(RangeError);
  });

  it("stops when not retryable", async () => {
    const err = new Error("fatal");
    const fn = vi.fn().mockRejectedValue(err);
    await expect(
      executeWithRetry(fn, {
        maxAttempts: 5,
        baseDelayMs: 1,
        isRetryable: () => false,
      })
    ).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("aborts during backoff sleep", async () => {
    const ac = new AbortController();
    const fn = vi.fn().mockRejectedValue(new Error("transient"));
    const p = executeWithRetry(
      fn,
      { maxAttempts: 5, baseDelayMs: 60_000 },
      ac.signal
    );
    queueMicrotask(() => {
      ac.abort();
    });
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("waits baseDelayMs between retries with fake timers", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("a"))
      .mockResolvedValueOnce(42);
    const p = executeWithRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 800,
      maxDelayMs: 800,
      jitterRatio: 0,
    });
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(799);
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(p).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe("CircuitBreaker", () => {
  it("serializes concurrent failures so threshold is exact", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      openDurationMs: 1000,
    });
    await Promise.all([
      cb.execute(() => Promise.reject(new Error("a"))),
      cb.execute(() => Promise.reject(new Error("b"))),
      cb.execute(() => Promise.reject(new Error("c"))),
    ]).catch(() => undefined);
    await expect(cb.execute(() => Promise.resolve(1))).rejects.toBeInstanceOf(
      CircuitOpenError
    );
  });

  it("closed success resets failure count before threshold", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 5,
      openDurationMs: 1000,
    });
    await expect(
      cb.execute(() => Promise.reject(new Error("a")))
    ).rejects.toThrow();
    await expect(
      cb.execute(() => Promise.reject(new Error("b")))
    ).rejects.toThrow();
    await expect(cb.execute(() => Promise.resolve(1))).resolves.toBe(1);
    for (let i = 0; i < 5; i++) {
      await expect(
        cb.execute(() => Promise.reject(new Error(`f${i}`)))
      ).rejects.toThrow();
    }
    await expect(cb.execute(() => Promise.resolve(2))).rejects.toBeInstanceOf(
      CircuitOpenError
    );
  });

  it("opens after failures", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      openDurationMs: 1000,
    });
    await expect(
      cb.execute(() => Promise.reject(new Error("x")))
    ).rejects.toThrow("x");
    await expect(
      cb.execute(() => Promise.reject(new Error("x")))
    ).rejects.toThrow("x");
    await expect(cb.execute(() => Promise.resolve(1))).rejects.toBeInstanceOf(
      CircuitOpenError
    );
  });

  it("recovers after success in half-open", async () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 10_000,
      successThreshold: 1,
    });
    await expect(
      cb.execute(() => Promise.reject(new Error("x")))
    ).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(10_000);
    const v = await cb.execute(() => Promise.resolve(99));
    expect(v).toBe(99);
    vi.useRealTimers();
  });

  it("half-open requires successThreshold successes to close", async () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 100,
      successThreshold: 2,
    });
    await expect(
      cb.execute(() => Promise.reject(new Error("x")))
    ).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(100);
    await expect(cb.execute(() => Promise.resolve(1))).resolves.toBe(1);
    await expect(
      cb.execute(() => Promise.reject(new Error("y")))
    ).rejects.toThrow();
    vi.useRealTimers();
  });

  it("CircuitOpenError exposes stable code", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 1000,
    });
    await expect(
      cb.execute(() => Promise.reject(new Error("x")))
    ).rejects.toThrow();
    await expect(cb.execute(() => Promise.resolve(1))).rejects.toMatchObject({
      code: "ROBOTICO_CIRCUIT_OPEN",
    });
  });

  it("half-open success with successThreshold 1 must close so a later reject does not open immediately", async () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      openDurationMs: 50,
      successThreshold: 1,
    });
    for (let i = 0; i < 3; i++) {
      await expect(
        cb.execute(() => Promise.reject(new Error("e")))
      ).rejects.toThrow();
    }
    await expect(cb.execute(() => Promise.resolve(0))).rejects.toBeInstanceOf(
      CircuitOpenError
    );
    await vi.advanceTimersByTimeAsync(50);
    await cb.execute(() => Promise.resolve(1));
    try {
      await cb.execute(() => Promise.reject(new Error("a")));
    } catch {
      /* single failure while closed */
    }
    await expect(cb.execute(() => Promise.resolve(2))).resolves.toBe(2);
    vi.useRealTimers();
  });
});

describe("abortReasonToError", () => {
  it("returns Error as-is", () => {
    const e = new Error("x");
    expect(abortReasonToError(e)).toBe(e);
  });

  it("maps undefined to AbortError", () => {
    const e = abortReasonToError(undefined);
    expect(e.name).toBe("AbortError");
  });

  it("maps string reason", () => {
    expect(abortReasonToError("stop").message).toBe("stop");
  });

  it("maps number reason", () => {
    expect(abortReasonToError(42).message).toBe("42");
  });

  it("maps boolean and bigint reason", () => {
    expect(abortReasonToError(true).message).toBe("true");
    expect(abortReasonToError(1n).message).toBe("1");
  });

  it("maps object reason to generic Aborted", () => {
    expect(abortReasonToError({ x: 1 }).message).toBe("Aborted");
  });
});

describe("sleepMs", () => {
  it("rejects when already aborted", async () => {
    const c = new AbortController();
    c.abort();
    await expect(sleepMs(100, c.signal)).rejects.toThrow();
  });
});

describe("executeWithRetryResult", () => {
  it("returns Ok on success", async () => {
    const r = await executeWithRetryResult(() => Promise.resolve(3), {
      maxAttempts: 2,
      baseDelayMs: 1,
    });
    expect(isSuccess(r)).toBe(true);
    if (isSuccess(r)) expect(r.value).toBe(3);
  });

  it("returns Err when maxAttempts < 1", async () => {
    const r = await executeWithRetryResult(() => Promise.resolve(1), {
      maxAttempts: 0,
      baseDelayMs: 1,
    });
    expect(isError(r)).toBe(true);
  });

  it("returns Err when not retryable", async () => {
    const err = new Error("x");
    const r = await executeWithRetryResult(() => Promise.reject(err), {
      maxAttempts: 3,
      baseDelayMs: 1,
      isRetryable: () => false,
    });
    expect(isError(r)).toBe(true);
  });

  it("retries then returns Ok", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("a"))
      .mockResolvedValueOnce(42);
    const r = await executeWithRetryResult(fn, {
      maxAttempts: 3,
      baseDelayMs: 0,
      maxDelayMs: 0,
      jitterRatio: 0,
    });
    expect(isSuccess(r)).toBe(true);
    if (isSuccess(r)) expect(r.value).toBe(42);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("returns Err when backoff sleep aborts", async () => {
    const ac = new AbortController();
    const fn = vi.fn().mockRejectedValue(new Error("transient"));
    const p = executeWithRetryResult(
      fn,
      { maxAttempts: 5, baseDelayMs: 60_000 },
      ac.signal
    );
    queueMicrotask(() => {
      ac.abort();
    });
    const r = await p;
    expect(isError(r)).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("withTimeoutResult", () => {
  it("returns Ok when fast", async () => {
    const r = await withTimeoutResult(Promise.resolve(9), 100);
    expect(isSuccess(r)).toBe(true);
    if (isSuccess(r)) expect(r.value).toBe(9);
  });

  it("uses direct promise when timeoutMs is zero", async () => {
    const r = await withTimeoutResult(Promise.resolve(5), 0);
    expect(isSuccess(r)).toBe(true);
    if (isSuccess(r)) expect(r.value).toBe(5);
  });

  it("returns Err on timeout", async () => {
    vi.useFakeTimers();
    const p = withTimeoutResult(
      new Promise<number>((resolve) => {
        globalThis.setTimeout(() => {
          resolve(1);
        }, 500);
      }),
      20
    );
    await vi.advanceTimersByTimeAsync(25);
    const r = await p;
    expect(isError(r)).toBe(true);
    vi.useRealTimers();
  });
});

describe("CircuitBreaker.executeResult", () => {
  it("returns Err when open", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 60_000,
    });
    await cb.execute(() => Promise.reject(new Error("a"))).catch(() => undefined);
    const r = await cb.executeResult(() => Promise.resolve(1));
    expect(isError(r)).toBe(true);
  });
});

describe("withTimeout", () => {
  it("resolves when fast", async () => {
    await expect(
      withTimeout(Promise.resolve(1), 1000)
    ).resolves.toBe(1);
  });

  it("skips timer when timeoutMs is zero", async () => {
    await expect(withTimeout(Promise.resolve(2), 0)).resolves.toBe(2);
  });

  it("rejects on slow", async () => {
    vi.useFakeTimers();
    const p = withTimeout(
      new Promise<number>((resolve) => {
        globalThis.setTimeout(() => {
          resolve(1);
        }, 500);
      }),
      20
    );
    const assertP = expect(p).rejects.toSatisfy((e: unknown) => {
      expect(e).toMatchObject({
        code: "ROBOTICO_OPERATION_TIMEOUT",
        timeoutMs: 20,
      });
      expect((e as Error).cause).toBe("timeout");
      return true;
    });
    await vi.advanceTimersByTimeAsync(25);
    await assertP;
    vi.useRealTimers();
  });
});
