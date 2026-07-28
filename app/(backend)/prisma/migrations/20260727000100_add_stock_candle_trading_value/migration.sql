-- COORDINATED CUTOVER REQUIRED (no rolling writer overlap):
-- 1. Pause every order and candle writer.
-- 2. Apply this migration.
-- 3. Deploy and verify the application version that always writes trading_value.
-- 4. Resume writers only after verification succeeds.
--
-- The DEFAULT below exists only to backfill existing rows within this migration
-- and is intentionally removed before completion. Do not add a compatibility
-- trigger or retain the default. Operator runbook:
-- docs/operations/stock-candle-trading-value-cutover.md

ALTER TABLE "Stock_candle"
  ADD COLUMN "trading_value" DECIMAL(30, 2) NOT NULL DEFAULT 0;

UPDATE "Stock_candle"
SET "trading_value" = ROUND(
  (
    (
      "open_price" +
      "high_price" +
      "low_price" +
      "close_price"
    ) / 4
  ) * "volume",
  2
);

ALTER TABLE "Stock_candle"
  ALTER COLUMN "trading_value" DROP DEFAULT;
