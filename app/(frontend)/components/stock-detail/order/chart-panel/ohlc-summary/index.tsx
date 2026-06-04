import { FALL_COLOR, RISE_COLOR } from "../constants";
import type { OhlcItem } from "../types";
import type { StockCurrencyCode } from "../../../../../types/stock/stock-detail";
import {
  formatPercent,
  formatPrice,
} from "../../../../../utils/stock/stock-detail";

type OhlcSummaryProps = {
  currencyCode: StockCurrencyCode;
  items: OhlcItem[];
};

export function OhlcSummary({ currencyCode, items }: OhlcSummaryProps) {
  return (
    <dl className="mb-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] whitespace-nowrap text-zinc-950">
      {items.map((item) => {
        const rateColor =
          item.rate > 0
            ? RISE_COLOR
            : item.rate < 0
              ? FALL_COLOR
              : "var(--color-zinc-500)";

        return (
          <div key={item.label} className="flex items-center">
            <dt>{item.label}</dt>
            <dd className="ml-1">
              {formatPrice(item.value, currencyCode)}
              <span
                className="ml-1"
                style={{ color: rateColor }}
              >
                ({formatPercent(item.rate)})
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
