"use client";

import { useMarketIndicesQuery } from "../../../apis/market-indices/queries";
import { useIsHydrated } from "../../../hooks/use-is-hydrated";
import type { MarketIndexViewData } from "../../../types/market-index";
import MarketIndex from "./market_index";

type IndexListProps = {
  initialIndices?: MarketIndexViewData[];
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
    <section className="flex min-w-0 flex-col">
      <div className="mb-4">
        <p className="cs-section-label mb-1">02 · Market</p>
        <h2 className="cs-section-title">주요 지수</h2>
      </div>

      <div className="cs-surface-card h-96 min-w-0 overflow-hidden p-4 md:p-5 lg:h-107.5 lg:p-6">
        {shouldShowFallback ? (
          <IndexListFallback />
        ) : (
          <ul className="grid h-full min-w-0 grid-rows-5 gap-1">
            {marketIndexes.map((marketIndex) => (
              <li key={marketIndex.id} className="min-h-0 min-w-0 overflow-hidden">
                <MarketIndex marketIndex={marketIndex} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
