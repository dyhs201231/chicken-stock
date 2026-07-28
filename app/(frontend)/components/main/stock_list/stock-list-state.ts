import type { StockRankingPeriod } from "./types";

type StockRankingBasis = {
  asOf: string;
  period: StockRankingPeriod;
  periodEnd: string | null;
  periodStart: string | null;
};

type StockRankingBasisLabel = Omit<StockRankingBasis, "asOf"> & {
  asOf?: string;
  isPlaceholderData: boolean;
};

type StockRankingVisibleLimitTransition = {
  currentLimit: number;
  currentRequestVersion: number;
  observedLimit: number;
  observedRequestVersion: number;
  pageSize: number;
};

export const STOCK_RANKING_MAX_VISIBLE_LIMIT = 50;

export function getStockRankingRefetchInterval(
  period: StockRankingPeriod,
  marketOpen: boolean,
): 10_000 | 60_000 | false {
  if (period !== "live") {
    return false;
  }

  return marketOpen ? 10_000 : 60_000;
}

export function getNextStockRankingVisibleLimit({
  currentLimit,
  currentRequestVersion,
  observedLimit,
  observedRequestVersion,
  pageSize,
}: StockRankingVisibleLimitTransition) {
  if (
    currentLimit !== observedLimit ||
    currentRequestVersion !== observedRequestVersion ||
    currentLimit >= STOCK_RANKING_MAX_VISIBLE_LIMIT
  ) {
    return currentLimit;
  }

  return Math.min(currentLimit + pageSize, STOCK_RANKING_MAX_VISIBLE_LIMIT);
}

function formatDate(date: string, includeYear = false) {
  const [year, month, day] = date.split("-");
  const formattedDate = `${Number(month)}월 ${Number(day)}일`;

  return includeYear ? `${Number(year)}년 ${formattedDate}` : formattedDate;
}

export function formatStockRankingBasis({
  asOf,
  period,
  periodEnd,
  periodStart,
}: StockRankingBasis) {
  if (period === "live") {
    return `${new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Seoul",
    }).format(new Date(asOf))} 기준`;
  }

  if (!periodStart || !periodEnd) {
    return "종가 기준";
  }

  if (period === "1d" && periodStart === periodEnd) {
    return `${formatDate(periodStart)} 종가 기준`;
  }

  const crossesYear = periodStart.slice(0, 4) !== periodEnd.slice(0, 4);

  return `${formatDate(periodStart, crossesYear)}~${formatDate(
    periodEnd,
    crossesYear,
  )} 종가 기준`;
}

export function getStockRankingBasisLabel({
  asOf,
  isPlaceholderData,
  period,
  periodEnd,
  periodStart,
}: StockRankingBasisLabel) {
  if (!asOf || isPlaceholderData) {
    return "기준 시각 확인 중";
  }

  return formatStockRankingBasis({
    asOf,
    period,
    periodEnd,
    periodStart,
  });
}
