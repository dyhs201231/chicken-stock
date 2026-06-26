import type { CandleRange, ChartCandleData } from "./types";

function sortCandles(candles: ChartCandleData[]) {
  return [...candles].sort((a, b) => a.time.localeCompare(b.time));
}

function getWeekStartDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  date.setUTCDate(date.getUTCDate() + mondayOffset);

  return date.toISOString().slice(0, 10);
}

function getMonthStartDateKey(dateKey: string) {
  return `${dateKey.slice(0, 7)}-01`;
}

function groupCandles(
  candles: ChartCandleData[],
  getGroupKey: (time: string) => string,
) {
  const groupedCandles = new Map<string, ChartCandleData>();

  sortCandles(candles).forEach((candle) => {
    const time = getGroupKey(candle.time);
    const existingCandle = groupedCandles.get(time);

    if (!existingCandle) {
      groupedCandles.set(time, { ...candle, time });
      return;
    }

    groupedCandles.set(time, {
      ...existingCandle,
      high: Math.max(existingCandle.high, candle.high),
      low: Math.min(existingCandle.low, candle.low),
      close: candle.close,
      volume: existingCandle.volume + candle.volume,
    });
  });

  return sortCandles([...groupedCandles.values()]);
}

export function getCandlesForRange(
  dailyCandles: ChartCandleData[],
  range: CandleRange,
) {
  if (range === "weekly") {
    return groupCandles(dailyCandles, getWeekStartDateKey);
  }

  if (range === "monthly") {
    return groupCandles(dailyCandles, getMonthStartDateKey);
  }

  return dailyCandles;
}
