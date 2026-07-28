import type { StocksRankingData } from "../apis/stocks/api";
import type { MarketIndexViewData } from "../types/market-index";

type HomeInitialDataLoaders = {
  loadMarketIndices: () => Promise<MarketIndexViewData[]>;
  loadStocksRanking: () => Promise<StocksRankingData>;
};

export async function loadHomeInitialData({
  loadMarketIndices,
  loadStocksRanking,
}: HomeInitialDataLoaders) {
  const [initialIndices, initialStocksRanking] = await Promise.all([
    loadMarketIndices(),
    Promise.resolve()
      .then(loadStocksRanking)
      .catch(() => undefined),
  ]);

  return {
    initialIndices,
    initialStocksRanking,
  };
}
