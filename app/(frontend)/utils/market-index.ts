import type {
  MarketIndexCategory,
  MarketIndexSummaryData,
  MarketIndexTrend,
} from "../types/market-index";
import { USD_KRW_EXCHANGE_RATE } from "./currency";

export function formatMarketIndexValue(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMarketIndexChange(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";

  return `${sign}${formatMarketIndexValue(Math.abs(value))}`;
}

export function formatMarketIndexPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

export function formatMarketIndexVolume(value: number) {
  if (value <= 0) {
    return "-";
  }

  if (Math.abs(value) >= 100_000_000) {
    return `${new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: 1,
    }).format(value / 100_000_000)}억`;
  }

  if (Math.abs(value) >= 10_000) {
    return `${new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: 1,
    }).format(value / 10_000)}만`;
  }

  return new Intl.NumberFormat("ko-KR").format(value);
}

export function getMarketIndexTrendTextColor(trend: MarketIndexTrend) {
  if (trend === "up") {
    return "text-[#FF0505]";
  }

  if (trend === "down") {
    return "text-[#0084FF]";
  }

  return "text-zinc-500";
}

export function getMarketIndexTrendStrokeColor(trend: MarketIndexTrend) {
  if (trend === "up") {
    return "#ef4444";
  }

  if (trend === "down") {
    return "#60a5fa";
  }

  return "#71717a";
}

export function getMarketIndexCategoryLabel(category: MarketIndexCategory) {
  return category === "exchangeRate" ? "환율" : "주가지수";
}

export function getMarketIndexCountryLabel(countryCode: string) {
  if (countryCode === "KR") {
    return "한국";
  }

  if (countryCode === "US") {
    return "미국";
  }

  return countryCode;
}

export function getUsdKrwExchangeRateFromIndices(
  marketIndexes: MarketIndexSummaryData[] | undefined,
) {
  return (
    marketIndexes?.find((marketIndex) => marketIndex.id === "usd-krw")
      ?.currentValue ?? USD_KRW_EXCHANGE_RATE
  );
}
