import assert from "node:assert/strict";
import test from "node:test";

import { rememberRealtimeExecution } from "../app/(frontend)/lib/realtime-execution-dedupe.ts";

test("rememberRealtimeExecution accepts an execution only once", () => {
  const seenExecutionIds = new Set();

  assert.equal(
    rememberRealtimeExecution(seenExecutionIds, "execution-1"),
    true,
  );
  assert.equal(
    rememberRealtimeExecution(seenExecutionIds, "execution-1"),
    false,
  );
  assert.deepEqual([...seenExecutionIds], ["execution-1"]);
});

test("rememberRealtimeExecution keeps only the latest 100 executions", () => {
  const seenExecutionIds = new Set();

  for (let index = 0; index <= 100; index += 1) {
    assert.equal(
      rememberRealtimeExecution(seenExecutionIds, `execution-${index}`),
      true,
    );
  }

  assert.equal(seenExecutionIds.size, 100);
  assert.equal(seenExecutionIds.has("execution-0"), false);
  assert.equal(seenExecutionIds.has("execution-100"), true);
  assert.equal(
    rememberRealtimeExecution(seenExecutionIds, "execution-0"),
    true,
  );
  assert.equal(seenExecutionIds.size, 100);
});
