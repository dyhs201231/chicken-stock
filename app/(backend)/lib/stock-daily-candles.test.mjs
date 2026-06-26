import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMissingDailyCandles,
  getCompletedMarketDateKeys,
  getMarketDateTimestamp,
} from "./stock-daily-candles.ts";

describe("getMarketDateTimestamp", () => {
  it("uses the stock market time zone for US candle dates", () => {
    assert.equal(
      getMarketDateTimestamp(new Date("2026-06-26T23:30:00.000Z"), "US"),
      BigInt(Date.UTC(2026, 5, 26)),
    );
  });
});

describe("getCompletedMarketDateKeys", () => {
  it("includes only completed weekdays for each market", () => {
    assert.deepEqual(
      getCompletedMarketDateKeys({
        countryCode: "KR",
        lookbackDays: 3,
        now: new Date("2026-06-26T06:31:00.000Z"),
      }),
      ["2026-06-24", "2026-06-25", "2026-06-26"],
    );

    assert.deepEqual(
      getCompletedMarketDateKeys({
        countryCode: "US",
        lookbackDays: 1,
        now: new Date("2026-06-26T19:00:00.000Z"),
      }),
      ["2026-06-25"],
    );
  });
});

describe("buildMissingDailyCandles", () => {
  it("fills missing listed-stock candles from the previous close with zero volume", () => {
    assert.deepEqual(
      buildMissingDailyCandles({
        completedDateKeys: ["2026-06-24", "2026-06-25"],
        existingCandles: [
          {
            closePrice: 101,
            highPrice: 102,
            intervalCode: "1D",
            lowPrice: 99,
            openPrice: 100,
            timestamp: BigInt(Date.UTC(2026, 5, 23)),
            volume: 10,
          },
          {
            closePrice: 105,
            highPrice: 108,
            intervalCode: "1D",
            lowPrice: 104,
            openPrice: 106,
            timestamp: BigInt(Date.UTC(2026, 5, 25)),
            volume: 20,
          },
        ],
        fallbackPrice: 99,
        ticker: "FKR001",
      }),
      [
        {
          closePrice: 101,
          highPrice: 101,
          intervalCode: "1D",
          lowPrice: 101,
          openPrice: 101,
          ticker: "FKR001",
          timestamp: BigInt(Date.UTC(2026, 5, 24)),
          volume: 0,
        },
      ],
    );
  });
});
