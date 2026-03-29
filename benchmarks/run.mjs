import { Bench } from "tinybench";
import {
  CircuitBreaker,
  executeWithRetry,
} from "../dist/index.js";

const bench = new Bench({ time: 500 });

bench.add("executeWithRetry immediate success", async () => {
  await executeWithRetry(() => Promise.resolve(1), {
    maxAttempts: 3,
    baseDelayMs: 1,
  });
});

const cb = new CircuitBreaker({
  failureThreshold: 100,
  openDurationMs: 60_000,
});
bench.add("CircuitBreaker success path", async () => {
  await cb.execute(() => Promise.resolve(1));
});

await bench.run();
console.table(bench.table());
