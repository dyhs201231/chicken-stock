import type {
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  Time,
} from "lightweight-charts";
import {
  clampPosition,
  formatCrosshairDateLabel,
  isCandlestickData,
  toChartCandleData,
} from "../../stock-detail/order/chart-panel/chart-format";
import type {
  CandleRange,
  ChartCandleData,
  CrosshairDateLabel,
  CrosshairPriceLabel,
} from "../../stock-detail/order/chart-panel/types";
import { formatMarketIndexValue } from "../../../utils/market-index";

type CrosshairHandlerParams = {
  candleSeries: ISeriesApi<"Candlestick", Time>;
  chart: IChartApi;
  chartCandles: ChartCandleData[];
  chartContainer: HTMLDivElement;
  selectedRange: CandleRange;
  setCrosshairDateLabel: (label: CrosshairDateLabel | null) => void;
  setCrosshairPriceLabel: (label: CrosshairPriceLabel | null) => void;
  setHoveredCandle: (candle: ChartCandleData | null) => void;
};

export function createMarketIndexCrosshairMoveHandler({
  candleSeries,
  chart,
  chartCandles,
  chartContainer,
  selectedRange,
  setCrosshairDateLabel,
  setCrosshairPriceLabel,
  setHoveredCandle,
}: CrosshairHandlerParams) {
  return (param: MouseEventParams<Time>) => {
    if (!param.point) {
      setHoveredCandle(null);
      setCrosshairDateLabel(null);
      setCrosshairPriceLabel(null);

      return;
    }

    const hoveredData = param.seriesData.get(candleSeries);
    const hoveredPrice = candleSeries.coordinateToPrice(param.point.y);
    const logicalIndex = chart.timeScale().coordinateToLogical(param.point.x);
    const fallbackTime =
      typeof logicalIndex === "number"
        ? chartCandles[
            clampPosition(Math.round(logicalIndex), 0, chartCandles.length - 1)
          ]?.time
        : undefined;
    const hoveredTime =
      chart.timeScale().coordinateToTime(param.point.x) ??
      param.time ??
      fallbackTime;
    const hoveredCandle = isCandlestickData(hoveredData)
      ? toChartCandleData(hoveredData)
      : null;
    const labelTime = hoveredCandle?.time ?? hoveredTime;

    setHoveredCandle(hoveredCandle);

    setCrosshairDateLabel(
      labelTime
        ? {
            left: clampPosition(
              param.point.x - 45,
              8,
              chartContainer.clientWidth - 110,
            ),
            text: formatCrosshairDateLabel(labelTime, selectedRange),
          }
        : null,
    );

    setCrosshairPriceLabel(
      typeof hoveredPrice === "number"
        ? {
            top: clampPosition(
              param.point.y - 14,
              0,
              chartContainer.clientHeight - 28,
            ),
            text: formatMarketIndexValue(hoveredPrice),
          }
        : null,
    );
  };
}
