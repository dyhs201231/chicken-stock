import { requests } from "../request";
import type { StockData } from "../../components/main/stock_list/types";
import type { ChartCandleData } from "../../components/stock-detail/order/chart-panel/types";
import type { StockOrderBookSnapshotData } from "../../types/stock/stock-detail";

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

type StockOrderBookResponse =
  | {
      ok: true;
      data: {
        orderBookSnapshot: StockOrderBookSnapshotData | null;
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

export async function fetchStockOrderBook(stockId: number) {
  const { data } = await requests.get<StockOrderBookResponse>(
    `/api/stocks/${stockId}/order-book`,
  );

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data.orderBookSnapshot;
}
