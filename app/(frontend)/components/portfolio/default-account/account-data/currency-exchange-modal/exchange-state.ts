import type { ExchangeRateQuote } from "../../../../../apis/market-indices/api";

type ExchangeQueryState = {
  data?: ExchangeRateQuote;
  isError?: boolean;
  isLoading?: boolean;
};

type ExchangeViewState =
  | { canContinue: false; rate: null; token: null }
  | { canContinue: true; rate: number; token: string };

export function getExchangeViewState({
  data,
  isError = false,
  isLoading = false,
}: ExchangeQueryState): ExchangeViewState {
  if (isLoading || isError || !data) {
    return {
      canContinue: false,
      rate: null,
      token: null,
    };
  }

  return {
    canContinue: true,
    rate: data.rate,
    token: data.token,
  };
}
