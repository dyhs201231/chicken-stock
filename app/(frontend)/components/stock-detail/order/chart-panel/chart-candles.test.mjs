import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getCandlesForRange } from "./chart-candles.ts";

const dailyCandles = [
  {
    time: "2026-06-01",
    open: 10,
    high: 12,
    low: 9,
    close: 11,
    volume: 100,
  },
  {
    time: "2026-06-02",
    open: 11,
    high: 15,
    low: 10,
    close: 14,
    volume: 120,
  },
  {
    time: "2026-06-08",
    open: 14,
    high: 16,
    low: 13,
    close: 15,
    volume: 90,
  },
  {
    time: "2026-07-01",
    open: 15,
    high: 18,
    low: 14,
    close: 17,
    volume: 200,
  },
];

describe("getCandlesForRange", () => {
  it("returns daily candles unchanged for the daily range", () => {
    assert.deepEqual(getCandlesForRange(dailyCandles, "daily"), dailyCandles);
  });

  it("groups daily candles into weekly candles immediately", () => {
    assert.deepEqual(getCandlesForRange(dailyCandles, "weekly"), [
      {
        time: "2026-06-01",
        open: 10,
        high: 15,
        low: 9,
        close: 14,
        volume: 220,
      },
      {
        time: "2026-06-08",
        open: 14,
        high: 16,
        low: 13,
        close: 15,
        volume: 90,
      },
      {
        time: "2026-06-29",
        open: 15,
        high: 18,
        low: 14,
        close: 17,
        volume: 200,
      },
    ]);
  });

  it("groups daily candles into monthly candles immediately", () => {
    assert.deepEqual(getCandlesForRange(dailyCandles, "monthly"), [
      {
        time: "2026-06-01",
        open: 10,
        high: 16,
        low: 9,
        close: 15,
        volume: 310,
      },
      {
        time: "2026-07-01",
        open: 15,
        high: 18,
        low: 14,
        close: 17,
        volume: 200,
      },
    ]);
  });
});
