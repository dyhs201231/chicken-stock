import type { IChartApi, IRange, ISeriesApi, Time } from "lightweight-charts";
import {
  clampPosition,
  formatDayTickLabel,
  formatMonthTickLabel,
  formatTimeLabel,
  formatWeeklyTickLabel,
  getChangeRate,
  getShortDateLabel,
  getSpacedAxisTickLabels,
} from "../../stock-detail/order/chart-panel/chart-format";
import { PRICE_AXIS_TICK_COUNT } from "../../stock-detail/order/chart-panel/constants";
import type {
  AxisTickLabel,
  CandleRange,
  ChartCandleData,
  HighLowLabel,
  PriceAxisTickLabel,
} from "../../stock-detail/order/chart-panel/types";
import type { MarketIndexDetailData } from "../../../types/market-index";
import {
  formatMarketIndexPercent,
  formatMarketIndexValue,
} from "../../../utils/market-index";

type OverlayUpdaterParams = {
  candleSeries: ISeriesApi<"Candlestick", Time>;
  chart: IChartApi;
  chartCandles: ChartCandleData[];
  chartContainer: HTMLDivElement;
  marketIndex: MarketIndexDetailData;
  monthStartTimes: Set<string>;
  selectedRange: CandleRange;
  setAxisTickLabels: (labels: AxisTickLabel[]) => void;
  setCurrentPriceLabel: (
    label: { top: number; text: string } | null,
  ) => void;
  setHighLabelPosition: (label: HighLowLabel | null) => void;
  setLowLabelPosition: (label: HighLowLabel | null) => void;
  setPriceAxisTickLabels: (labels: PriceAxisTickLabel[]) => void;
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

export function createMarketIndexChartOverlayUpdaters({
  candleSeries,
  chart,
  chartCandles,
  chartContainer,
  marketIndex,
  monthStartTimes,
  selectedRange,
  setAxisTickLabels,
  setCurrentPriceLabel,
  setHighLabelPosition,
  setLowLabelPosition,
  setPriceAxisTickLabels,
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
            text: `${formatMarketIndexValue(
              highCandle.high,
            )} (${formatMarketIndexPercent(
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
            text: `${formatMarketIndexValue(
              lowCandle.low,
            )} (${formatMarketIndexPercent(
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
          selectedRange !== "weekly" &&
          (selectedRange === "monthly" || monthStartTimes.has(candle.time));

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
              : selectedRange === "weekly"
                ? formatWeeklyTickLabel(candle.time)
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
          text: formatMarketIndexValue(price),
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
    const coordinate = candleSeries.priceToCoordinate(
      marketIndex.currentValue,
    );

    setCurrentPriceLabel(
      typeof coordinate === "number"
        ? {
            top: clampPosition(
              coordinate - 14,
              0,
              chartContainer.clientHeight - 28,
            ),
            text: formatMarketIndexValue(marketIndex.currentValue),
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
