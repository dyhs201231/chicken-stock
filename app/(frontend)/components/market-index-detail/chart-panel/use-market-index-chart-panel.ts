"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CandlestickSeries, createChart } from "lightweight-charts";
import type { IRange, Time } from "lightweight-charts";
import { useMarketIndexCandlesQuery } from "../../../apis/market-indices/queries";
import { useIsHydrated } from "../../../hooks/use-is-hydrated";
import type {
  MarketIndexCandleInterval,
  MarketIndexDetailData,
} from "../../../types/market-index";
import {
  getCandlestickSeriesOptions,
  getChartOptions,
  getCurrentPriceLineOptions,
} from "../../stock-detail/order/chart-panel/chart-options";
import { getOhlcItems } from "../../stock-detail/order/chart-panel/chart-format";
import type {
  AxisTickLabel,
  CandleRange,
  ChartCandleData,
  CrosshairDateLabel,
  CrosshairPriceLabel,
  CurrentPriceLabel,
  HighLowLabel,
  PriceAxisTickLabel,
} from "../../stock-detail/order/chart-panel/types";
import { createMarketIndexCrosshairMoveHandler } from "./market-index-chart-crosshair";
import { createMarketIndexChartOverlayUpdaters } from "./market-index-chart-overlay-updaters";

type UseMarketIndexChartPanelParams = {
  marketIndex: MarketIndexDetailData;
};

function getInitialDailyChartCandles(marketIndex: MarketIndexDetailData) {
  return marketIndex.candles
    .map((candle) => ({
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

function getWeekStartDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  date.setUTCDate(date.getUTCDate() + mondayOffset);

  return date.toISOString().slice(0, 10);
}

function getMonthStartDateKey(dateKey: string) {
  return `${dateKey.slice(0, 7)}-01`;
}

function groupCandles(
  candles: ChartCandleData[],
  getGroupKey: (time: string) => string,
) {
  const groupedCandles = new Map<string, ChartCandleData>();

  candles.forEach((candle) => {
    const time = getGroupKey(candle.time);
    const existingCandle = groupedCandles.get(time);

    if (!existingCandle) {
      groupedCandles.set(time, { ...candle, time });
      return;
    }

    groupedCandles.set(time, {
      ...existingCandle,
      high: Math.max(existingCandle.high, candle.high),
      low: Math.min(existingCandle.low, candle.low),
      close: candle.close,
      volume: existingCandle.volume + candle.volume,
    });
  });

  return [...groupedCandles.values()].sort((a, b) =>
    a.time.localeCompare(b.time),
  );
}

function getInitialChartCandles(
  marketIndex: MarketIndexDetailData,
  interval: MarketIndexCandleInterval,
) {
  const dailyCandles = getInitialDailyChartCandles(marketIndex);

  if (interval === "WEEK") {
    return groupCandles(dailyCandles, getWeekStartDateKey);
  }

  if (interval === "MONTH") {
    return groupCandles(dailyCandles, getMonthStartDateKey);
  }

  return dailyCandles;
}

function getSelectedInterval(
  selectedRange: CandleRange,
): MarketIndexCandleInterval {
  if (selectedRange === "weekly") {
    return "WEEK";
  }

  if (selectedRange === "monthly") {
    return "MONTH";
  }

  return "DAY";
}

export function useMarketIndexChartPanel({
  marketIndex,
}: UseMarketIndexChartPanelParams) {
  const isHydrated = useIsHydrated();
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

  const selectedInterval = useMemo(
    () => getSelectedInterval(selectedRange),
    [selectedRange],
  );
  const initialChartCandles = useMemo(
    () => getInitialChartCandles(marketIndex, selectedInterval),
    [marketIndex, selectedInterval],
  );
  const { data } = useMarketIndexCandlesQuery(
    marketIndex.id,
    selectedInterval,
    initialChartCandles,
    {
      hydrateInitialData: marketIndex.provider !== "local-fallback",
    },
  );
  const chartCandles =
    isHydrated && data !== undefined ? data : initialChartCandles;
  const latestCandle = chartCandles.at(-1);
  const displayCandle = hoveredCandle ?? latestCandle;
  const displayCandleBasePrice = useMemo(() => {
    if (!displayCandle) {
      return 0;
    }

    const displayCandleIndex = chartCandles.findIndex(
      (candle) => candle.time === displayCandle.time,
    );

    return chartCandles[displayCandleIndex - 1]?.close ?? displayCandle.open;
  }, [chartCandles, displayCandle]);
  const ohlcItems = useMemo(
    () => getOhlcItems(displayCandle, displayCandleBasePrice),
    [displayCandle, displayCandleBasePrice],
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
    marketIndex.changeRate > 0
      ? "bg-(--cs-color-red-500)"
      : marketIndex.changeRate < 0
        ? "bg-(--cs-color-blue-700)"
        : "bg-zinc-500";

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

    if (!isHydrated || !chartContainer || chartCandles.length === 0) {
      return;
    }

    const chart = createChart(chartContainer, getChartOptions(chartContainer));
    const candleSeries = chart.addSeries(
      CandlestickSeries,
      getCandlestickSeriesOptions(marketIndex.currencyCode),
    );

    candleSeries.setData(chartCandles);
    candleSeries.createPriceLine(
      getCurrentPriceLineOptions(marketIndex.currentValue),
    );

    const {
      updateAxisTickLabels,
      updateCurrentPriceLabel,
      updateHighLowLabels,
      updatePriceAxisTickLabels,
    } = createMarketIndexChartOverlayUpdaters({
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

    const handleCrosshairMove = createMarketIndexCrosshairMoveHandler({
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
    isHydrated,
    marketIndex,
    marketIndex.currencyCode,
    marketIndex.currentValue,
    monthStartTimes,
    selectedRange,
  ]);

  return {
    axisTickLabels,
    chartContainerRef,
    chartCandles,
    crosshairDateLabel,
    crosshairPriceLabel,
    currentPriceLabel,
    currentPriceLabelClassName,
    handleRangeChange,
    highLabelPosition,
    isHydrated,
    lowLabelPosition,
    ohlcItems,
    priceAxisTickLabels,
    selectedRange,
  };
}
