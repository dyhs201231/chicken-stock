import { useEffect, useMemo, useRef, useState } from "react";
import { CandlestickSeries, createChart } from "lightweight-charts";
import type { IRange, Time } from "lightweight-charts";
import {
  aggregateToMonthlyCandles,
  aggregateToWeeklyCandles,
  convertToDailyCandles,
} from "./chart-data";
import { createCrosshairMoveHandler } from "./chart-crosshair";
import { getOhlcItems } from "./chart-format";
import {
  getCandlestickSeriesOptions,
  getChartOptions,
  getCurrentPriceLineOptions,
} from "./chart-options";
import { createChartOverlayUpdaters } from "./chart-overlay-updaters";
import type {
  AxisTickLabel,
  CandleRange,
  ChartCandleData,
  CrosshairDateLabel,
  CrosshairPriceLabel,
  CurrentPriceLabel,
  HighLowLabel,
  PriceAxisTickLabel,
} from "./types";
import type { StockOnlyProps } from "../../../../types/stock/stock-detail";

export function useChartPanel({ stock }: StockOnlyProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [selectedRange, setSelectedRange] = useState<CandleRange>("daily");
  const [highLabelPosition, setHighLabelPosition] =
    useState<HighLowLabel | null>(null);
  const [lowLabelPosition, setLowLabelPosition] = useState<HighLowLabel | null>(
    null,
  );
  const [hoveredCandle, setHoveredCandle] = useState<ChartCandleData | null>(
    null,
  );
  const [crosshairDateLabel, setCrosshairDateLabel] =
    useState<CrosshairDateLabel | null>(null);
  const [crosshairPriceLabel, setCrosshairPriceLabel] =
    useState<CrosshairPriceLabel | null>(null);
  const [currentPriceLabel, setCurrentPriceLabel] =
    useState<CurrentPriceLabel | null>(null);
  const [axisTickLabels, setAxisTickLabels] = useState<AxisTickLabel[]>([]);
  const [priceAxisTickLabels, setPriceAxisTickLabels] = useState<
    PriceAxisTickLabel[]
  >([]);

  const dailyCandles = useMemo(
    () => convertToDailyCandles(stock.candles),
    [stock.candles],
  );

  const chartCandles = useMemo(() => {
    if (selectedRange === "weekly") {
      return aggregateToWeeklyCandles(dailyCandles);
    }

    if (selectedRange === "monthly") {
      return aggregateToMonthlyCandles(dailyCandles);
    }

    return dailyCandles;
  }, [dailyCandles, selectedRange]);

  const latestCandle = chartCandles.at(-1);
  const displayCandle = hoveredCandle ?? latestCandle;

  const ohlcItems = useMemo(
    () => getOhlcItems(displayCandle, stock.previousClose),
    [displayCandle, stock.previousClose],
  );

  const monthStartTimes = useMemo(() => {
    const monthStarts = new Set<string>();

    chartCandles.forEach((candle, index) => {
      const previousCandle = chartCandles[index - 1];

      if (
        !previousCandle ||
        previousCandle.time.slice(0, 7) !== candle.time.slice(0, 7)
      ) {
        monthStarts.add(candle.time);
      }
    });

    return monthStarts;
  }, [chartCandles]);

  const currentPriceLabelClassName =
    stock.changeRate >= 0 ? "bg-[#FF0505]" : "bg-[#0084FF]";

  const handleRangeChange = (nextRange: CandleRange) => {
    setSelectedRange(nextRange);
    setHighLabelPosition(null);
    setLowLabelPosition(null);
    setHoveredCandle(null);
    setCrosshairDateLabel(null);
    setCrosshairPriceLabel(null);
    setCurrentPriceLabel(null);
    setAxisTickLabels([]);
    setPriceAxisTickLabels([]);
  };

  useEffect(() => {
    const chartContainer = chartContainerRef.current;

    if (!chartContainer || chartCandles.length === 0) {
      return;
    }

    const chart = createChart(chartContainer, getChartOptions(chartContainer));

    const candleSeries = chart.addSeries(
      CandlestickSeries,
      getCandlestickSeriesOptions(stock.currencyCode),
    );

    candleSeries.setData(chartCandles);
    candleSeries.createPriceLine(
      getCurrentPriceLineOptions(stock.currentPrice),
    );

    const {
      updateAxisTickLabels,
      updateCurrentPriceLabel,
      updateHighLowLabels,
      updatePriceAxisTickLabels,
    } = createChartOverlayUpdaters({
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
    });

    const scheduleOverlayLabelUpdate = (attempt = 0) => {
      requestAnimationFrame(() => {
        const isPositioned = updateHighLowLabels();
        updateAxisTickLabels();
        updatePriceAxisTickLabels();
        updateCurrentPriceLabel();

        if (!isPositioned && attempt < 20) {
          scheduleOverlayLabelUpdate(attempt + 1);
        }
      });
    };

    const handleCrosshairMove = createCrosshairMoveHandler({
      candleSeries,
      chart,
      chartCandles,
      chartContainer,
      selectedRange,
      setCrosshairDateLabel,
      setCrosshairPriceLabel,
      setHoveredCandle,
    });

    chart.timeScale().fitContent();
    scheduleOverlayLabelUpdate();

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
      });
      scheduleOverlayLabelUpdate();
    });

    resizeObserver.observe(chartContainer);
    const handleVisibleTimeRangeChange = (range: IRange<Time> | null) => {
      updateHighLowLabels(range);
    };
    const handleVisibleLogicalRangeChange = () => {
      updateAxisTickLabels();
      updatePriceAxisTickLabels();
      updateCurrentPriceLabel();
    };

    chart
      .timeScale()
      .subscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange);
    chart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      resizeObserver.disconnect();
      chart
        .timeScale()
        .unsubscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange);
      chart
        .timeScale()
        .unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
    };
  }, [
    chartCandles,
    monthStartTimes,
    selectedRange,
    stock,
    stock.currencyCode,
    stock.currentPrice,
  ]);

  return {
    axisTickLabels,
    chartContainerRef,
    crosshairDateLabel,
    crosshairPriceLabel,
    currentPriceLabel,
    currentPriceLabelClassName,
    handleRangeChange,
    highLabelPosition,
    lowLabelPosition,
    ohlcItems,
    priceAxisTickLabels,
    selectedRange,
  };
}
