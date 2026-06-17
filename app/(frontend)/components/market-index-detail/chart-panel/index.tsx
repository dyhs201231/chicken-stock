"use client";

import type { MarketIndexDetailData } from "../../../types/market-index";
import { ChartOverlayLabels } from "../../stock-detail/order/chart-panel/chart-overlay-labels";
import { RangeToolbar } from "../../stock-detail/order/chart-panel/range-toolbar";
import { MarketIndexOhlcSummary } from "./ohlc-summary";
import { useMarketIndexChartPanel } from "./use-market-index-chart-panel";

type MarketIndexChartPanelProps = {
  marketIndex: MarketIndexDetailData;
};

export default function MarketIndexChartPanel({
  marketIndex,
}: MarketIndexChartPanelProps) {
  const {
    axisTickLabels,
    chartContainerRef,
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
  } = useMarketIndexChartPanel({ marketIndex });

  if (!isHydrated) {
    return (
      <section className="flex h-130 min-w-0 flex-col rounded-3xl bg-white px-7 py-6 shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
        <div className="flex h-10 items-center gap-7">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-8 w-10 rounded bg-zinc-100" />
          ))}
        </div>

        <div className="mt-4 h-5 w-96 max-w-full rounded bg-zinc-100" />

        <div className="mt-4 min-h-0 flex-1 rounded bg-zinc-50" />
      </section>
    );
  }

  return (
    <section className="flex h-130 min-w-0 flex-col rounded-3xl bg-white px-7 py-6 shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
      <RangeToolbar
        selectedRange={selectedRange}
        onRangeChange={handleRangeChange}
      />

      <MarketIndexOhlcSummary items={ohlcItems} />

      <div className="relative min-h-0 flex-1">
        <div ref={chartContainerRef} className="h-full w-full" />

        <ChartOverlayLabels
          axisTickLabels={axisTickLabels}
          crosshairDateLabel={crosshairDateLabel}
          crosshairPriceLabel={crosshairPriceLabel}
          currentPriceLabel={currentPriceLabel}
          currentPriceLabelClassName={currentPriceLabelClassName}
          highLabelPosition={highLabelPosition}
          lowLabelPosition={lowLabelPosition}
          priceAxisTickLabels={priceAxisTickLabels}
        />
      </div>
    </section>
  );
}
