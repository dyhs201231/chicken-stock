export type MarketIndexCategory = "stockIndex" | "exchangeRate";
export type MarketIndexTrend = "up" | "down" | "flat";
export type MarketIndexCurrencyCode = "KRW" | "USD";
export type MarketIndexCandleInterval = "DAY" | "WEEK" | "MONTH";

export type MarketIndexCandleData = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketIndexSummaryData = {
  id: string;
  ticker: string;
  name: string;
  category: MarketIndexCategory;
  indexType: string;
  countryCode: string;
  currencyCode: MarketIndexCurrencyCode;
  currentValue: number;
  previousClose: number;
  changeAmount: number;
  changeRate: number;
  trend: MarketIndexTrend;
  isRealtime: boolean;
  provider: string;
  updatedAt: string;
  candles: MarketIndexCandleData[];
};

export type MarketIndexDetailData = MarketIndexSummaryData & {
  openValue: number;
  dayHigh: number;
  dayLow: number;
  high52w: number;
  low52w: number;
  volume: number;
};
