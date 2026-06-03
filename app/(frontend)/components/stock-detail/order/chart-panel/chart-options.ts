import { ColorType, CrosshairMode, LineStyle } from "lightweight-charts";
import type {
  ChartOptions,
  DeepPartial,
  PriceLineOptions,
  SeriesPartialOptionsMap,
} from "lightweight-charts";
import { formatTimeLabel } from "./chart-format";
import {
  CROSSHAIR_COLOR,
  FALL_COLOR,
  GRID_COLOR,
  GUIDE_COLOR,
  RISE_COLOR,
} from "./constants";
import type { StockCurrencyCode } from "../../../../types/stock/stock-detail";
import { formatNumber } from "../../../../utils/stock/stock-detail";

export function getChartOptions(
  chartContainer: HTMLDivElement,
): DeepPartial<ChartOptions> {
  return {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
    autoSize: false,
    layout: {
      background: { type: ColorType.Solid, color: "#FFFFFF" },
      textColor: "#7B7878",
      fontFamily: "var(--font-atoz), Arial, Helvetica, sans-serif",
      fontSize: 16,
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: GRID_COLOR },
      horzLines: { color: GRID_COLOR },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: CROSSHAIR_COLOR,
        width: 1,
        style: LineStyle.Dotted,
        labelVisible: false,
        labelBackgroundColor: GUIDE_COLOR,
      },
      horzLine: {
        color: CROSSHAIR_COLOR,
        width: 1,
        style: LineStyle.Dotted,
        labelVisible: false,
        labelBackgroundColor: GUIDE_COLOR,
      },
    },
    rightPriceScale: {
      visible: true,
      borderVisible: false,
      textColor: "transparent",
      scaleMargins: {
        top: 0.08,
        bottom: 0.08,
      },
    },
    timeScale: {
      visible: true,
      borderVisible: false,
      timeVisible: false,
      secondsVisible: false,
      barSpacing: 28,
      rightOffset: 2,
      tickMarkFormatter: () => "",
    },
    localization: {
      priceFormatter: (price: number) => formatNumber(price),
      timeFormatter: formatTimeLabel,
    },
    handleScale: {
      mouseWheel: true,
      pinch: true,
    },
  };
}

export function getCandlestickSeriesOptions(
  currencyCode: StockCurrencyCode,
): SeriesPartialOptionsMap["Candlestick"] {
  return {
    upColor: RISE_COLOR,
    downColor: FALL_COLOR,
    wickUpColor: RISE_COLOR,
    wickDownColor: FALL_COLOR,
    borderUpColor: RISE_COLOR,
    borderDownColor: FALL_COLOR,
    priceLineVisible: false,
    lastValueVisible: false,
    priceFormat: {
      type: "price",
      precision: currencyCode === "KRW" ? 0 : 2,
      minMove: currencyCode === "KRW" ? 1 : 0.01,
    },
  };
}

export function getCurrentPriceLineOptions(price: number): PriceLineOptions {
  return {
    price,
    color: CROSSHAIR_COLOR,
    lineWidth: 1,
    lineStyle: LineStyle.Dotted,
    lineVisible: true,
    axisLabelVisible: false,
    title: "",
    axisLabelColor: GUIDE_COLOR,
    axisLabelTextColor: "#000000",
  };
}
