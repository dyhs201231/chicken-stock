import assert from "node:assert/strict";
import test from "node:test";

import { sendRealtimeBroadcastWithRetry } from "../app/(backend)/lib/realtime-broadcast-retry.ts";

test("sendRealtimeBroadcastWithRetry returns ok without retrying", async () => {
  let sendCount = 0;

  const result = await sendRealtimeBroadcastWithRetry(
    async () => {
      sendCount += 1;
      return "ok";
    },
    {
      sleep: async () => {
        throw new Error("successful sends must not wait");
      },
    },
  );

  assert.deepEqual(result, { attempts: 1, result: "ok" });
  assert.equal(sendCount, 1);
});

test("sendRealtimeBroadcastWithRetry retries error once after 250ms", async () => {
  const responses = ["error", "ok"];
  const delays = [];

  const result = await sendRealtimeBroadcastWithRetry(
    async () => responses.shift(),
    {
      sleep: async (delayMs) => {
        delays.push(delayMs);
      },
    },
  );

  assert.deepEqual(result, { attempts: 2, result: "ok" });
  assert.deepEqual(delays, [250]);
  assert.deepEqual(responses, []);
});

test("sendRealtimeBroadcastWithRetry stops after timed out then error", async () => {
  const responses = ["timed out", "error", "ok"];
  const delays = [];

  const result = await sendRealtimeBroadcastWithRetry(
    async () => responses.shift(),
    {
      sleep: async (delayMs) => {
        delays.push(delayMs);
      },
    },
  );

  assert.deepEqual(result, { attempts: 2, result: "error" });
  assert.deepEqual(delays, [250]);
  assert.deepEqual(responses, ["ok"]);
});

test("sendRealtimeBroadcastWithRetry normalizes a final timeout", async () => {
  const result = await sendRealtimeBroadcastWithRetry(
    async () => "timed out",
    { sleep: async () => {} },
  );

  assert.deepEqual(result, { attempts: 2, result: "timed_out" });
});

test("sendRealtimeBroadcastWithRetry normalizes unknown non-ok responses", async () => {
  let sendCount = 0;

  const result = await sendRealtimeBroadcastWithRetry(
    async () => {
      sendCount += 1;
      return "future-response";
    },
    { sleep: async () => {} },
  );

  assert.deepEqual(result, { attempts: 2, result: "unknown" });
  assert.equal(sendCount, 2);
});
