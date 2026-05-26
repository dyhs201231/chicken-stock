export type StockDetailTab = "chart-orderbook" | "portfolio-info";

export type StockOnlyProps = {
  stock: StockDetailData;
};

export type StockCandleData = {
  timestamp: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
};

export type StockOrderBookLevelData = {
  side: "ASK" | "BID";
  levelRank: number;
  price: number;
  quantity: number;
};

export type StockOrderBookSnapshotData = {
  totalAskSize: number;
  totalBidSize: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  executionStrength: number;
  levels: StockOrderBookLevelData[];
};

export type StockDetailData = {
  id: number;
  ticker: string;
  name: string;
  imageUrl: string | null;
  sector: string;
  riskLevel: string;
  theme: string;
  countryCode: string;
  currencyCode: "KRW" | "USD";
  currentPrice: number;
  previousClose: number;
  changeAmount: number;
  changeRate: number;
  dayHigh: number;
  dayLow: number;
  high52w: number;
  low52w: number;
  volume: number;
  tradingValue: number;
  marketCap: number;
  per: number;
  eps: number;
  marketStatus: string;
  debtRatio: number;
  currentRatio: number;
  interestCoverageRatio: number;
  announcementDate: string;
  estimatedOperatingProfit: string;
  estimatedRevenue: number;
  dividendCount: number;
  dividendPerShare: number;
  dividendYield: number;
  candles: StockCandleData[];
  orderBookSnapshot: StockOrderBookSnapshotData | null;
};
