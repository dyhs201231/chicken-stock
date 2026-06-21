import "server-only";

import { prisma } from "./prisma";
import type { CollectedMarketIndexCandles } from "./market-data-collector";

export type MarketPriceInstrumentType = "MARKET_INDEX" | "STOCK";

type MarketPriceSnapshotInput = {
  instrumentType: MarketPriceInstrumentType;
  observedAt?: Date;
  price: number;
  provider: string;
  ticker: string;
  volume?: number | null;
};

export const MARKET_PRICE_SNAPSHOT_BUCKET_MS = 60_000;

function getSnapshotTimestamp(observedAt: Date) {
  return (
    Math.floor(observedAt.getTime() / MARKET_PRICE_SNAPSHOT_BUCKET_MS) *
    MARKET_PRICE_SNAPSHOT_BUCKET_MS
  );
}

function isFinitePrice(value: number) {
  return Number.isFinite(value) && value > 0;
}

function normalizeVolume(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(value, 0);
}

export async function saveMarketPriceSnapshot({
  instrumentType,
  observedAt = new Date(),
  price,
  provider,
  ticker,
  volume,
}: MarketPriceSnapshotInput) {
  if (!ticker || !provider || !isFinitePrice(price)) {
    return null;
  }

  const snapshotTimestamp = getSnapshotTimestamp(observedAt);
  const normalizedVolume = normalizeVolume(volume);

  await prisma.$executeRaw`
    INSERT INTO "Market_price_snapshot" (
      "instrument_type",
      "ticker",
      "timestamp",
      "price",
      "volume",
      "provider",
      "observed_at",
      "created_at",
      "updated_at"
    )
    VALUES (
      ${instrumentType},
      ${ticker},
      ${snapshotTimestamp},
      ${price},
      ${normalizedVolume},
      ${provider},
      ${observedAt},
      NOW(),
      NOW()
    )
    ON CONFLICT ("instrument_type", "ticker", "provider", "timestamp")
    DO UPDATE SET
      "price" = EXCLUDED."price",
      "volume" = EXCLUDED."volume",
      "observed_at" = EXCLUDED."observed_at",
      "updated_at" = NOW()
  `;

  return {
    instrumentType,
    observedAt,
    price,
    provider,
    ticker,
    timestamp: snapshotTimestamp,
    volume: normalizedVolume,
  };
}

export async function saveCollectedMarketIndexSnapshots(
  collections: CollectedMarketIndexCandles[],
) {
  const savedSnapshots = await Promise.all(
    collections.map((collection) => {
      const latestCandle = collection.candles.at(-1);

      if (!latestCandle) {
        return null;
      }

      return saveMarketPriceSnapshot({
        instrumentType: "MARKET_INDEX",
        price: latestCandle.close,
        provider: collection.provider,
        ticker: collection.config.ticker,
        volume: latestCandle.volume,
      });
    }),
  );

  return savedSnapshots.filter((snapshot) => snapshot !== null);
}
