import { requests } from "../request";
import type {
  MarketIndexCandleInterval,
  MarketIndexViewData,
} from "../../types/market-index";
import {
  toMarketIndexCandleResult,
  type MarketIndexCandlePayload,
} from "./chart-state";

type MarketIndicesResponse =
  | {
      ok: true;
      data: {
        results: MarketIndexViewData[];
      };
    }
  | {
      ok: false;
      error: string;
    };

type MarketIndexCandlesResponse =
  | {
      ok: true;
      data: MarketIndexCandlePayload;
    }
  | {
      ok: false;
      error: string;
    };

export type ExchangeRateQuote = {
  expiresAt: string;
  observedAt: string;
  rate: number;
  token: string;
};

type ExchangeRateResponse =
  | {
      ok: true;
      data: {
        exchangeRate: ExchangeRateQuote;
      };
    }
  | {
      ok: false;
      error: string;
    };

export async function fetchMarketIndices() {
  const { data } = await requests.get<MarketIndicesResponse>("/api/indices");

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data.results;
}

export async function fetchMarketIndexCandles(
  indexId: string,
  interval: MarketIndexCandleInterval,
) {
  const { data } = await requests.get<MarketIndexCandlesResponse>(
    `/api/indices/${indexId}/candles`,
    {
      params: {
        interval,
      },
    },
  );

  if (!data.ok) {
    throw new Error(data.error);
  }

  return toMarketIndexCandleResult(data.data);
}

export async function fetchUsdKrwExchangeRate() {
  const { data } = await requests.get<ExchangeRateResponse>(
    "/api/indices/exchange-rate",
  );

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data.exchangeRate;
}
