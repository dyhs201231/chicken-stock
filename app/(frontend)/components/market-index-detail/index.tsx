import type {
  MarketIndexViewData,
} from "../../types/market-index";
import { toMarketIndexChartData } from "../../utils/market-index";
import MarketDataStatus from "../market-data-status";
import MarketIndexChartPanel from "./chart-panel";
import MarketIndexHeader from "./header";
import RelatedIndexList from "./related-index-list";

type MarketIndexDetailProps = {
  marketIndex: MarketIndexViewData;
  marketIndexes: MarketIndexViewData[];
};

export default function MarketIndexDetail({
  marketIndex,
  marketIndexes,
}: MarketIndexDetailProps) {
  const chartMarketIndex = toMarketIndexChartData(marketIndex);

  return (
    <main className="cs-page-shell py-12">
      <MarketIndexHeader marketIndex={marketIndex} />

      <div className="mt-20 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        {chartMarketIndex ? (
          <MarketIndexChartPanel
            initialChartResult={marketIndex.chart}
            marketIndex={chartMarketIndex}
          />
        ) : (
          <section className="cs-data-panel flex h-130 min-w-0 items-center justify-center px-7 py-6">
            <MarketDataStatus result={marketIndex.chart} />
          </section>
        )}
        <RelatedIndexList
          activeIndexId={marketIndex.id}
          initialIndices={marketIndexes}
        />
      </div>
    </main>
  );
}
