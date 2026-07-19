import { unstable_cache } from "next/cache";
import {
  collectTwelveDataMarketIndexCandles,
  collectYahooMarketIndexCandles,
  getMarketIndexConfig,
  MARKET_INDEX_CONFIGS,
} from "./market-data-collector";
import {
  createMarketIndexService,
  enforceMarketIndexFallbackTtl,
} from "./market-index-resilience";
import { getMarketApiConfig } from "./market-api/config";
import { MarketApiError } from "./market-api/errors";
import { createMarketFallbackRepository } from "./market-api/fallback-repository";
import { prisma } from "./prisma";
import {
  getCandlesByInterval,
  parseCandleInterval,
  type CandleInterval,
  type StockCandleResponse,
} from "./stock-candles";
import type {
  MarketDataResult,
  MarketIndexCandleData,
  MarketIndexDetailData,
  MarketIndexSummaryData,
  MarketIndexViewData,
} from "../../(frontend)/types/market-index";

const MARKET_INDEX_REVALIDATE_SECONDS = 60 * 60;
const USD_KRW_EXCHANGE_RATE_REVALIDATE_SECONDS = 60 * 10;

const repository = createMarketFallbackRepository(prisma);

function createService(configs = MARKET_INDEX_CONFIGS) {
  const config = getMarketApiConfig();

  return createMarketIndexService({
    collectTwelveData: collectTwelveDataMarketIndexCandles,
    collectYahoo: collectYahooMarketIndexCandles,
    configs,
    exchangeFallbackTtlMs: config.exchangeFallbackTtlMs,
    fallbackTtlMs: config.fallbackTtlMs,
    repository,
  });
}

function getDetailValues(candles: MarketIndexCandleData[], currentValue: number) {
  const latest = candles.at(-1);
  const high52w = Math.max(...candles.map(({ high }) => high));
  const low52w = Math.min(...candles.map(({ low }) => low));

  return {
    dayHigh: latest?.high ?? currentValue,
    dayLow: latest?.low ?? currentValue,
    high52w: Number.isFinite(high52w) ? high52w : currentValue,
    low52w: Number.isFinite(low52w) ? low52w : currentValue,
    openValue: latest?.open ?? currentValue,
  };
}

function toLegacyDetail(view: MarketIndexViewData): MarketIndexDetailData | null {
  if (view.quote.status === "error" || view.chart.status === "error") {
    return null;
  }

  const quote = view.quote.data;
  const candles = view.chart.data;

  return {
    ...view,
    candles,
    changeAmount: quote.changeAmount,
    changeRate: quote.changeRate,
    currentValue: quote.currentValue,
    isRealtime: view.quote.status === "success",
    previousClose: quote.previousClose,
    provider: view.quote.provider,
    trend: quote.trend,
    updatedAt: view.quote.updatedAt,
    volume: quote.volume,
    ...getDetailValues(candles, quote.currentValue),
  };
}

function toSummary(detail: MarketIndexDetailData): MarketIndexSummaryData {
  return {
    candles: detail.candles.slice(-24),
    category: detail.category,
    changeAmount: detail.changeAmount,
    changeRate: detail.changeRate,
    countryCode: detail.countryCode,
    currencyCode: detail.currencyCode,
    currentValue: detail.currentValue,
    id: detail.id,
    indexType: detail.indexType,
    isRealtime: detail.isRealtime,
    name: detail.name,
    previousClose: detail.previousClose,
    provider: detail.provider,
    ticker: detail.ticker,
    trend: detail.trend,
    updatedAt: detail.updatedAt,
  };
}

function toStockCandleResponse(
  candles: MarketIndexCandleData[],
): StockCandleResponse[] {
  return candles.map((candle) => ({ ...candle }));
}

export async function getFreshMarketIndexViews() {
  return createService().getViews();
}

const getStoredCachedMarketIndexViews = unstable_cache(
  getFreshMarketIndexViews,
  ["market-index-views-v4"],
  { revalidate: MARKET_INDEX_REVALIDATE_SECONDS },
);

export async function getCachedMarketIndexViews() {
  const config = getMarketApiConfig();

  return (await getStoredCachedMarketIndexViews()).map((view) =>
    enforceMarketIndexFallbackTtl(view, {
      exchangeFallbackTtlMs: config.exchangeFallbackTtlMs,
      fallbackTtlMs: config.fallbackTtlMs,
    }),
  );
}

export async function getFreshMarketIndexView(indexId: string) {
  const config = getMarketIndexConfig(indexId);

  return config ? createService([config]).getView(config.id) : null;
}

export async function getCachedMarketIndexView(indexId: string) {
  const config = getMarketIndexConfig(indexId);

  if (!config) {
    return null;
  }

  return (
    (await getCachedMarketIndexViews()).find(({ id }) => id === config.id) ??
    null
  );
}

export async function getMarketIndexSummaries() {
  return (await getCachedMarketIndexViews())
    .map(toLegacyDetail)
    .filter((detail): detail is MarketIndexDetailData => detail !== null)
    .map(toSummary);
}

export const getCachedMarketIndexSummaries = getMarketIndexSummaries;

export async function getFreshMarketIndexSummaries() {
  return (await getFreshMarketIndexViews())
    .map(toLegacyDetail)
    .filter((detail): detail is MarketIndexDetailData => detail !== null)
    .map(toSummary);
}

export async function getCachedMarketIndexDetail(indexId: string) {
  const view = await getCachedMarketIndexView(indexId);

  return view ? toLegacyDetail(view) : null;
}

export async function getFreshMarketIndexDetail(indexId: string) {
  const view = await getFreshMarketIndexView(indexId);

  return view ? toLegacyDetail(view) : null;
}

export async function getFreshUsdKrwMarketIndexDetail() {
  return getFreshMarketIndexDetail("usd-krw");
}

export const getCachedUsdKrwMarketIndexDetail = unstable_cache(
  getFreshUsdKrwMarketIndexDetail,
  ["usd-krw-market-index-detail-v2"],
  { revalidate: USD_KRW_EXCHANGE_RATE_REVALIDATE_SECONDS },
);

export async function getMarketIndexCandleResult(
  indexId: string,
  interval: CandleInterval,
): Promise<MarketDataResult<StockCandleResponse[]> | null> {
  const view = await getCachedMarketIndexView(indexId);

  if (!view) {
    return null;
  }

  if (view.chart.status === "error") {
    return view.chart;
  }

  return {
    ...view.chart,
    data: getCandlesByInterval(
      toStockCandleResponse(view.chart.data),
      interval,
    ),
  };
}

export async function getMarketIndexCandles(
  indexId: string,
  interval: CandleInterval,
) {
  const result = await getMarketIndexCandleResult(indexId, interval);

  return result && result.status !== "error" ? result.data : null;
}

export async function getUsdKrwExchangeRateResult() {
  const view = await getCachedMarketIndexView("usd-krw");

  return view?.quote ?? {
    status: "error" as const,
    errorCode: "MARKET_API_UNAVAILABLE",
    message: "환율 정보를 불러오지 못했습니다.",
  };
}

export async function getFreshUsdKrwExchangeRateResult() {
  const view = await getFreshMarketIndexView("usd-krw");

  if (!view || view.quote.status !== "success") {
    return {
      status: "error" as const,
      errorCode:
        view?.quote.status === "error"
          ? view.quote.errorCode
          : "MARKET_API_FRESH_RATE_UNAVAILABLE",
      message: "최신 환율 정보를 불러오지 못했습니다.",
    };
  }

  return view.quote;
}

export const getCachedUsdKrwExchangeRateResult = getUsdKrwExchangeRateResult;

export async function getUsdKrwExchangeRate() {
  const result = await getCachedUsdKrwExchangeRateResult();

  if (result.status === "error") {
    throw new MarketApiError(
      "MARKET_API_NETWORK",
      result.message,
    );
  }

  return result.data.currentValue;
}

export { parseCandleInterval };
