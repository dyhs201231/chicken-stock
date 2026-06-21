import { unstable_cache } from "next/cache";
import { CurrencyCode } from "../generated/prisma/enums";
import { prisma } from "./prisma";
import {
  collectTwelveDataMarketIndexBatch,
  collectTwelveDataMarketIndexCandles,
  collectYahooMarketIndexBatch,
  collectYahooMarketIndexCandles,
  FALLBACK_CANDLE_COUNT,
  getMarketIndexConfig,
  getMarketIndexConfigByTicker,
  MARKET_INDEX_CONFIGS,
  type CollectedMarketIndexCandles,
  type MarketIndexConfig,
} from "./market-data-collector";
import { saveCollectedMarketIndexSnapshots } from "./market-price-snapshots";
import {
  getCandlesByInterval,
  parseCandleInterval,
  type CandleInterval,
  type StockCandleResponse,
} from "./stock-candles";
import type {
  MarketIndexCandleData,
  MarketIndexDetailData,
  MarketIndexCurrencyCode,
  MarketIndexSummaryData,
  MarketIndexTrend,
} from "../../(frontend)/types/market-index";

type DecimalLike = {
  toNumber: () => number;
};

const MARKET_INDEX_REVALIDATE_SECONDS = 60 * 60;
const USD_KRW_EXCHANGE_RATE_REVALIDATE_SECONDS = 60 * 10;

function toNumber(value: DecimalLike) {
  return value.toNumber();
}

function roundMarketValue(value: number) {
  return Number(value.toFixed(2));
}

function getTrend(changeAmount: number): MarketIndexTrend {
  if (changeAmount > 0) {
    return "up";
  }

  if (changeAmount < 0) {
    return "down";
  }

  return "flat";
}

function getChangeRate(currentValue: number, previousClose: number) {
  if (!Number.isFinite(previousClose) || previousClose === 0) {
    return 0;
  }

  return ((currentValue - previousClose) / previousClose) * 100;
}

function toMarketIndexDetailFromCandles(
  config: MarketIndexConfig,
  candles: MarketIndexCandleData[],
  provider: string,
): MarketIndexDetailData | null {
  const latestCandle = candles.at(-1);
  const previousCandle = candles.at(-2);

  if (!latestCandle) {
    return null;
  }

  const currentValue = latestCandle.close;
  const previousClose = previousCandle?.close ?? latestCandle.open;
  const changeAmount = roundMarketValue(currentValue - previousClose);

  return {
    id: config.id,
    ticker: config.ticker,
    name: config.name,
    category: config.category,
    indexType: config.indexType,
    countryCode: config.countryCode,
    currencyCode: config.currencyCode,
    currentValue,
    previousClose,
    changeAmount,
    changeRate: roundMarketValue(getChangeRate(currentValue, previousClose)),
    trend: getTrend(changeAmount),
    isRealtime: false,
    provider,
    updatedAt: new Date().toISOString(),
    candles,
    ...getDetailValuesFromCandles(candles, currentValue),
  };
}

function toMarketIndexDetailFromCollection(
  collection: CollectedMarketIndexCandles,
) {
  return toMarketIndexDetailFromCandles(
    collection.config,
    collection.candles,
    collection.provider,
  );
}

async function saveCollectedMarketIndexSnapshotsSafely(
  collections: CollectedMarketIndexCandles[],
) {
  try {
    await saveCollectedMarketIndexSnapshots(collections);
  } catch (error) {
    console.error("Saving market price snapshots failed", {
      error,
      tickers: collections.map((collection) => collection.config.ticker),
    });
  }
}

async function fetchTwelveDataMarketIndexDetails(): Promise<
  MarketIndexDetailData[]
> {
  const collections = await collectTwelveDataMarketIndexBatch();
  await saveCollectedMarketIndexSnapshotsSafely(collections);

  return collections
    .map(toMarketIndexDetailFromCollection)
    .filter((detail): detail is MarketIndexDetailData => detail !== null);
}

async function fetchYahooMarketIndexDetails(): Promise<
  MarketIndexDetailData[]
> {
  const collections = await collectYahooMarketIndexBatch();
  await saveCollectedMarketIndexSnapshotsSafely(collections);

  return collections
    .map(toMarketIndexDetailFromCollection)
    .filter((detail): detail is MarketIndexDetailData => detail !== null);
}

const getCachedTwelveDataMarketIndexDetails = unstable_cache(
  fetchTwelveDataMarketIndexDetails,
  ["twelve-data-market-index-details-v1"],
  {
    revalidate: MARKET_INDEX_REVALIDATE_SECONDS,
  },
);

const getCachedYahooMarketIndexDetails = unstable_cache(
  fetchYahooMarketIndexDetails,
  ["yahoo-market-index-details-v1"],
  {
    revalidate: MARKET_INDEX_REVALIDATE_SECONDS,
  },
);

function getBusinessDateKeys(count: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);

  const dateKeys: string[] = [];

  while (dateKeys.length < count) {
    const day = date.getUTCDay();

    if (day !== 0 && day !== 6) {
      dateKeys.push(date.toISOString().slice(0, 10));
    }

    date.setUTCDate(date.getUTCDate() - 1);
  }

  return dateKeys.reverse();
}

function createFallbackCandles(config: MarketIndexConfig) {
  const dateKeys = getBusinessDateKeys(FALLBACK_CANDLE_COUNT);
  const startValue = config.low52w + (config.high52w - config.low52w) * 0.28;
  const valueRange = config.high52w - config.low52w;

  return dateKeys.map<MarketIndexCandleData>((time, index) => {
    const progress = index / Math.max(dateKeys.length - 1, 1);
    const trendValue =
      startValue + (config.currentValue - startValue) * progress;
    const wave =
      Math.sin(index * 0.22 + config.waveSeed) * valueRange * 0.025 +
      Math.cos(index * 0.09 + config.waveSeed) * valueRange * 0.015;
    const close =
      index === dateKeys.length - 1
        ? config.currentValue
        : index === dateKeys.length - 2
          ? config.previousClose
          : roundMarketValue(trendValue + wave);
    const previousClose =
      index === 0
        ? close
        : roundMarketValue(trendValue + Math.sin((index - 1) * 0.2) * 8);
    const open =
      index === dateKeys.length - 1
        ? config.openValue
        : roundMarketValue((previousClose + close) / 2);
    const spread = Math.max(Math.abs(close - open), valueRange * 0.006);
    const high =
      index === dateKeys.length - 1
        ? config.dayHigh
        : roundMarketValue(Math.max(open, close) + spread * 0.55);
    const low =
      index === dateKeys.length - 1
        ? config.dayLow
        : roundMarketValue(Math.min(open, close) - spread * 0.55);
    const volume =
      config.volume > 0
        ? Math.round(config.volume * (0.72 + (index % 9) * 0.045))
        : 0;

    return {
      time,
      open,
      high,
      low,
      close,
      volume,
    };
  });
}

function getCurrencyCode(value: CurrencyCode): MarketIndexCurrencyCode {
  return value === CurrencyCode.USD ? "USD" : "KRW";
}

function getCandlesFromDb(
  candles: {
    timestamp: bigint;
    openValue: DecimalLike;
    highValue: DecimalLike;
    lowValue: DecimalLike;
    closeValue: DecimalLike;
    volume: DecimalLike | null;
  }[],
) {
  return candles
    .map<MarketIndexCandleData>((candle) => ({
      time: new Date(Number(candle.timestamp)).toISOString().slice(0, 10),
      open: toNumber(candle.openValue),
      high: toNumber(candle.highValue),
      low: toNumber(candle.lowValue),
      close: toNumber(candle.closeValue),
      volume: candle.volume ? toNumber(candle.volume) : 0,
    }))
    .filter((candle) =>
      [candle.open, candle.high, candle.low, candle.close, candle.volume].every(
        Number.isFinite,
      ),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

function getDetailValuesFromCandles(
  candles: MarketIndexCandleData[],
  currentValue: number,
) {
  const latestCandle = candles.at(-1);
  const high52w = Math.max(...candles.map((candle) => candle.high));
  const low52w = Math.min(...candles.map((candle) => candle.low));

  return {
    openValue: latestCandle?.open ?? currentValue,
    dayHigh: latestCandle?.high ?? currentValue,
    dayLow: latestCandle?.low ?? currentValue,
    high52w: Number.isFinite(high52w) ? high52w : currentValue,
    low52w: Number.isFinite(low52w) ? low52w : currentValue,
    volume: latestCandle?.volume ?? 0,
  };
}

function toStockCandleResponse(
  candles: MarketIndexCandleData[],
): StockCandleResponse[] {
  return candles.map((candle) => ({
    time: candle.time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));
}

function getFallbackDetail(config: MarketIndexConfig): MarketIndexDetailData {
  const changeAmount = roundMarketValue(
    config.currentValue - config.previousClose,
  );
  const candles = createFallbackCandles(config);

  return {
    id: config.id,
    ticker: config.ticker,
    name: config.name,
    category: config.category,
    indexType: config.indexType,
    countryCode: config.countryCode,
    currencyCode: config.currencyCode,
    currentValue: config.currentValue,
    previousClose: config.previousClose,
    changeAmount,
    changeRate: roundMarketValue(
      getChangeRate(config.currentValue, config.previousClose),
    ),
    trend: getTrend(changeAmount),
    isRealtime: config.isRealtime,
    provider: config.provider,
    updatedAt: new Date().toISOString(),
    candles,
    openValue: config.openValue,
    dayHigh: config.dayHigh,
    dayLow: config.dayLow,
    high52w: config.high52w,
    low52w: config.low52w,
    volume: config.volume,
  };
}

function toSummary(detail: MarketIndexDetailData): MarketIndexSummaryData {
  return {
    id: detail.id,
    ticker: detail.ticker,
    name: detail.name,
    category: detail.category,
    indexType: detail.indexType,
    countryCode: detail.countryCode,
    currencyCode: detail.currencyCode,
    currentValue: detail.currentValue,
    previousClose: detail.previousClose,
    changeAmount: detail.changeAmount,
    changeRate: detail.changeRate,
    trend: detail.trend,
    isRealtime: detail.isRealtime,
    provider: detail.provider,
    updatedAt: detail.updatedAt,
    candles: detail.candles.slice(-24),
  };
}

async function getMarketIndexDetailsFromDb() {
  const tickers = MARKET_INDEX_CONFIGS.map((config) => config.ticker);
  const marketIndexes = await prisma.marketIndex.findMany({
    include: {
      candles: {
        orderBy: {
          timestamp: "desc",
        },
        take: FALLBACK_CANDLE_COUNT,
        where: {
          intervalCode: "1D",
        },
      },
    },
    where: {
      ticker: {
        in: tickers,
      },
    },
  });

  return marketIndexes.map<MarketIndexDetailData>((marketIndex) => {
    const config = getMarketIndexConfigByTicker(marketIndex.ticker);
    const currentValue = toNumber(marketIndex.currentValue);
    const previousClose = toNumber(marketIndex.previousClose);
    const changeAmount = toNumber(marketIndex.changeAmount);
    const candles = getCandlesFromDb(marketIndex.candles.reverse());
    const detailValues =
      candles.length > 0
        ? getDetailValuesFromCandles(candles, currentValue)
        : config
          ? {
              openValue: config.openValue,
              dayHigh: config.dayHigh,
              dayLow: config.dayLow,
              high52w: config.high52w,
              low52w: config.low52w,
              volume: config.volume,
            }
          : {
              openValue: currentValue,
              dayHigh: currentValue,
              dayLow: currentValue,
              high52w: currentValue,
              low52w: currentValue,
              volume: 0,
            };

    return {
      id: config?.id ?? marketIndex.ticker.toLowerCase(),
      ticker: marketIndex.ticker,
      name: marketIndex.name,
      category: config?.category ?? "stockIndex",
      indexType: marketIndex.indexType,
      countryCode: marketIndex.countryCode,
      currencyCode: getCurrencyCode(marketIndex.currencyCode),
      currentValue,
      previousClose,
      changeAmount,
      changeRate: toNumber(marketIndex.changeRate),
      trend: getTrend(changeAmount),
      isRealtime: marketIndex.isRealtime,
      provider: marketIndex.provider,
      updatedAt: marketIndex.updatedAt.toISOString(),
      candles:
        candles.length > 0
          ? candles
          : config
            ? createFallbackCandles(config)
            : [],
      ...detailValues,
    };
  });
}

async function mergeMarketIndexDetails(
  externalDetails: MarketIndexDetailData[],
) {
  const dbDetails = await getMarketIndexDetailsFromDb();
  const externalDetailsById = new Map(
    externalDetails.map((detail) => [detail.id, detail]),
  );
  const detailsByTicker = new Map(
    dbDetails.map((detail) => [detail.ticker, detail]),
  );

  return MARKET_INDEX_CONFIGS.map(
    (config) =>
      externalDetailsById.get(config.id) ??
      detailsByTicker.get(config.ticker) ??
      getFallbackDetail(config),
  );
}

async function getMarketIndexDetails() {
  const [twelveDataDetails, yahooDetails] = await Promise.all([
    getCachedTwelveDataMarketIndexDetails(),
    getCachedYahooMarketIndexDetails(),
  ]);

  return mergeMarketIndexDetails([...yahooDetails, ...twelveDataDetails]);
}

export async function getFreshMarketIndexDetails() {
  const [twelveDataDetails, yahooDetails] = await Promise.all([
    fetchTwelveDataMarketIndexDetails(),
    fetchYahooMarketIndexDetails(),
  ]);

  return mergeMarketIndexDetails([...yahooDetails, ...twelveDataDetails]);
}

export async function getMarketIndexSummaries() {
  return (await getMarketIndexDetails()).map(toSummary);
}

export async function getFreshMarketIndexSummaries() {
  return (await getFreshMarketIndexDetails()).map(toSummary);
}

export const getCachedMarketIndexSummaries = unstable_cache(
  getMarketIndexSummaries,
  ["market-index-summaries-v3"],
  {
    revalidate: MARKET_INDEX_REVALIDATE_SECONDS,
  },
);

export async function getMarketIndexDetail(indexId: string) {
  const config = getMarketIndexConfig(indexId);

  if (!config) {
    return null;
  }

  const details = await getMarketIndexDetails();

  return details.find((detail) => detail.id === config.id) ?? null;
}

export async function getFreshMarketIndexDetail(indexId: string) {
  const config = getMarketIndexConfig(indexId);

  if (!config) {
    return null;
  }

  const details = await getFreshMarketIndexDetails();

  return details.find((detail) => detail.id === config.id) ?? null;
}

export const getCachedMarketIndexDetail = unstable_cache(
  getMarketIndexDetail,
  ["market-index-detail-v3"],
  {
    revalidate: MARKET_INDEX_REVALIDATE_SECONDS,
  },
);

export async function getMarketIndexCandles(
  indexId: string,
  interval: CandleInterval,
) {
  const detail = await getCachedMarketIndexDetail(indexId);

  if (!detail) {
    return null;
  }

  return getCandlesByInterval(toStockCandleResponse(detail.candles), interval);
}

export async function getFreshUsdKrwMarketIndexDetail() {
  const config = getMarketIndexConfig("usd-krw");

  if (!config) {
    return getFallbackDetail(MARKET_INDEX_CONFIGS[4]);
  }

  const twelveDataCollection = await collectTwelveDataMarketIndexCandles(config);
  await saveCollectedMarketIndexSnapshotsSafely(
    twelveDataCollection ? [twelveDataCollection] : [],
  );
  const twelveDataDetail = twelveDataCollection
    ? toMarketIndexDetailFromCollection(twelveDataCollection)
    : null;

  if (twelveDataDetail) {
    return twelveDataDetail;
  }

  const yahooCollection = await collectYahooMarketIndexCandles(config);
  await saveCollectedMarketIndexSnapshotsSafely(
    yahooCollection ? [yahooCollection] : [],
  );
  const yahooDetail = yahooCollection
    ? toMarketIndexDetailFromCollection(yahooCollection)
    : null;

  return (
    yahooDetail ??
    (await getCachedMarketIndexDetail("usd-krw")) ??
    getFallbackDetail(config)
  );
}

export const getCachedUsdKrwMarketIndexDetail = unstable_cache(
  getFreshUsdKrwMarketIndexDetail,
  ["usd-krw-exchange-rate-v1"],
  {
    revalidate: USD_KRW_EXCHANGE_RATE_REVALIDATE_SECONDS,
  },
);

export async function getUsdKrwExchangeRate() {
  return (await getCachedUsdKrwMarketIndexDetail()).currentValue;
}

export { parseCandleInterval };
