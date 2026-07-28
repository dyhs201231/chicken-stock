import { getCompletedMarketDateKeys } from "./stock-daily-candles.ts";

export type StockMarketFilter = "all" | "domestic" | "global";

export type StockRankingKey = "tradingAmount" | "tradingVolume";

export type StockRankingPeriod =
  | "live"
  | "1d"
  | "1w"
  | "1m"
  | "3m"
  | "6m"
  | "1y";

type StockRankingMarketCountryCode = "KR" | "US";

type StockRankingWindowInput = {
  activeDateKey?: string;
  closedDateKeys?: Iterable<string>;
  closeTimeByDateKey?: ReadonlyMap<string, string | null>;
  countryCode: StockRankingMarketCountryCode;
  now?: Date;
  period: StockRankingPeriod;
};

type StockRankingWindow = {
  startDateKey: string;
  endDateKey: string;
};

export const STOCK_RANKING_PAGE_SIZE = 10;
export const STOCK_RANKING_MAX_LIMIT = 50;

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getInclusiveCalendarStartDateKey(dateKey: string, months: number) {
  const endDate = new Date(`${dateKey}T00:00:00.000Z`);
  const endYear = endDate.getUTCFullYear();
  const endMonth = endDate.getUTCMonth() + 1;
  const targetMonthIndex = endYear * 12 + endMonth - 1 - months;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = (targetMonthIndex % 12) + 1;
  const targetDay = Math.min(
    endDate.getUTCDate(),
    getDaysInMonth(targetYear, targetMonth),
  );
  const startDate = new Date(
    Date.UTC(targetYear, targetMonth - 1, targetDay + 1),
  );

  return startDate.toISOString().slice(0, 10);
}

export function parseStockMarketFilter(
  value: string | null,
): StockMarketFilter {
  return value === "domestic" || value === "global" ? value : "all";
}

export function getStockRankingCountryCodes(
  market: StockMarketFilter,
): StockRankingMarketCountryCode[] {
  if (market === "domestic") {
    return ["KR"];
  }

  if (market === "global") {
    return ["US"];
  }

  return ["KR", "US"];
}

export function mergeStockRankingWindows(
  windows: Array<StockRankingWindow | null>,
): {
  periodStart: string | null;
  periodEnd: string | null;
} {
  const nonNullWindows = windows.filter(
    (window): window is StockRankingWindow => window !== null,
  );

  if (nonNullWindows.length === 0) {
    return {
      periodStart: null,
      periodEnd: null,
    };
  }

  return {
    periodStart: nonNullWindows.reduce(
      (earliest, window) =>
        window.startDateKey < earliest ? window.startDateKey : earliest,
      nonNullWindows[0].startDateKey,
    ),
    periodEnd: nonNullWindows.reduce(
      (latest, window) =>
        window.endDateKey > latest ? window.endDateKey : latest,
      nonNullWindows[0].endDateKey,
    ),
  };
}

export function parseStockRanking(value: string | null): StockRankingKey {
  return value === "tradingVolume" ? value : "tradingAmount";
}

export function parseStockRankingPeriod(
  value: string | null,
): StockRankingPeriod {
  return value === "1d" ||
    value === "1w" ||
    value === "1m" ||
    value === "3m" ||
    value === "6m" ||
    value === "1y"
    ? value
    : "live";
}

export function parseStockRankingLimit(
  value: string | null,
): 10 | 20 | 30 | 40 | 50 {
  const parsed = Number(value);

  return parsed === 20 || parsed === 30 || parsed === 40 || parsed === 50
    ? parsed
    : STOCK_RANKING_PAGE_SIZE;
}

export function getCanonicalStockRankingQuery(searchParams: URLSearchParams) {
  return new URLSearchParams([
    ["market", parseStockMarketFilter(searchParams.get("market"))],
    ["ranking", parseStockRanking(searchParams.get("ranking"))],
    ["period", parseStockRankingPeriod(searchParams.get("period"))],
    ["limit", String(parseStockRankingLimit(searchParams.get("limit")))],
  ]).toString();
}

export function getStockRankingWindow({
  activeDateKey,
  closedDateKeys,
  closeTimeByDateKey,
  countryCode,
  now,
  period,
}: StockRankingWindowInput): {
  startDateKey: string;
  endDateKey: string;
} | null {
  if (period === "live") {
    return null;
  }

  const [completedDateKey] = getCompletedMarketDateKeys({
    closedDateKeys,
    closeTimeByDateKey,
    countryCode,
    lookbackDays: 1,
    now,
  });
  const endDateKey = activeDateKey ?? completedDateKey;

  if (!endDateKey) {
    return null;
  }

  const startDateKey =
    period === "1d"
      ? endDateKey
      : period === "1w"
        ? addDays(endDateKey, -6)
        : getInclusiveCalendarStartDateKey(
            endDateKey,
            period === "1m"
              ? 1
              : period === "3m"
                ? 3
                : period === "6m"
                  ? 6
                  : 12,
          );

  return { endDateKey, startDateKey };
}

export function getStockRankingCacheControl() {
  return "public, max-age=0, s-maxage=5";
}
