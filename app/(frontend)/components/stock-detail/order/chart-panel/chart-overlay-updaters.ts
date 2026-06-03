import type { IChartApi, IRange, ISeriesApi, Time } from "lightweight-charts";

import {
  clampPosition,
  formatDayTickLabel,
  formatMonthTickLabel,
  formatTimeLabel,
  getChangeRate,
  getShortDateLabel,
  getSpacedAxisTickLabels,
} from "./chart-format";
import { PRICE_AXIS_TICK_COUNT } from "./constants";
import type {
  AxisTickLabel,
  CandleRange,
  ChartCandleData,
  HighLowLabel,
  PriceAxisTickLabel,
} from "./types";
import type { StockDetailData } from "../../../../types/stock/stock-detail";
import {
  formatNumber,
  formatPercent,
  formatPrice,
} from "../../../../utils/stock/stock-detail";

type OverlayUpdaterParams = {
  candleSeries: ISeriesApi<"Candlestick", Time>;
  chart: IChartApi;
  chartCandles: ChartCandleData[];
  chartContainer: HTMLDivElement;
  monthStartTimes: Set<string>;
  selectedRange: CandleRange;
  setAxisTickLabels: (labels: AxisTickLabel[]) => void;
  setCurrentPriceLabel: (
    label: { top: number; text: string } | null,
  ) => void;
  setHighLabelPosition: (label: HighLowLabel | null) => void;
  setLowLabelPosition: (label: HighLowLabel | null) => void;
  setPriceAxisTickLabels: (labels: PriceAxisTickLabel[]) => void;
  stock: StockDetailData;
};

function findHighLowCandles(candles: ChartCandleData[]) {
  return candles.reduce<{
    high: ChartCandleData | null;
    low: ChartCandleData | null;
  }>(
    (result, candle) => ({
      high:
        !result.high || candle.high > result.high.high ? candle : result.high,
      low: !result.low || candle.low < result.low.low ? candle : result.low,
    }),
    { high: null, low: null },
  );
}

function getVisibleCandles(
  candles: ChartCandleData[],
  range: IRange<Time> | null,
) {
  if (!range) {
    return candles;
  }

  const from = formatTimeLabel(range.from);
  const to = formatTimeLabel(range.to);

  return candles.filter((candle) => candle.time >= from && candle.time <= to);
}

function getHighLowChangeBase(candles: ChartCandleData[]) {
  return candles.at(0)?.close ?? 0;
}

export function createChartOverlayUpdaters({
  candleSeries,
  chart,
  chartCandles,
  chartContainer,
  monthStartTimes,
  selectedRange,
  setAxisTickLabels,
  setCurrentPriceLabel,
  setHighLabelPosition,
  setLowLabelPosition,
  setPriceAxisTickLabels,
  stock,
}: OverlayUpdaterParams) {
  const updateHighLowLabels = (
    range = chart.timeScale().getVisibleRange(),
  ) => {
    const containerWidth = chartContainer.clientWidth;
    const containerHeight = chartContainer.clientHeight;
    const visibleCandles = getVisibleCandles(chartCandles, range);
    const { high: highCandle, low: lowCandle } =
      findHighLowCandles(visibleCandles);
    const changeBase = getHighLowChangeBase(visibleCandles);

    if (!highCandle || !lowCandle || visibleCandles.length === 0) {
      setHighLabelPosition(null);
      setLowLabelPosition(null);
      return false;
    }

    const nextHighCoordinate = chart
      .timeScale()
      .timeToCoordinate(highCandle.time);
    const nextHighPrice = candleSeries.priceToCoordinate(highCandle.high);
    const nextLowCoordinate = chart.timeScale().timeToCoordinate(lowCandle.time);
    const nextLowPrice = candleSeries.priceToCoordinate(lowCandle.low);

    setHighLabelPosition(
      typeof nextHighCoordinate === "number" &&
        typeof nextHighPrice === "number"
        ? {
            left: clampPosition(
              nextHighCoordinate - 118,
              8,
              containerWidth - 250,
            ),
            top: clampPosition(nextHighPrice - 36, 8, containerHeight - 44),
            text: `${formatPrice(
              highCandle.high,
              stock.currencyCode,
            )} (${formatPercent(
              getChangeRate(highCandle.high, changeBase),
            )} ${getShortDateLabel(highCandle.time)})`,
          }
        : null,
    );
    setLowLabelPosition(
      typeof nextLowCoordinate === "number" &&
        typeof nextLowPrice === "number"
        ? {
            left: clampPosition(
              nextLowCoordinate - 44,
              8,
              containerWidth - 170,
            ),
            top: clampPosition(nextLowPrice + 6, 24, containerHeight - 72),
            text: `${formatPrice(lowCandle.low, stock.currencyCode)} (${formatPercent(
              getChangeRate(lowCandle.low, changeBase),
            )} ${getShortDateLabel(lowCandle.time)})`,
          }
        : null,
    );

    return (
      typeof nextHighCoordinate === "number" &&
      typeof nextHighPrice === "number" &&
      typeof nextLowCoordinate === "number" &&
      typeof nextLowPrice === "number"
    );
  };

  const updateAxisTickLabels = () => {
    const nextLabels = chartCandles
      .map((candle) => {
        const coordinate = chart.timeScale().timeToCoordinate(candle.time);

        if (typeof coordinate !== "number") {
          return null;
        }

        const isMonth =
          selectedRange === "monthly" || monthStartTimes.has(candle.time);

        return {
          isMonth,
          left: clampPosition(
            coordinate - 14,
            0,
            chartContainer.clientWidth - 36,
          ),
          text:
            selectedRange === "monthly" || isMonth
              ? formatMonthTickLabel(candle.time)
              : formatDayTickLabel(candle.time),
        };
      })
      .filter((label): label is AxisTickLabel => label !== null);

    setAxisTickLabels(getSpacedAxisTickLabels(nextLabels));
  };

  const updatePriceAxisTickLabels = () => {
    const visiblePrices = chartCandles.flatMap((candle) => [
      candle.high,
      candle.low,
    ]);
    const minPrice = Math.min(...visiblePrices);
    const maxPrice = Math.max(...visiblePrices);
    const priceStep = (maxPrice - minPrice) / (PRICE_AXIS_TICK_COUNT - 1);

    if (!Number.isFinite(priceStep) || priceStep <= 0) {
      setPriceAxisTickLabels([]);
      return;
    }

    const nextLabels = Array.from(
      { length: PRICE_AXIS_TICK_COUNT },
      (_, index) => maxPrice - priceStep * index,
    )
      .map((price) => {
        const coordinate = candleSeries.priceToCoordinate(price);

        if (typeof coordinate !== "number") {
          return null;
        }

        return {
          text: formatNumber(price),
          top: clampPosition(
            coordinate - 10,
            0,
            chartContainer.clientHeight - 48,
          ),
        };
      })
      .filter((label): label is PriceAxisTickLabel => label !== null);

    setPriceAxisTickLabels(nextLabels);
  };

  const updateCurrentPriceLabel = () => {
    const coordinate = candleSeries.priceToCoordinate(stock.currentPrice);

    setCurrentPriceLabel(
      typeof coordinate === "number"
        ? {
            top: clampPosition(
              coordinate - 14,
              0,
              chartContainer.clientHeight - 28,
            ),
            text: formatNumber(stock.currentPrice),
          }
        : null,
    );
  };

  return {
    updateAxisTickLabels,
    updateCurrentPriceLabel,
    updateHighLowLabels,
    updatePriceAxisTickLabels,
  };
}
