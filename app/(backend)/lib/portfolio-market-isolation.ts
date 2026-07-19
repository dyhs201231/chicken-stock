import type {
  MarketDataResult,
  MarketIndexQuoteData,
} from "../../(frontend)/types/market-index";

export function resolvePortfolioExchangeRate(
  result: MarketDataResult<MarketIndexQuoteData>,
): {
  exchangeRate: MarketDataResult<number>;
  rate: number | null;
} {
  if (result.status === "error") {
    return {
      exchangeRate: result,
      rate: null,
    };
  }

  return {
    exchangeRate: {
      ...result,
      data: result.data.currentValue,
    },
    rate: result.data.currentValue,
  };
}
