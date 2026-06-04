import { requests } from "../request";
import type { StockData } from "../../components/main/stock_list/types";
import type { ChartCandleData } from "../../components/stock-detail/order/chart-panel/types";

export const STOCKS_PAGE_SIZE = 10;

export type StockCandleInterval = "DAY" | "WEEK" | "MONTH";

export type StocksPage = {
  stocks: StockData[];
  nextPage: number | null;
};

type StocksResponse =
  | {
      ok: true;
      data: StocksPage;
    }
  | {
      ok: false;
      error: string;
    };

type StockCandlesResponse =
  | {
      ok: true;
      data: {
        interval: StockCandleInterval;
        candles: ChartCandleData[];
      };
    }
  | {
      ok: false;
      error: string;
    };

export async function fetchStocks(
  market: string,
  ranking: string,
  page: number,
) {
  const { data } = await requests.get<StocksResponse>("/api/stocks", {
    params: {
      market,
      ranking,
      market_status: "LISTED",
      page,
      limit: STOCKS_PAGE_SIZE,
    },
  });

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function fetchStockCandles(
  stockId: number,
  interval: StockCandleInterval,
) {
  const { data } = await requests.get<StockCandlesResponse>(
    `/api/stocks/${stockId}/candles`,
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
