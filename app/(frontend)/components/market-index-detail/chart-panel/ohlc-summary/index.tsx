import type { OhlcItem } from "../../../stock-detail/order/chart-panel/types";
import {
  formatMarketIndexPercent,
  formatMarketIndexValue,
} from "../../../../utils/market-index";

type MarketIndexOhlcSummaryProps = {
  items: OhlcItem[];
};

export function MarketIndexOhlcSummary({
  items,
}: MarketIndexOhlcSummaryProps) {
  return (
    <dl className="mb-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] whitespace-nowrap text-zinc-950">
      {items.map((item) => {
        const rateColorClassName =
          item.rate > 0
            ? "text-[#FF0505]"
            : item.rate < 0
              ? "text-[#0084FF]"
              : "text-zinc-500";

        return (
          <div key={item.label} className="flex items-center">
            <dt>{item.label}</dt>
            <dd className="ml-1">
              {formatMarketIndexValue(item.value)}
              <span className={`ml-1 ${rateColorClassName}`}>
                ({formatMarketIndexPercent(item.rate)})
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
