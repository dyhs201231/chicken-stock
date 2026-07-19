import type {
  MarketIndexConfig,
  CollectedMarketIndexCandles,
} from "./market-data-collector.ts";
import type {
  MarketFallbackRepository,
  StoredMarketIndexData,
} from "./market-api/fallback-repository.ts";
import { isFallbackFresh } from "./market-api/fallback-repository.ts";
import type {
  MarketDataResult,
  MarketIndexCandleData,
  MarketIndexQuoteData,
  MarketIndexTrend,
  MarketIndexViewData,
} from "../../(frontend)/types/market-index";

type CollectMarketIndex = (
  config: MarketIndexConfig,
) => Promise<CollectedMarketIndexCandles | null>;

type MarketIndexServiceDependencies = {
  collectTwelveData: CollectMarketIndex;
  collectYahoo: CollectMarketIndex;
  configs: MarketIndexConfig[];
  exchangeFallbackTtlMs?: number;
  fallbackTtlMs?: number;
  logger?: Pick<Console, "error">;
  now?: () => Date;
  repository: MarketFallbackRepository;
};

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
  return previousClose > 0
    ? ((currentValue - previousClose) / previousClose) * 100
    : 0;
}

function toQuoteData(candles: MarketIndexCandleData[]): MarketIndexQuoteData {
  const latest = candles.at(-1);
  const previous = candles.at(-2);

  if (!latest) {
    throw new Error("Validated market collection must contain a candle");
  }

  const previousClose = previous?.close ?? latest.open;
  const changeAmount = latest.close - previousClose;

  return {
    changeAmount,
    changeRate: getChangeRate(latest.close, previousClose),
    currentValue: latest.close,
    previousClose,
    trend: getTrend(changeAmount),
    volume: latest.volume,
  };
}

function toStoredQuoteData(
  stored: NonNullable<StoredMarketIndexData["quote"]>,
): MarketIndexQuoteData {
  return {
    changeAmount: stored.changeAmount,
    changeRate: stored.changeRate,
    currentValue: stored.currentValue,
    previousClose: stored.previousClose,
    trend: getTrend(stored.changeAmount),
    volume: stored.volume,
  };
}

function getErrorCode(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return "MARKET_API_UNAVAILABLE";
}

function toErrorResult<T>(error: unknown): MarketDataResult<T> {
  return {
    status: "error",
    errorCode: getErrorCode(error),
    message: "시세 정보를 불러오지 못했습니다.",
  };
}

function toIdentity(config: MarketIndexConfig) {
  return {
    category: config.category,
    countryCode: config.countryCode,
    currencyCode: config.currencyCode,
    id: config.id,
    indexType: config.indexType,
    name: config.name,
    ticker: config.ticker,
  };
}

function expireFallback<T>(
  result: MarketDataResult<T>,
  ttlMs: number,
  now: Date,
): MarketDataResult<T> {
  if (
    result.status !== "fallback" ||
    isFallbackFresh(new Date(result.updatedAt), ttlMs, now)
  ) {
    return result;
  }

  return {
    status: "error",
    errorCode: "MARKET_API_FALLBACK_EXPIRED",
    message: "최근 저장된 시세의 유효 시간이 지났습니다.",
  };
}

export function enforceMarketIndexFallbackTtl(
  view: MarketIndexViewData,
  {
    exchangeFallbackTtlMs,
    fallbackTtlMs,
    now = new Date(),
  }: {
    exchangeFallbackTtlMs: number;
    fallbackTtlMs: number;
    now?: Date;
  },
): MarketIndexViewData {
  const quoteTtlMs =
    view.category === "exchangeRate"
      ? exchangeFallbackTtlMs
      : fallbackTtlMs;

  return {
    ...view,
    chart: expireFallback(view.chart, fallbackTtlMs, now),
    quote: expireFallback(view.quote, quoteTtlMs, now),
  };
}

async function getFreshCollection(
  config: MarketIndexConfig,
  collectTwelveData: CollectMarketIndex,
  collectYahoo: CollectMarketIndex,
) {
  const collectors =
    config.category === "exchangeRate"
      ? [collectTwelveData, collectYahoo]
      : [collectYahoo];
  let lastError: unknown = new Error("No market provider returned data");

  for (const collect of collectors) {
    try {
      const collection = await collect(config);

      if (collection) {
        return { collection, error: null };
      }
    } catch (error) {
      lastError = error;
    }
  }

  return { collection: null, error: lastError };
}

export function createMarketIndexService({
  collectTwelveData,
  collectYahoo,
  configs,
  exchangeFallbackTtlMs = 600_000,
  fallbackTtlMs = 3_600_000,
  logger = console,
  now = () => new Date(),
  repository,
}: MarketIndexServiceDependencies) {
  async function getView(config: MarketIndexConfig): Promise<MarketIndexViewData> {
    const fresh = await getFreshCollection(
      config,
      collectTwelveData,
      collectYahoo,
    );

    if (fresh.collection) {
      try {
        await repository.saveFresh(fresh.collection);
      } catch (error) {
        logger.error("Saving validated market fallback failed", {
          errorCode: getErrorCode(error),
          indexId: config.id,
          provider: fresh.collection.provider,
        });
      }

      return {
        ...toIdentity(config),
        chart: {
          status: "success",
          data: fresh.collection.candles,
          provider: fresh.collection.provider,
          updatedAt: fresh.collection.observedAt,
        },
        quote: {
          status: "success",
          data: toQuoteData(fresh.collection.candles),
          provider: fresh.collection.provider,
          updatedAt: fresh.collection.observedAt,
        },
      };
    }

    let stored: StoredMarketIndexData | null = null;

    try {
      stored = await repository.read(config.id);
    } catch (error) {
      logger.error("Reading market fallback failed", {
        errorCode: getErrorCode(error),
        indexId: config.id,
      });
    }

    const currentTime = now();
    const reason = getErrorCode(fresh.error);
    const quoteTtlMs =
      config.category === "exchangeRate"
        ? exchangeFallbackTtlMs
        : fallbackTtlMs;
    const quote =
      stored?.quote &&
      isFallbackFresh(stored.quote.updatedAt, quoteTtlMs, currentTime)
        ? {
            status: "fallback" as const,
            data: toStoredQuoteData(stored.quote),
            provider: stored.quote.provider,
            reason,
            updatedAt: stored.quote.updatedAt.toISOString(),
          }
        : toErrorResult<MarketIndexQuoteData>(fresh.error);
    const chart =
      stored?.chart &&
      isFallbackFresh(stored.chart.updatedAt, fallbackTtlMs, currentTime)
        ? {
            status: "fallback" as const,
            data: stored.chart.candles,
            provider: stored.chart.provider,
            reason,
            updatedAt: stored.chart.updatedAt.toISOString(),
          }
        : toErrorResult<MarketIndexCandleData[]>(fresh.error);

    return {
      ...toIdentity(config),
      chart,
      quote,
    };
  }

  return {
    async getView(indexId: string) {
      const config = configs.find(({ id }) => id === indexId);

      return config ? getView(config) : null;
    },

    async getViews() {
      const settled = await Promise.allSettled(configs.map(getView));

      return settled.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        }

        return {
          ...toIdentity(configs[index]),
          chart: toErrorResult<MarketIndexCandleData[]>(result.reason),
          quote: toErrorResult<MarketIndexQuoteData>(result.reason),
        };
      });
    },
  };
}
