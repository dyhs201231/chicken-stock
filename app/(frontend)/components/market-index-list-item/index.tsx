import Link from "next/link";
import type {
  MarketIndexCandleData,
  MarketIndexViewData,
} from "../../types/market-index";
import MarketDataStatus from "../market-data-status";
import {
  formatMarketIndexChange,
  formatMarketIndexPercent,
  formatMarketIndexValue,
  getMarketIndexTrendStrokeColor,
  getMarketIndexTrendTextColor,
} from "../../utils/market-index";

type MarketIndexListItemSize = "default" | "compact";

type MarketIndexListItemProps = {
  isActive?: boolean;
  marketIndex: MarketIndexViewData;
  size?: MarketIndexListItemSize;
};

const SPARKLINE_WIDTH = 110;
const SPARKLINE_HEIGHT = 48;

function getSparklinePoints(candles: MarketIndexCandleData[]) {
  const visibleCandles = candles.slice(-24);

  if (visibleCandles.length === 0) {
    return "";
  }

  const closes = visibleCandles.map((candle) => candle.close);
  const minClose = Math.min(...closes);
  const maxClose = Math.max(...closes);
  const spread = maxClose - minClose;

  return visibleCandles
    .map((candle, index) => {
      const x =
        visibleCandles.length === 1
          ? SPARKLINE_WIDTH / 2
          : (index / (visibleCandles.length - 1)) * SPARKLINE_WIDTH;
      const normalizedClose =
        spread === 0 ? 0.5 : (candle.close - minClose) / spread;
      const y = SPARKLINE_HEIGHT - 5 - normalizedClose * 38;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function MarketIndexSparkline({
  candles,
  marketIndex,
  size,
}: {
  candles: MarketIndexCandleData[];
  marketIndex: MarketIndexViewData;
  size: MarketIndexListItemSize;
}) {
  const chartPoints = getSparklinePoints(candles);
  const chartAreaPoints = chartPoints
    ? `${chartPoints} ${SPARKLINE_WIDTH},${SPARKLINE_HEIGHT} 0,${SPARKLINE_HEIGHT}`
    : "";
  const trend =
    marketIndex.quote.status === "error" ? "flat" : marketIndex.quote.data.trend;
  const strokeColor = getMarketIndexTrendStrokeColor(trend);

  return (
    <div
      className={`shrink-0 overflow-hidden ${
        size === "compact" ? "h-10 w-14" : "h-10 w-14"
      }`}
      aria-hidden="true"
    >
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
        preserveAspectRatio="none"
      >
        {chartPoints && (
          <>
            <polygon
              fill={strokeColor}
              opacity="0.16"
              points={chartAreaPoints}
            />
            <polyline
              fill="none"
              points={chartPoints}
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
    </div>
  );
}

export default function MarketIndexListItem({
  isActive = false,
  marketIndex,
  size = "default",
}: MarketIndexListItemProps) {
  const quote = marketIndex.quote;
  const candles =
    marketIndex.chart.status === "error" ? [] : marketIndex.chart.data;
  const trendTextColor = getMarketIndexTrendTextColor(
    quote.status === "error" ? "flat" : quote.data.trend,
  );
  const titleClassName =
    size === "compact"
      ? "truncate text-xs leading-4 tracking-normal text-zinc-950"
      : "truncate text-base tracking-normal text-zinc-950 md:text-lg";
  const valueClassName =
    size === "compact"
      ? "mt-0.5 text-xs leading-4 tracking-normal whitespace-nowrap text-zinc-950"
      : "mt-0.5 text-sm tracking-normal text-zinc-950 md:text-base";

  return (
    <Link
      href={`/indices/${marketIndex.id}`}
      aria-label={`${marketIndex.name} 상세 보기`}
      className={`flex h-full min-w-0 items-center overflow-hidden rounded-lg transition-colors ${
        size === "compact" ? "gap-2 px-2 py-1.5" : "gap-3 px-2 py-2"
      } ${isActive ? "bg-(--cs-brand-100)" : "hover:bg-(--cs-brand-50)"}`}
    >
      <MarketIndexSparkline
        candles={candles}
        marketIndex={marketIndex}
        size={size}
      />

      <div className="min-w-0 flex-1 overflow-hidden">
        <h3 className={titleClassName}>{marketIndex.name}</h3>

        {quote.status === "error" ? (
          <p className={`${valueClassName} text-zinc-500`}>
            정보를 불러오지 못했습니다.
          </p>
        ) : (
          <>
            <p className={`${valueClassName} truncate`}>
              {formatMarketIndexValue(quote.data.currentValue)}
              <span className={`ml-2 ${trendTextColor}`}>
                {formatMarketIndexChange(quote.data.changeAmount)}(
                {formatMarketIndexPercent(quote.data.changeRate)})
              </span>
            </p>
            {size === "default" && quote.status === "fallback" && (
              <MarketDataStatus result={quote} />
            )}
            {size === "default" &&
              quote.status === "success" &&
              marketIndex.chart.status !== "success" && (
                <MarketDataStatus result={marketIndex.chart} />
              )}
          </>
        )}
      </div>
    </Link>
  );
}
