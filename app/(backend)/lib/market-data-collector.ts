import type {
  MarketIndexCandleData,
  MarketIndexCategory,
  MarketIndexCurrencyCode,
} from "../../(frontend)/types/market-index";
import { getMarketApiConfig } from "./market-api/config.ts";
import { createFaultAwareFetch } from "./market-api/fault-adapter.ts";
import { requestMarketJson } from "./market-api/request.ts";
import {
  parseTwelveDataCandles,
  parseYahooChartCandles,
} from "./market-api/schemas.ts";

export type MarketIndexConfig = {
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

export type MarketDataProvider = "twelvedata" | "yahoo";

export type CollectedMarketIndexCandles = {
  config: MarketIndexConfig;
  candles: MarketIndexCandleData[];
  observedAt: string;
  provider: MarketDataProvider;
};

type CollectorDependencies = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  requestJson?: (url: string | URL, headers?: HeadersInit) => Promise<unknown>;
};

export const FALLBACK_CANDLE_COUNT = 260;

export const MARKET_INDEX_CONFIGS: MarketIndexConfig[] = [
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

const TWELVE_DATA_API_BASE_URL = "https://api.twelvedata.com";
const YAHOO_CHART_API_BASE_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart";

const MARKET_INDEX_LOOKUP = new Map(
  MARKET_INDEX_CONFIGS.flatMap((config) => [
    [config.id, config],
    [config.ticker.toLowerCase(), config],
  ]),
);

export function getMarketIndexConfig(indexId: string) {
  return MARKET_INDEX_LOOKUP.get(indexId.toLowerCase()) ?? null;
}

export function getMarketIndexConfigByTicker(ticker: string) {
  return (
    MARKET_INDEX_CONFIGS.find((config) => config.ticker === ticker) ?? null
  );
}

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

function getRequestJson(dependencies: CollectorDependencies) {
  if (dependencies.requestJson) {
    return dependencies.requestJson;
  }

  const env = dependencies.env ?? process.env;
  const config = getMarketApiConfig(env);
  const fetchImpl = createFaultAwareFetch({
    env,
    fetchImpl: dependencies.fetchImpl,
  });

  return (url: string | URL, headers?: HeadersInit) =>
    requestMarketJson(url, {
      ...config,
      fetchImpl,
      headers,
    });
}

export async function collectTwelveDataMarketIndexCandles(
  config: MarketIndexConfig,
  dependencies: CollectorDependencies = {},
): Promise<CollectedMarketIndexCandles | null> {
  const url = toTwelveDataTimeSeriesUrl(config);

  if (!url) {
    return null;
  }

  const now = dependencies.now?.() ?? new Date();
  const symbol = getTwelveDataSymbol(config);
  const data = await getRequestJson(dependencies)(url);
  const candles = parseTwelveDataCandles(data, config, now, symbol);

  return {
    config,
    candles,
    observedAt: now.toISOString(),
    provider: "twelvedata",
  };
}

export async function collectTwelveDataMarketIndexBatch(): Promise<
  CollectedMarketIndexCandles[]
> {
  const twelveDataConfigs = MARKET_INDEX_CONFIGS.filter(
    (config) => config.category === "exchangeRate",
  );
  const settled = await Promise.allSettled(
    twelveDataConfigs.map((config) =>
      collectTwelveDataMarketIndexCandles(config),
    ),
  );

  return settled.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
}

export async function collectYahooMarketIndexCandles(
  config: MarketIndexConfig,
  dependencies: CollectorDependencies = {},
): Promise<CollectedMarketIndexCandles | null> {
  const url = toYahooChartUrl(config);

  if (!url) {
    return null;
  }

  const now = dependencies.now?.() ?? new Date();
  const data = await getRequestJson(dependencies)(url, {
    "User-Agent": "Mozilla/5.0",
  });
  const candles = parseYahooChartCandles(data, config, now);

  return {
    config,
    candles,
    observedAt: now.toISOString(),
    provider: "yahoo",
  };
}

export async function collectYahooMarketIndexBatch(): Promise<
  CollectedMarketIndexCandles[]
> {
  const details = await Promise.allSettled(
    MARKET_INDEX_CONFIGS.filter((config) => Boolean(config.yahooSymbol)).map(
      (config) => collectYahooMarketIndexCandles(config),
    ),
  );

  return details.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
}
