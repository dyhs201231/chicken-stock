import type { CandlestickData, Time } from "lightweight-charts";

export type CandleRange = "daily" | "weekly" | "monthly";

export type StockCandleRawData = {
  ticker?: string;
  interval_code?: string;
  timestamp: number;
  open_price: string | number;
  high_price: string | number;
  low_price: string | number;
  close_price: string | number;
  volume?: string | number;
};

export type StockCandleSourceData = {
  timestamp: number;
  openPrice: number | string;
  highPrice: number | string;
  lowPrice: number | string;
  closePrice: number | string;
  volume?: number | string;
};

export type ChartCandleData = CandlestickData<Time> & {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type LabelPosition = {
  left: number;
  top: number;
};

export type HighLowLabel = LabelPosition & {
  text: string;
};

export type CrosshairDateLabel = {
  left: number;
  text: string;
};

export type CrosshairPriceLabel = {
  top: number;
  text: string;
};

export type CurrentPriceLabel = {
  top: number;
  text: string;
};

export type AxisTickLabel = {
  isMonth: boolean;
  left: number;
  text: string;
};

export type PriceAxisTickLabel = {
  text: string;
  top: number;
};

export type OhlcItem = {
  label: string;
  rate: number;
  value: number;
};
