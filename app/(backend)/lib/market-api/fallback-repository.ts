import type { PrismaClient } from "../../generated/prisma/client";
import {
  MARKET_INDEX_CONFIGS,
  getMarketIndexConfig,
  type CollectedMarketIndexCandles,
} from "../market-data-collector.ts";
import type { MarketIndexCandleData } from "../../../(frontend)/types/market-index";
import { MarketApiError } from "./errors.ts";

const MARKET_PRICE_SNAPSHOT_BUCKET_MS = 60_000;

type DecimalLike = {
  toNumber: () => number;
};

export type StoredMarketIndexData = {
  chart: {
    candles: MarketIndexCandleData[];
    provider: string;
    updatedAt: Date;
  } | null;
  quote: {
    changeAmount: number;
    changeRate: number;
    currentValue: number;
    previousClose: number;
    provider: string;
    updatedAt: Date;
    volume: number;
  } | null;
};

export type MarketFallbackRepository = {
  read(indexId: string): Promise<StoredMarketIndexData | null>;
  saveFresh(collection: CollectedMarketIndexCandles): Promise<void>;
};

function toNumber(value: DecimalLike) {
  return value.toNumber();
}

function getTimestamp(dateKey: string) {
  return BigInt(new Date(`${dateKey}T00:00:00.000Z`).getTime());
}

function getSnapshotTimestamp(observedAt: Date) {
  return (
    Math.floor(observedAt.getTime() / MARKET_PRICE_SNAPSHOT_BUCKET_MS) *
    MARKET_PRICE_SNAPSHOT_BUCKET_MS
  );
}

function getDatabaseId(indexId: string) {
  const index = MARKET_INDEX_CONFIGS.findIndex(
    (config) => config.id === indexId,
  );

  if (index < 0) {
    throw new MarketApiError(
      "MARKET_API_VALIDATION",
      "Unknown market index cannot be stored",
    );
  }

  return index + 1;
}

function getChangeRate(currentValue: number, previousClose: number) {
  if (previousClose <= 0) {
    return 0;
  }

  return ((currentValue - previousClose) / previousClose) * 100;
}

function isFiniteCandle(candle: MarketIndexCandleData) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(candle.time) &&
    [candle.open, candle.high, candle.low, candle.close, candle.volume].every(
      Number.isFinite,
    ) &&
    candle.open > 0 &&
    candle.high >= Math.max(candle.open, candle.close) &&
    candle.low > 0 &&
    candle.low <= Math.min(candle.open, candle.close) &&
    candle.close > 0 &&
    candle.volume >= 0
  );
}

export function isFallbackFresh(updatedAt: Date, ttlMs: number, now: Date) {
  const ageMs = now.getTime() - updatedAt.getTime();

  return (
    Number.isFinite(ageMs) &&
    Number.isFinite(ttlMs) &&
    ttlMs > 0 &&
    ageMs >= 0 &&
    ageMs < ttlMs
  );
}

export function limitStoredCandles(
  candles: MarketIndexCandleData[],
  observedAt: Date,
) {
  if (!Number.isFinite(observedAt.getTime())) {
    throw new MarketApiError(
      "MARKET_API_VALIDATION",
      "Market observation time is invalid",
    );
  }

  const cutoff = new Date(observedAt);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const observedDateKey = observedAt.toISOString().slice(0, 10);
  const byDate = new Map<string, MarketIndexCandleData>();

  candles.forEach((candle) => {
    if (
      !isFiniteCandle(candle) ||
      candle.time < cutoffKey ||
      candle.time > observedDateKey
    ) {
      throw new MarketApiError(
        "MARKET_API_VALIDATION",
        "Invalid market candle cannot be stored",
      );
    }

    byDate.set(candle.time, candle);
  });

  return [...byDate.values()]
    .sort((left, right) => left.time.localeCompare(right.time))
    .slice(-260);
}

export function createMarketFallbackRepository(
  client: PrismaClient,
): MarketFallbackRepository {
  return {
    async read(indexId) {
      const config = getMarketIndexConfig(indexId);

      if (!config) {
        return null;
      }

      const [marketIndex, snapshot] = await Promise.all([
        client.marketIndex.findUnique({
          include: {
            candles: {
              orderBy: { timestamp: "desc" },
              take: 260,
              where: { intervalCode: "1D" },
            },
          },
          where: { ticker: config.ticker },
        }),
        client.marketPriceSnapshot.findFirst({
          orderBy: { observedAt: "desc" },
          where: {
            instrumentType: "MARKET_INDEX",
            ticker: config.ticker,
          },
        }),
      ]);

      if (!marketIndex && !snapshot) {
        return null;
      }

      const candles = (marketIndex?.candles ?? [])
        .map((candle) => ({
          close: toNumber(candle.closeValue),
          high: toNumber(candle.highValue),
          low: toNumber(candle.lowValue),
          open: toNumber(candle.openValue),
          time: new Date(Number(candle.timestamp)).toISOString().slice(0, 10),
          volume: candle.volume ? toNumber(candle.volume) : 0,
        }))
        .filter(isFiniteCandle)
        .sort((left, right) => left.time.localeCompare(right.time));
      const marketIndexQuote = marketIndex
        ? {
            currentValue: toNumber(marketIndex.currentValue),
            previousClose: toNumber(marketIndex.previousClose),
          }
        : null;
      const matchingSnapshot =
        marketIndex &&
        snapshot &&
        snapshot.observedAt.getTime() === marketIndex.updatedAt.getTime() &&
        snapshot.provider === marketIndex.provider &&
        toNumber(snapshot.price) === marketIndexQuote?.currentValue
          ? snapshot
          : null;
      const quoteVolume = matchingSnapshot?.volume
        ? toNumber(matchingSnapshot.volume)
        : (candles.at(-1)?.volume ?? 0);
      const quoteIsValid =
        marketIndexQuote !== null &&
        Number.isFinite(marketIndexQuote.currentValue) &&
        marketIndexQuote.currentValue > 0 &&
        Number.isFinite(marketIndexQuote.previousClose) &&
        marketIndexQuote.previousClose > 0 &&
        Number.isFinite(quoteVolume) &&
        quoteVolume >= 0 &&
        Number.isFinite(marketIndex?.updatedAt.getTime()) &&
        Boolean(marketIndex?.provider);
      const changeAmount = marketIndexQuote
        ? marketIndexQuote.currentValue - marketIndexQuote.previousClose
        : 0;

      return {
        chart:
          marketIndex && candles.length > 0
            ? {
                candles,
                provider: marketIndex.provider,
                updatedAt: marketIndex.updatedAt,
              }
            : null,
        quote:
          marketIndex && marketIndexQuote && quoteIsValid
            ? {
                changeAmount,
                changeRate: getChangeRate(
                  marketIndexQuote.currentValue,
                  marketIndexQuote.previousClose,
                ),
                currentValue: marketIndexQuote.currentValue,
                previousClose: marketIndexQuote.previousClose,
                provider: marketIndex.provider,
                updatedAt: marketIndex.updatedAt,
                volume: quoteVolume,
              }
            : null,
      };
    },

    async saveFresh(collection) {
      const observedAt = new Date(collection.observedAt);
      const candles = limitStoredCandles(collection.candles, observedAt);
      const latestCandle = candles.at(-1);
      const previousCandle = candles.at(-2);

      if (!latestCandle) {
        throw new MarketApiError(
          "MARKET_API_VALIDATION",
          "Empty market candle collection cannot be stored",
        );
      }

      const previousClose = previousCandle?.close ?? latestCandle.open;
      const changeAmount = latestCandle.close - previousClose;
      const changeRate = getChangeRate(latestCandle.close, previousClose);
      const databaseId = getDatabaseId(collection.config.id);
      const snapshotTimestamp = getSnapshotTimestamp(observedAt);

      await client.$transaction(async (tx) => {
        await tx.marketIndex.upsert({
          create: {
            buyPrice: latestCandle.close,
            changeAmount,
            changeRate,
            countryCode: collection.config.countryCode,
            currencyCode:
              collection.config.currencyCode === "USD" ? "USD" : "KRW",
            currentValue: latestCandle.close,
            id: databaseId,
            indexType: collection.config.indexType,
            isRealtime: false,
            name: collection.config.name,
            previousClose,
            provider: collection.provider,
            sellPrice: latestCandle.close,
            ticker: collection.config.ticker,
            updatedAt: observedAt,
          },
          update: {
            buyPrice: latestCandle.close,
            changeAmount,
            changeRate,
            currentValue: latestCandle.close,
            previousClose,
            provider: collection.provider,
            sellPrice: latestCandle.close,
            updatedAt: observedAt,
          },
          where: { ticker: collection.config.ticker },
        });

        await tx.marketPriceSnapshot.upsert({
          create: {
            instrumentType: "MARKET_INDEX",
            observedAt,
            price: latestCandle.close,
            provider: collection.provider,
            ticker: collection.config.ticker,
            timestamp: snapshotTimestamp,
            volume: latestCandle.volume,
          },
          update: {
            observedAt,
            price: latestCandle.close,
            volume: latestCandle.volume,
          },
          where: {
            instrumentType_ticker_provider_timestamp: {
              instrumentType: "MARKET_INDEX",
              provider: collection.provider,
              ticker: collection.config.ticker,
              timestamp: snapshotTimestamp,
            },
          },
        });

        await tx.marketIndexCandle.deleteMany({
          where: {
            intervalCode: "1D",
            ticker: collection.config.ticker,
          },
        });

        await tx.marketIndexCandle.createMany({
          data: candles.map((candle) => ({
            closeValue: candle.close,
            highValue: candle.high,
            intervalCode: "1D",
            lowValue: candle.low,
            openValue: candle.open,
            ticker: collection.config.ticker,
            timestamp: getTimestamp(candle.time),
            volume: candle.volume,
          })),
        });
      });
    },
  };
}
