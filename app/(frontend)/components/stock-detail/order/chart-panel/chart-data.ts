import type {
  ChartCandleData,
  StockCandleRawData,
  StockCandleSourceData,
} from "./types";

function getDateKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function isRawCandle(
  candle: StockCandleRawData | StockCandleSourceData,
): candle is StockCandleRawData {
  return "open_price" in candle;
}

function sortCandles(candles: ChartCandleData[]) {
  return [...candles].sort((a, b) => a.time.localeCompare(b.time));
}

export function convertToDailyCandles(
  candles: Array<StockCandleRawData | StockCandleSourceData>,
): ChartCandleData[] {
  return candles
    .map((candle) =>
      isRawCandle(candle)
        ? {
            time: getDateKey(candle.timestamp),
            open: toNumber(candle.open_price),
            high: toNumber(candle.high_price),
            low: toNumber(candle.low_price),
            close: toNumber(candle.close_price),
          }
        : {
            time: getDateKey(candle.timestamp),
            open: toNumber(candle.openPrice),
            high: toNumber(candle.highPrice),
            low: toNumber(candle.lowPrice),
            close: toNumber(candle.closePrice),
          },
    )
    .filter((candle) =>
      [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function aggregateToWeeklyCandles(
  candles: ChartCandleData[],
): ChartCandleData[] {
  const weeklyCandles = new Map<string, ChartCandleData>();

  sortCandles(candles).forEach((candle) => {
    const date = new Date(`${candle.time}T00:00:00.000Z`);
    const day = date.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    date.setUTCDate(date.getUTCDate() + mondayOffset);

    const weekKey = date.toISOString().slice(0, 10);
    const existingCandle = weeklyCandles.get(weekKey);

    if (!existingCandle) {
      weeklyCandles.set(weekKey, { ...candle, time: weekKey });
      return;
    }

    weeklyCandles.set(weekKey, {
      ...existingCandle,
      high: Math.max(existingCandle.high, candle.high),
      low: Math.min(existingCandle.low, candle.low),
      close: candle.close,
    });
  });

  return sortCandles([...weeklyCandles.values()]);
}

export function aggregateToMonthlyCandles(
  candles: ChartCandleData[],
): ChartCandleData[] {
  const monthlyCandles = new Map<string, ChartCandleData>();

  sortCandles(candles).forEach((candle) => {
    const monthKey = `${candle.time.slice(0, 7)}-01`;
    const existingCandle = monthlyCandles.get(monthKey);

    if (!existingCandle) {
      monthlyCandles.set(monthKey, { ...candle, time: monthKey });
      return;
    }

    monthlyCandles.set(monthKey, {
      ...existingCandle,
      high: Math.max(existingCandle.high, candle.high),
      low: Math.min(existingCandle.low, candle.low),
      close: candle.close,
    });
  });

  return sortCandles([...monthlyCandles.values()]);
}
