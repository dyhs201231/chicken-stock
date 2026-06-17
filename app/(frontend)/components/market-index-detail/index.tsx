import type {
  MarketIndexDetailData,
  MarketIndexSummaryData,
} from "../../types/market-index";
import MarketIndexChartPanel from "./chart-panel";
import MarketIndexHeader from "./header";
import RelatedIndexList from "./related-index-list";

type MarketIndexDetailProps = {
  marketIndex: MarketIndexDetailData;
  marketIndexes: MarketIndexSummaryData[];
};

export default function MarketIndexDetail({
  marketIndex,
  marketIndexes,
}: MarketIndexDetailProps) {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12 md:px-10">
      <MarketIndexHeader marketIndex={marketIndex} />

      <div className="mt-20 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <MarketIndexChartPanel marketIndex={marketIndex} />
        <RelatedIndexList
          activeIndexId={marketIndex.id}
          initialIndices={marketIndexes}
        />
      </div>
    </main>
  );
}
