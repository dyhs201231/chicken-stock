export type StockMarket = "domestic" | "global";

export type StockTrend = "up" | "down";

export type StockData = {
  rank: number;
  name: string;
  price: string;
  changeRate: string;
  tradingAmount: string;
  market: StockMarket;
  trend: StockTrend;
  logoLabel: string;
  logoClassName: string;
};
