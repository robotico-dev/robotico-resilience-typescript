export function nextBackoffMs(
  attemptIndex: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterRatio: number
): number {
  const exp = Math.min(
    maxDelayMs,
    baseDelayMs * Math.pow(2, Math.max(0, attemptIndex))
  );
  const jitter = exp * jitterRatio * Math.random();
  return Math.min(maxDelayMs, Math.floor(exp - jitter * 0.5 + jitter));
}
