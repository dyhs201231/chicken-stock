import { requests } from "../request";
import type {
  MarketIndexCandleData,
  MarketIndexCandleInterval,
  MarketIndexSummaryData,
  MarketIndexDetailData,
} from "../../types/market-index";

type MarketIndicesResponse =
  | {
      ok: true;
      data: {
        indices: MarketIndexSummaryData[];
      };
    }
  | {
      ok: false;
      error: string;
    };

type MarketIndexCandlesResponse =
  | {
      ok: true;
      data: {
        interval: MarketIndexCandleInterval;
        candles: MarketIndexCandleData[];
      };
    }
  | {
      ok: false;
      error: string;
    };

type ExchangeRateResponse =
  | {
      ok: true;
      data: {
        exchangeRate: MarketIndexDetailData;
      };
    }
  | {
      ok: false;
      error: string;
    };

type FetchMarketIndicesOptions = {
  refresh?: boolean;
};

export async function fetchMarketIndices(options?: FetchMarketIndicesOptions) {
  const { data } = await requests.get<MarketIndicesResponse>("/api/indices", {
    params: {
      ...(options?.refresh ? { refresh: "true" } : {}),
    },
  });

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data.indices;
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

  return data.data.candles;
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
