export type StockMarket = "domestic" | "global";

export type StockMarketFilter = "all" | StockMarket;

export type StockRankingKey = "tradingAmount" | "tradingVolume";

export type StockRankingPeriod =
  | "live"
  | "1d"
  | "1w"
  | "1m"
  | "3m"
  | "6m"
  | "1y";

export type StockTrend = "up" | "down";

export type StockData = {
  id: number;
  rank: number;
  name: string;
  price: string;
  changeRate: string;
  tradingAmount: string;
  tradingVolume: string;
  rankingValue: string;
  market: StockMarket;
  trend: StockTrend;
  logoLabel: string;
  logoUrl?: string;
};
