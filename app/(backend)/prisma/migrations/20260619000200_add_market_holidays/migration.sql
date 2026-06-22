CREATE TABLE IF NOT EXISTS "Market_holiday" (
    "id" BIGSERIAL NOT NULL,
    "country_code" VARCHAR(8) NOT NULL,
    "market_date" DATE NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT true,
    "open_time" VARCHAR(5),
    "close_time" VARCHAR(5),
    "reason" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_holiday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Market_holiday_country_code_market_date_key" ON "Market_holiday"("country_code", "market_date");

INSERT INTO "Market_holiday" ("country_code", "market_date", "is_closed", "open_time", "close_time", "reason", "updated_at")
VALUES
    ('KR', DATE '2026-01-01', true, NULL, NULL, 'New Year''s Day', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-02-16', true, NULL, NULL, 'Seollal Holiday', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-02-17', true, NULL, NULL, 'Seollal', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-02-18', true, NULL, NULL, 'Seollal Holiday', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-03-02', true, NULL, NULL, 'Independence Movement Day Observed', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-05-01', true, NULL, NULL, 'Labor Day', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-05-05', true, NULL, NULL, 'Children''s Day and Buddha''s Birthday', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-05-25', true, NULL, NULL, 'Election Day', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-06-03', true, NULL, NULL, 'Local Election Day', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-08-17', true, NULL, NULL, 'Liberation Day Observed', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-09-24', true, NULL, NULL, 'Chuseok Holiday', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-09-25', true, NULL, NULL, 'Chuseok', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-09-28', true, NULL, NULL, 'Chuseok Holiday Observed', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-10-05', true, NULL, NULL, 'National Foundation Day Observed', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-10-09', true, NULL, NULL, 'Hangeul Day', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-12-25', true, NULL, NULL, 'Christmas Day', CURRENT_TIMESTAMP),
    ('KR', DATE '2026-12-31', true, NULL, NULL, 'Year-end Market Holiday', CURRENT_TIMESTAMP),
    ('US', DATE '2026-01-01', true, NULL, NULL, 'New Year''s Day', CURRENT_TIMESTAMP),
    ('US', DATE '2026-01-19', true, NULL, NULL, 'Martin Luther King Jr. Day', CURRENT_TIMESTAMP),
    ('US', DATE '2026-02-16', true, NULL, NULL, 'Washington''s Birthday', CURRENT_TIMESTAMP),
    ('US', DATE '2026-04-03', true, NULL, NULL, 'Good Friday', CURRENT_TIMESTAMP),
    ('US', DATE '2026-05-25', true, NULL, NULL, 'Memorial Day', CURRENT_TIMESTAMP),
    ('US', DATE '2026-06-19', true, NULL, NULL, 'Juneteenth National Independence Day', CURRENT_TIMESTAMP),
    ('US', DATE '2026-07-03', true, NULL, NULL, 'Independence Day Observed', CURRENT_TIMESTAMP),
    ('US', DATE '2026-09-07', true, NULL, NULL, 'Labor Day', CURRENT_TIMESTAMP),
    ('US', DATE '2026-11-26', true, NULL, NULL, 'Thanksgiving Day', CURRENT_TIMESTAMP),
    ('US', DATE '2026-12-25', true, NULL, NULL, 'Christmas Day', CURRENT_TIMESTAMP),
    ('US', DATE '2026-11-27', false, '09:30', '13:00', 'Day After Thanksgiving Early Close', CURRENT_TIMESTAMP),
    ('US', DATE '2026-12-24', false, '09:30', '13:00', 'Christmas Eve Early Close', CURRENT_TIMESTAMP)
ON CONFLICT ("country_code", "market_date") DO UPDATE
SET
    "is_closed" = EXCLUDED."is_closed",
    "open_time" = EXCLUDED."open_time",
    "close_time" = EXCLUDED."close_time",
    "reason" = EXCLUDED."reason",
    "updated_at" = CURRENT_TIMESTAMP;
