"use client";

import { useMarketIndicesQuery } from "../../../apis/market-indices/queries";
import { useIsHydrated } from "../../../hooks/use-is-hydrated";
import type { MarketIndexSummaryData } from "../../../types/market-index";
import MarketIndex from "./market_index";

type IndexListProps = {
  initialIndices?: MarketIndexSummaryData[];
};

function IndexListFallback() {
  return (
    <div className="flex h-full flex-col justify-between gap-3.5">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-1 py-1">
          <div className="h-12 w-20 rounded bg-zinc-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-20 rounded bg-zinc-100" />
            <div className="h-4 w-32 rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IndexList({ initialIndices }: IndexListProps) {
  const isHydrated = useIsHydrated();
  const { data } = useMarketIndicesQuery(initialIndices);
  const marketIndexes =
    isHydrated && data !== undefined ? data : (initialIndices ?? []);
  const shouldShowFallback = marketIndexes.length === 0;

  return (
    <section className="w-auto bg-white pt-16 pr-8 pb-8 pl-8">
      {shouldShowFallback ? (
        <IndexListFallback />
      ) : (
        <ul className="flex h-full flex-col justify-between gap-3.5">
          {marketIndexes.map((marketIndex) => (
            <li key={marketIndex.id}>
              <MarketIndex marketIndex={marketIndex} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
