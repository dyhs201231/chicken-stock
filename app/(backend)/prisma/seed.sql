WITH agent_seed AS (
  SELECT *
  FROM (
    VALUES
      ('agent-value@chicken-stock.local', '가치형 에이전트', 'VALUE'::"Agent_type", 10000000.00::numeric, 10000000.00::numeric, 0.40::numeric, 0.20::numeric, 0.20::numeric, 'LOW'::"Trade_frequency"),
      ('agent-growth@chicken-stock.local', '성장형 에이전트', 'GROWTH'::"Agent_type", 10000000.00::numeric, 10000000.00::numeric, 0.60::numeric, 0.25::numeric, 0.15::numeric, 'MEDIUM'::"Trade_frequency"),
      ('agent-momentum@chicken-stock.local', '모멘텀형 에이전트', 'MOMENTUM'::"Agent_type", 10000000.00::numeric, 10000000.00::numeric, 0.75::numeric, 0.30::numeric, 0.10::numeric, 'HIGH'::"Trade_frequency")
  ) AS seed(email, name, agent_type, initial_krw_cash, initial_usd_cash, risk_tolerance, max_position_ratio, cash_reserve_ratio, trade_frequency)
),
upserted_users AS (
  INSERT INTO "User" ("type", "name", "email", "created_at", "updated_at")
  SELECT 'AGENT'::"User_type", name, email, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM agent_seed
  ON CONFLICT ("email") DO UPDATE
  SET
    "type" = EXCLUDED."type",
    "name" = EXCLUDED."name",
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id", "email"
),
seed_users AS (
  SELECT user_row."id", agent_seed.*
  FROM agent_seed
  JOIN upserted_users user_row ON user_row."email" = agent_seed.email
),
upserted_portfolios AS (
  INSERT INTO "Portfolio" (
    "account_number",
    "user_id",
    "total_balance",
    "krw_balance",
    "usd_balance",
    "total_available_order_amount",
    "total_investment_amount",
    "domestic_stock_amount",
    "foreign_stock_amount",
    "created_at",
    "updated_at"
  )
  SELECT
    'AGENT-' || agent_type::text,
    "id",
    initial_krw_cash + initial_usd_cash,
    initial_krw_cash,
    initial_usd_cash,
    initial_krw_cash + initial_usd_cash,
    0,
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM seed_users
  ON CONFLICT ("user_id") DO UPDATE
  SET
    "account_number" = EXCLUDED."account_number",
    "total_balance" = EXCLUDED."total_balance",
    "krw_balance" = EXCLUDED."krw_balance",
    "usd_balance" = EXCLUDED."usd_balance",
    "total_available_order_amount" = EXCLUDED."total_available_order_amount",
    "total_investment_amount" = EXCLUDED."total_investment_amount",
    "domestic_stock_amount" = EXCLUDED."domestic_stock_amount",
    "foreign_stock_amount" = EXCLUDED."foreign_stock_amount",
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING "user_id"
)
INSERT INTO "Agent" (
  "user_id",
  "agent_type",
  "risk_tolerance",
  "max_position_ratio",
  "cash_reserve_ratio",
  "trade_frequency",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  "id",
  agent_type,
  risk_tolerance,
  max_position_ratio,
  cash_reserve_ratio,
  trade_frequency,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM seed_users
ON CONFLICT ("user_id") DO UPDATE
SET
  "agent_type" = EXCLUDED."agent_type",
  "risk_tolerance" = EXCLUDED."risk_tolerance",
  "max_position_ratio" = EXCLUDED."max_position_ratio",
  "cash_reserve_ratio" = EXCLUDED."cash_reserve_ratio",
  "trade_frequency" = EXCLUDED."trade_frequency",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

WITH agent_portfolios AS (
  SELECT "Portfolio"."id" AS portfolio_id
  FROM "Portfolio"
  JOIN "User" ON "User"."id" = "Portfolio"."user_id"
  WHERE "User"."email" IN (
    'agent-value@chicken-stock.local',
    'agent-growth@chicken-stock.local',
    'agent-momentum@chicken-stock.local'
  )
),
seed_stocks AS (
  SELECT
    "id",
    "name",
    "image_url",
    "country_code",
    "current_price"
  FROM "Stock"
  WHERE "market_status" = 'LISTED'
    AND "current_price" > 0
),
seed_items AS (
  SELECT
    agent_portfolios.portfolio_id,
    seed_stocks."id" AS stock_id,
    CASE
      WHEN seed_stocks."country_code" = 'KR' THEN 'DOMESTIC_STOCK'
      ELSE 'FOREIGN_STOCK'
    END AS asset_type,
    seed_stocks."name" AS company_name,
    seed_stocks."image_url" AS company_logo_url,
    20 AS quantity,
    seed_stocks."current_price" AS current_price
  FROM agent_portfolios
  CROSS JOIN seed_stocks
)
INSERT INTO "Portfolio_item" (
  "portfolio_id",
  "stock_id",
  "asset_type",
  "company_name",
  "company_logo_url",
  "quantity",
  "average_price",
  "current_price",
  "total_invested",
  "current_amount",
  "evaluation_amount",
  "profit",
  "profit_rate",
  "fee",
  "sale_tax",
  "created_at",
  "updated_at"
)
SELECT
  portfolio_id,
  stock_id,
  asset_type,
  company_name,
  company_logo_url,
  quantity,
  current_price,
  current_price,
  ROUND((current_price * quantity)::numeric, 2),
  ROUND((current_price * quantity)::numeric, 2),
  ROUND((current_price * quantity)::numeric, 2),
  0,
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM seed_items
ON CONFLICT ("portfolio_id", "stock_id") DO UPDATE
SET
  "asset_type" = EXCLUDED."asset_type",
  "company_name" = EXCLUDED."company_name",
  "company_logo_url" = EXCLUDED."company_logo_url",
  "quantity" = GREATEST("Portfolio_item"."quantity", EXCLUDED."quantity"),
  "average_price" = EXCLUDED."average_price",
  "current_price" = EXCLUDED."current_price",
  "total_invested" = ROUND((EXCLUDED."average_price" * GREATEST("Portfolio_item"."quantity", EXCLUDED."quantity"))::numeric, 2),
  "current_amount" = ROUND((EXCLUDED."current_price" * GREATEST("Portfolio_item"."quantity", EXCLUDED."quantity"))::numeric, 2),
  "evaluation_amount" = ROUND((EXCLUDED."current_price" * GREATEST("Portfolio_item"."quantity", EXCLUDED."quantity"))::numeric, 2),
  "profit" = ROUND(((EXCLUDED."current_price" - EXCLUDED."average_price") * GREATEST("Portfolio_item"."quantity", EXCLUDED."quantity"))::numeric, 2),
  "profit_rate" = 0,
  "updated_at" = CURRENT_TIMESTAMP;

WITH agent_portfolios AS (
  SELECT "Portfolio"."id"
  FROM "Portfolio"
  JOIN "User" ON "User"."id" = "Portfolio"."user_id"
  WHERE "User"."email" IN (
    'agent-value@chicken-stock.local',
    'agent-growth@chicken-stock.local',
    'agent-momentum@chicken-stock.local'
  )
),
portfolio_amounts AS (
  SELECT
    "Portfolio_item"."portfolio_id",
    COALESCE(
      SUM("Portfolio_item"."total_invested") FILTER (WHERE "Portfolio_item"."asset_type" = 'DOMESTIC_STOCK'),
      0
    ) AS domestic_stock_amount,
    COALESCE(
      SUM("Portfolio_item"."total_invested") FILTER (WHERE "Portfolio_item"."asset_type" = 'FOREIGN_STOCK'),
      0
    ) AS foreign_stock_amount,
    COALESCE(SUM("Portfolio_item"."total_invested"), 0) AS total_investment_amount
  FROM "Portfolio_item"
  JOIN agent_portfolios ON agent_portfolios."id" = "Portfolio_item"."portfolio_id"
  GROUP BY "Portfolio_item"."portfolio_id"
)
UPDATE "Portfolio"
SET
  "domestic_stock_amount" = portfolio_amounts.domestic_stock_amount,
  "foreign_stock_amount" = portfolio_amounts.foreign_stock_amount,
  "total_investment_amount" = portfolio_amounts.total_investment_amount,
  "total_available_order_amount" = "Portfolio"."krw_balance" + "Portfolio"."usd_balance",
  "total_balance" = "Portfolio"."krw_balance" + "Portfolio"."usd_balance" + portfolio_amounts.total_investment_amount,
  "updated_at" = CURRENT_TIMESTAMP
FROM portfolio_amounts
WHERE "Portfolio"."id" = portfolio_amounts.portfolio_id;
