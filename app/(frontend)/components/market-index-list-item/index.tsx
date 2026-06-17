import Link from "next/link";
import type {
  MarketIndexCandleData,
  MarketIndexSummaryData,
} from "../../types/market-index";
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
  marketIndex: MarketIndexSummaryData;
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
  marketIndex,
  size,
}: {
  marketIndex: MarketIndexSummaryData;
  size: MarketIndexListItemSize;
}) {
  const chartPoints = getSparklinePoints(marketIndex.candles);
  const chartAreaPoints = chartPoints
    ? `${chartPoints} ${SPARKLINE_WIDTH},${SPARKLINE_HEIGHT} 0,${SPARKLINE_HEIGHT}`
    : "";
  const strokeColor = getMarketIndexTrendStrokeColor(marketIndex.trend);

  return (
    <div
      className={`shrink-0 overflow-hidden ${
        size === "compact" ? "h-10 w-14" : "h-12 w-20"
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
  const trendTextColor = getMarketIndexTrendTextColor(marketIndex.trend);
  const titleClassName =
    size === "compact"
      ? "truncate text-xs leading-4 tracking-normal text-zinc-950"
      : "truncate text-xl tracking-normal text-zinc-950 md:text-xl";
  const valueClassName =
    size === "compact"
      ? "mt-0.5 text-xs leading-4 tracking-normal whitespace-nowrap text-zinc-950"
      : "mt-1 text-lg tracking-normal text-zinc-950 md:text-xl";

  return (
    <Link
      href={`/indices/${marketIndex.id}`}
      aria-label={`${marketIndex.name} 상세 보기`}
      className={`flex items-center rounded-lg transition-colors ${
        size === "compact" ? "gap-2 px-2 py-1.5" : "gap-3 px-1 py-1"
      } ${isActive ? "bg-zinc-100" : "hover:bg-zinc-50"}`}
    >
      <MarketIndexSparkline marketIndex={marketIndex} size={size} />

      <div className="min-w-0 flex-1">
        <h3 className={titleClassName}>{marketIndex.name}</h3>

        <p className={valueClassName}>
          {formatMarketIndexValue(marketIndex.currentValue)}
          <span className={`ml-2 ${trendTextColor}`}>
            {formatMarketIndexChange(marketIndex.changeAmount)}(
            {formatMarketIndexPercent(marketIndex.changeRate)})
          </span>
        </p>
      </div>
    </Link>
  );
}
