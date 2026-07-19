export type MarketApiConfig = {
  exchangeFallbackTtlMs: number;
  fallbackTtlMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  timeoutMs: number;
  totalBudgetMs: number;
};

type Environment = Record<string, string | undefined>;

const DEFAULT_CONFIG: MarketApiConfig = {
  exchangeFallbackTtlMs: 600_000,
  fallbackTtlMs: 3_600_000,
  maxRetries: 1,
  retryBaseDelayMs: 150,
  timeoutMs: 1_500,
  totalBudgetMs: 3_500,
};

function getBoundedInteger(
  value: string | undefined,
  fallback: number,
  maximum: number,
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

function getBoundedRetryCount(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return DEFAULT_CONFIG.maxRetries;
  }

  return Math.min(parsed, 2);
}

export function getMarketApiConfig(
  env: Environment = process.env,
): MarketApiConfig {
  return {
    exchangeFallbackTtlMs:
      getBoundedInteger(
        env.MARKET_EXCHANGE_RATE_FALLBACK_TTL_SECONDS,
        DEFAULT_CONFIG.exchangeFallbackTtlMs / 1_000,
        86_400,
      ) * 1_000,
    fallbackTtlMs:
      getBoundedInteger(
        env.MARKET_DATA_FALLBACK_TTL_SECONDS,
        DEFAULT_CONFIG.fallbackTtlMs / 1_000,
        86_400,
      ) * 1_000,
    maxRetries: getBoundedRetryCount(env.MARKET_API_MAX_RETRIES),
    retryBaseDelayMs: getBoundedInteger(
      env.MARKET_API_RETRY_BASE_DELAY_MS,
      DEFAULT_CONFIG.retryBaseDelayMs,
      5_000,
    ),
    timeoutMs: getBoundedInteger(
      env.MARKET_API_TIMEOUT_MS,
      DEFAULT_CONFIG.timeoutMs,
      30_000,
    ),
    totalBudgetMs: getBoundedInteger(
      env.MARKET_API_TOTAL_BUDGET_MS,
      DEFAULT_CONFIG.totalBudgetMs,
      30_000,
    ),
  };
}
