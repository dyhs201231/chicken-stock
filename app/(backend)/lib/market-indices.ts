import { unstable_cache } from "next/cache";
import { CurrencyCode } from "../generated/prisma/enums";
import { prisma } from "./prisma";
import {
  getCandlesByInterval,
  parseCandleInterval,
  type CandleInterval,
  type StockCandleResponse,
} from "./stock-candles";
import type {
  MarketIndexCandleData,
  MarketIndexCategory,
  MarketIndexCurrencyCode,
  MarketIndexDetailData,
  MarketIndexSummaryData,
  MarketIndexTrend,
} from "../../(frontend)/types/market-index";

type DecimalLike = {
  toNumber: () => number;
};

type MarketIndexConfig = {
  id: string;
  ticker: string;
  twelveDataEnvKey: string;
  twelveDataSymbol: string;
  yahooSymbol?: string;
  name: string;
  category: MarketIndexCategory;
  indexType: string;
  countryCode: string;
  currencyCode: MarketIndexCurrencyCode;
  currentValue: number;
  previousClose: number;
  openValue: number;
  dayHigh: number;
  dayLow: number;
  high52w: number;
  low52w: number;
  volume: number;
  isRealtime: boolean;
  provider: string;
  waveSeed: number;
};

const MARKET_INDEX_CONFIGS: MarketIndexConfig[] = [
  {
    id: "kospi",
    ticker: "KOSPI",
    twelveDataEnvKey: "TWELVEDATA_KOSPI_SYMBOL",
    twelveDataSymbol: "KOSPI",
    yahooSymbol: "^KS11",
    name: "코스피",
    category: "stockIndex",
    indexType: "DOMESTIC_EQUITY_INDEX",
    countryCode: "KR",
    currencyCode: "KRW",
    currentValue: 6336.69,
    previousClose: 6216.94,
    openValue: 6302.54,
    dayHigh: 6353.5,
    dayLow: 6204.1,
    high52w: 6750,
    low52w: 4500,
    volume: 56_880_000,
    isRealtime: true,
    provider: "local-fallback",
    waveSeed: 1.7,
  },
  {
    id: "kosdaq",
    ticker: "KOSDAQ",
    twelveDataEnvKey: "TWELVEDATA_KOSDAQ_SYMBOL",
    twelveDataSymbol: "KQ11",
    yahooSymbol: "^KQ11",
    name: "코스닥",
    category: "stockIndex",
    indexType: "DOMESTIC_EQUITY_INDEX",
    countryCode: "KR",
    currencyCode: "KRW",
    currentValue: 1478.55,
    previousClose: 1477.28,
    openValue: 1475.4,
    dayHigh: 1488.2,
    dayLow: 1462.8,
    high52w: 1642.7,
    low52w: 1198.3,
    volume: 41_230_000,
    isRealtime: true,
    provider: "local-fallback",
    waveSeed: 2.9,
  },
  {
    id: "nasdaq",
    ticker: "NASDAQ",
    twelveDataEnvKey: "TWELVEDATA_NASDAQ_SYMBOL",
    twelveDataSymbol: "IXIC",
    yahooSymbol: "^IXIC",
    name: "나스닥",
    category: "stockIndex",
    indexType: "GLOBAL_EQUITY_INDEX",
    countryCode: "US",
    currencyCode: "USD",
    currentValue: 22716.13,
    previousClose: 22697.1,
    openValue: 22664.8,
    dayHigh: 22804.2,
    dayLow: 22593.7,
    high52w: 23140.2,
    low52w: 17138.9,
    volume: 6_240_000_000,
    isRealtime: true,
    provider: "local-fallback",
    waveSeed: 3.8,
  },
  {
    id: "sp500",
    ticker: "SPX",
    twelveDataEnvKey: "TWELVEDATA_SP500_SYMBOL",
    twelveDataSymbol: "SPX",
    yahooSymbol: "^GSPC",
    name: "S&P 500",
    category: "stockIndex",
    indexType: "GLOBAL_EQUITY_INDEX",
    countryCode: "US",
    currencyCode: "USD",
    currentValue: 5566.98,
    previousClose: 5609.49,
    openValue: 5592.3,
    dayHigh: 5618.4,
    dayLow: 5549.8,
    high52w: 5798.2,
    low52w: 4821.6,
    volume: 4_820_000_000,
    isRealtime: true,
    provider: "local-fallback",
    waveSeed: 4.4,
  },
  {
    id: "usd-krw",
    ticker: "USDKRW",
    twelveDataEnvKey: "TWELVEDATA_USD_KRW_SYMBOL",
    twelveDataSymbol: "USD/KRW",
    yahooSymbol: "KRW=X",
    name: "달러 환율",
    category: "exchangeRate",
    indexType: "FX_RATE",
    countryCode: "KR",
    currencyCode: "KRW",
    currentValue: 1478.55,
    previousClose: 1467.3,
    openValue: 1470.2,
    dayHigh: 1482.6,
    dayLow: 1466.8,
    high52w: 1536.4,
    low52w: 1298.7,
    volume: 0,
    isRealtime: true,
    provider: "local-fallback",
    waveSeed: 5.2,
  },
];

const FALLBACK_CANDLE_COUNT = 260;
const MARKET_INDEX_REVALIDATE_SECONDS = 60 * 60 * 24;
const TWELVE_DATA_API_BASE_URL = "https://api.twelvedata.com";
const YAHOO_CHART_API_BASE_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart";

const MARKET_INDEX_LOOKUP = new Map(
  MARKET_INDEX_CONFIGS.flatMap((config) => [
    [config.id, config],
    [config.ticker.toLowerCase(), config],
  ]),
);

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

function getMarketIndexConfig(indexId: string) {
  return MARKET_INDEX_LOOKUP.get(indexId.toLowerCase()) ?? null;
}

type TwelveDataTimeSeriesValue = {
  close?: string;
  datetime?: string;
  high?: string;
  low?: string;
  open?: string;
  volume?: string;
};

type TwelveDataTimeSeriesSuccess = {
  meta?: {
    symbol?: string;
  };
  status?: "ok";
  values?: TwelveDataTimeSeriesValue[];
};

type TwelveDataTimeSeriesError = {
  code?: number;
  message?: string;
  status?: "error";
};

type TwelveDataTimeSeriesResponse =
  | TwelveDataTimeSeriesSuccess
  | TwelveDataTimeSeriesError;
type TwelveDataBatchTimeSeriesResponse = Record<
  string,
  TwelveDataTimeSeriesResponse
>;

type YahooChartQuote = {
  close?: Array<number | null>;
  high?: Array<number | null>;
  low?: Array<number | null>;
  open?: Array<number | null>;
  volume?: Array<number | null>;
};

type YahooChartResult = {
  indicators?: {
    quote?: YahooChartQuote[];
  };
  meta?: {
    chartPreviousClose?: number;
    currency?: string;
    regularMarketPrice?: number;
  };
  timestamp?: number[];
};

type YahooChartResponse = {
  chart?: {
    error?: {
      code?: string;
      description?: string;
    } | null;
    result?: YahooChartResult[];
  };
};

function getTwelveDataApiKey() {
  const apiKey = process.env.TWELVEDATA_SECRET_KEY?.trim();

  return apiKey || null;
}

function getTwelveDataSymbol(config: MarketIndexConfig) {
  const envSymbol = process.env[config.twelveDataEnvKey]?.trim();

  return envSymbol || config.twelveDataSymbol;
}

function getYahooSymbol(config: MarketIndexConfig) {
  return config.yahooSymbol ?? null;
}

function parseFiniteNumber(value: string | number | undefined) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseTwelveDataCandle(value: TwelveDataTimeSeriesValue) {
  const open = parseFiniteNumber(value.open);
  const high = parseFiniteNumber(value.high);
  const low = parseFiniteNumber(value.low);
  const close = parseFiniteNumber(value.close);

  if (
    !value.datetime ||
    open === null ||
    high === null ||
    low === null ||
    close === null
  ) {
    return null;
  }

  return {
    time: value.datetime.slice(0, 10),
    open,
    high,
    low,
    close,
    volume: parseFiniteNumber(value.volume) ?? 0,
  } satisfies MarketIndexCandleData;
}

function parseYahooChartCandle(
  timestamp: number,
  quote: YahooChartQuote,
  index: number,
) {
  const open = parseFiniteNumber(quote.open?.[index] ?? undefined);
  const high = parseFiniteNumber(quote.high?.[index] ?? undefined);
  const low = parseFiniteNumber(quote.low?.[index] ?? undefined);
  const close = parseFiniteNumber(quote.close?.[index] ?? undefined);

  if (open === null || high === null || low === null || close === null) {
    return null;
  }

  return {
    time: new Date(timestamp * 1000).toISOString().slice(0, 10),
    open,
    high,
    low,
    close,
    volume: parseFiniteNumber(quote.volume?.[index] ?? undefined) ?? 0,
  } satisfies MarketIndexCandleData;
}

function toTwelveDataTimeSeriesUrl(config: MarketIndexConfig) {
  const apiKey = getTwelveDataApiKey();

  if (!apiKey) {
    return null;
  }

  const url = new URL(`${TWELVE_DATA_API_BASE_URL}/time_series`);
  url.searchParams.set("symbol", getTwelveDataSymbol(config));
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", String(FALLBACK_CANDLE_COUNT));
  url.searchParams.set("order", "ASC");
  url.searchParams.set("apikey", apiKey);

  return url;
}

function toTwelveDataBatchTimeSeriesUrl(configs: MarketIndexConfig[]) {
  const apiKey = getTwelveDataApiKey();

  if (!apiKey) {
    return null;
  }

  const url = new URL(`${TWELVE_DATA_API_BASE_URL}/time_series`);
  url.searchParams.set("symbol", configs.map(getTwelveDataSymbol).join(","));
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", String(FALLBACK_CANDLE_COUNT));
  url.searchParams.set("order", "ASC");
  url.searchParams.set("apikey", apiKey);

  return url;
}

function toYahooChartUrl(config: MarketIndexConfig) {
  const symbol = getYahooSymbol(config);

  if (!symbol) {
    return null;
  }

  const url = new URL(
    `${YAHOO_CHART_API_BASE_URL}/${encodeURIComponent(symbol)}`,
  );
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", "1y");

  return url;
}

function getCandlesFromTwelveDataResponse(data: TwelveDataTimeSeriesResponse) {
  if (
    data.status !== "ok" ||
    !("values" in data) ||
    !Array.isArray(data.values)
  ) {
    return null;
  }

  const candles = data.values
    .map(parseTwelveDataCandle)
    .filter((candle): candle is MarketIndexCandleData => candle !== null)
    .sort((a, b) => a.time.localeCompare(b.time));

  return candles.length > 0 ? candles : null;
}

function getCandlesFromYahooChartResponse(data: YahooChartResponse) {
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp;
  const quote = result?.indicators?.quote?.[0];

  if (
    data.chart?.error ||
    !timestamps ||
    !quote ||
    !Array.isArray(timestamps)
  ) {
    return null;
  }

  const candles = timestamps
    .map((timestamp, index) => parseYahooChartCandle(timestamp, quote, index))
    .filter((candle): candle is MarketIndexCandleData => candle !== null)
    .sort((a, b) => a.time.localeCompare(b.time));

  return candles.length > 0 ? candles.slice(-FALLBACK_CANDLE_COUNT) : null;
}

async function fetchTwelveDataTimeSeries(config: MarketIndexConfig) {
  const url = toTwelveDataTimeSeriesUrl(config);

  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });
    const data = (await response.json()) as TwelveDataTimeSeriesResponse;

    if (!response.ok) {
      return null;
    }

    return getCandlesFromTwelveDataResponse(data);
  } catch {
    return null;
  }
}

async function fetchYahooChartTimeSeries(config: MarketIndexConfig) {
  const url = toYahooChartUrl(config);

  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    const data = (await response.json()) as YahooChartResponse;

    if (!response.ok) {
      return null;
    }

    return getCandlesFromYahooChartResponse(data);
  } catch {
    return null;
  }
}

async function fetchTwelveDataMarketIndexDetail(
  config: MarketIndexConfig,
): Promise<MarketIndexDetailData | null> {
  const candles = await fetchTwelveDataTimeSeries(config);

  if (!candles) {
    return null;
  }

  return toMarketIndexDetailFromCandles(config, candles, "twelvedata");
}

async function fetchTwelveDataMarketIndexDetails(): Promise<
  MarketIndexDetailData[]
> {
  const twelveDataConfigs = MARKET_INDEX_CONFIGS.filter(
    (config) => config.category === "exchangeRate",
  );
  const url = toTwelveDataBatchTimeSeriesUrl(twelveDataConfigs);

  if (!url) {
    return [];
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });
    const data = (await response.json()) as TwelveDataBatchTimeSeriesResponse;

    if (!response.ok || !data || typeof data !== "object") {
      return [];
    }

    return twelveDataConfigs
      .map((config) => {
        const symbol = getTwelveDataSymbol(config);
        const symbolData = data[symbol];
        const candles = symbolData
          ? getCandlesFromTwelveDataResponse(symbolData)
          : null;

        return candles
          ? toMarketIndexDetailFromCandles(config, candles, "twelvedata")
          : null;
      })
      .filter((detail): detail is MarketIndexDetailData => detail !== null);
  } catch {
    return [];
  }
}

async function fetchYahooMarketIndexDetail(
  config: MarketIndexConfig,
): Promise<MarketIndexDetailData | null> {
  const candles = await fetchYahooChartTimeSeries(config);

  if (!candles) {
    return null;
  }

  return toMarketIndexDetailFromCandles(config, candles, "yahoo");
}

async function fetchYahooMarketIndexDetails(): Promise<
  MarketIndexDetailData[]
> {
  const details = await Promise.all(
    MARKET_INDEX_CONFIGS.filter((config) => Boolean(config.yahooSymbol)).map(
      fetchYahooMarketIndexDetail,
    ),
  );

  return details.filter(
    (detail): detail is MarketIndexDetailData => detail !== null,
  );
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

function getConfigByTicker(ticker: string) {
  return (
    MARKET_INDEX_CONFIGS.find((config) => config.ticker === ticker) ?? null
  );
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
    const config = getConfigByTicker(marketIndex.ticker);
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

export async function getUsdKrwExchangeRate() {
  const detail = await getCachedMarketIndexDetail("usd-krw");

  return (
    detail?.currentValue ??
    getFallbackDetail(MARKET_INDEX_CONFIGS[4]).currentValue
  );
}

export async function getFreshUsdKrwMarketIndexDetail() {
  const config = getMarketIndexConfig("usd-krw");

  if (!config) {
    return getFallbackDetail(MARKET_INDEX_CONFIGS[4]);
  }

  return (
    (await fetchTwelveDataMarketIndexDetail(config)) ??
    (await fetchYahooMarketIndexDetail(config)) ??
    (await getCachedMarketIndexDetail("usd-krw")) ??
    getFallbackDetail(config)
  );
}

export async function getFreshUsdKrwExchangeRate() {
  return (await getFreshUsdKrwMarketIndexDetail()).currentValue;
}

export { parseCandleInterval };
