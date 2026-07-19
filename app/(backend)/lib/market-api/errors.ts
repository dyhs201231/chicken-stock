export type MarketApiErrorCode =
  | "MARKET_API_BUDGET_EXCEEDED"
  | "MARKET_API_HTTP"
  | "MARKET_API_NETWORK"
  | "MARKET_API_PARSE"
  | "MARKET_API_TIMEOUT"
  | "MARKET_API_VALIDATION";

type MarketApiErrorOptions = {
  cause?: unknown;
  retryable?: boolean;
  status?: number;
};

export class MarketApiError extends Error {
  readonly code: MarketApiErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    code: MarketApiErrorCode,
    message: string,
    { cause, retryable = false, status }: MarketApiErrorOptions = {},
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "MarketApiError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export function isMarketApiError(error: unknown): error is MarketApiError {
  return error instanceof MarketApiError;
}

export function isRetryableMarketApiError(error: unknown) {
  return isMarketApiError(error) && error.retryable;
}
