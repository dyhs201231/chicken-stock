export type CandleInterval = "DAY" | "WEEK" | "MONTH";

export type StockCandleSource = {
  timestamp: bigint;
  openPrice: { toNumber: () => number };
  highPrice: { toNumber: () => number };
  lowPrice: { toNumber: () => number };
  closePrice: { toNumber: () => number };
  volume: { toNumber: () => number };
};

export type StockCandleResponse = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export function parseCandleInterval(value: string | null): CandleInterval {
  if (value === "WEEK" || value === "MONTH") {
    return value;
  }

  return "DAY";
}

function getDateKey(timestamp: bigint) {
  return new Date(Number(timestamp)).toISOString().slice(0, 10);
}

function sortCandles(candles: StockCandleResponse[]) {
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

export function toDailyCandles(
  candles: StockCandleSource[],
): StockCandleResponse[] {
  return candles
    .map((candle) => ({
      time: getDateKey(candle.timestamp),
      open: candle.openPrice.toNumber(),
      high: candle.highPrice.toNumber(),
      low: candle.lowPrice.toNumber(),
      close: candle.closePrice.toNumber(),
      volume: candle.volume.toNumber(),
    }))
    .filter((candle) =>
      [candle.open, candle.high, candle.low, candle.close, candle.volume].every(
        Number.isFinite,
      ),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

function groupCandles(
  candles: StockCandleResponse[],
  getGroupKey: (time: string) => string,
) {
  const groupedCandles = new Map<string, StockCandleResponse>();

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

export function groupByWeek(candles: StockCandleResponse[]) {
  return groupCandles(candles, getWeekStartDateKey);
}

export function groupByMonth(candles: StockCandleResponse[]) {
  return groupCandles(candles, getMonthStartDateKey);
}

export function getCandlesByInterval(
  candles: StockCandleResponse[],
  interval: CandleInterval,
) {
  if (interval === "WEEK") {
    return groupByWeek(candles);
  }

  if (interval === "MONTH") {
    return groupByMonth(candles);
  }

  return candles;
}
