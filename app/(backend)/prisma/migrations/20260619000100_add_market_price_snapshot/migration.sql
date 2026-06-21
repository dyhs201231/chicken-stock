CREATE TABLE "Market_price_snapshot" (
    "id" BIGSERIAL NOT NULL,
    "instrument_type" VARCHAR(32) NOT NULL,
    "ticker" VARCHAR(255) NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "price" DECIMAL(20,4) NOT NULL,
    "volume" DECIMAL(30,4),
    "provider" VARCHAR(64) NOT NULL,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Market_price_snapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Market_price_snapshot_instrument_ticker_provider_timestamp_key"
ON "Market_price_snapshot"("instrument_type", "ticker", "provider", "timestamp");

CREATE INDEX "Market_price_snapshot_instrument_type_ticker_timestamp_idx"
ON "Market_price_snapshot"("instrument_type", "ticker", "timestamp");

CREATE INDEX "Market_price_snapshot_ticker_timestamp_idx"
ON "Market_price_snapshot"("ticker", "timestamp");
