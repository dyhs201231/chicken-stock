import {
  MarketApiError,
  isMarketApiError,
  isRetryableMarketApiError,
} from "./errors.ts";

type RequestMarketJsonOptions = {
  fetchImpl?: typeof fetch;
  headers?: HeadersInit;
  maxRetries?: number;
  now?: () => number;
  random?: () => number;
  retryBaseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  totalBudgetMs?: number;
};

const RETRYABLE_HTTP_STATUSES = new Set([429, 502, 503, 504]);

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function isRetryableHttpStatus(status: number) {
  return RETRYABLE_HTTP_STATUSES.has(status);
}

function toRequestError(error: unknown, didTimeout: boolean) {
  if (isMarketApiError(error)) {
    return error;
  }

  if (didTimeout) {
    return new MarketApiError(
      "MARKET_API_TIMEOUT",
      "External market API request timed out",
      { cause: error, retryable: true },
    );
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new MarketApiError(
      "MARKET_API_TIMEOUT",
      "External market API request was aborted",
      { cause: error, retryable: true },
    );
  }

  return new MarketApiError(
    "MARKET_API_NETWORK",
    "External market API network request failed",
    { cause: error, retryable: true },
  );
}

export async function requestMarketJson(
  url: string | URL,
  {
    fetchImpl = fetch,
    headers,
    maxRetries = 1,
    now = () => performance.now(),
    random = Math.random,
    retryBaseDelayMs = 150,
    sleep = defaultSleep,
    timeoutMs = 1_500,
    totalBudgetMs = 3_500,
  }: RequestMarketJsonOptions = {},
): Promise<unknown> {
  const startedAt = now();

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const remainingBudgetMs = totalBudgetMs - (now() - startedAt);

    if (remainingBudgetMs <= 0) {
      throw new MarketApiError(
        "MARKET_API_BUDGET_EXCEEDED",
        "External market API request budget was exceeded",
      );
    }

    const controller = new AbortController();
    let didTimeout = false;
    const attemptTimeoutMs = Math.max(
      1,
      Math.min(timeoutMs, remainingBudgetMs),
    );
    const timeout = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, attemptTimeoutMs);

    try {
      const response = await fetchImpl(url, {
        cache: "no-store",
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new MarketApiError(
          "MARKET_API_HTTP",
          `External market API returned HTTP ${response.status}`,
          {
            retryable: isRetryableHttpStatus(response.status),
            status: response.status,
          },
        );
      }

      try {
        return await response.json();
      } catch (error) {
        throw new MarketApiError(
          "MARKET_API_PARSE",
          "External market API returned invalid JSON",
          { cause: error },
        );
      }
    } catch (error) {
      const requestError = toRequestError(error, didTimeout);
      const canRetry =
        attempt < maxRetries && isRetryableMarketApiError(requestError);

      if (!canRetry) {
        throw requestError;
      }

      const remainingAfterAttempt = totalBudgetMs - (now() - startedAt);
      const exponentialDelay = retryBaseDelayMs * 2 ** attempt;
      const jitter = random() * retryBaseDelayMs;
      const delayMs = Math.min(
        exponentialDelay + jitter,
        Math.max(remainingAfterAttempt, 0),
      );

      if (delayMs <= 0) {
        throw new MarketApiError(
          "MARKET_API_BUDGET_EXCEEDED",
          "External market API request budget was exceeded",
          { cause: requestError },
        );
      }

      await sleep(delayMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new MarketApiError(
    "MARKET_API_BUDGET_EXCEEDED",
    "External market API request budget was exceeded",
  );
}
