import { memo } from "react";
import { formatNumber } from "../../../../utils/stock/stock-detail";
import type { OrderBookLevelRow } from "./types";
import { getLevelKey } from "./utils";

type OrderCountColumnProps = {
  className?: string;
  rows: OrderBookLevelRow[];
  side: "ASK" | "BID";
};

type OrderCountRowProps = {
  level: OrderBookLevelRow;
  textClassName: string;
};

function OrderCountRow({ level, textClassName }: OrderCountRowProps) {
  return (
    <div
      className={`flex min-h-0 items-center border-b-2 border-zinc-200 px-3 text-right text-sm font-medium last:border-b-0 ${textClassName}`}
    >
      {level && level.quantity > 0 ? formatNumber(level.quantity) : ""}
    </div>
  );
}

const MemoizedOrderCountRow = memo(OrderCountRow);

function OrderCountColumn({
  className = "",
  rows,
  side,
}: OrderCountColumnProps) {
  const textClassName =
    side === "ASK" ? "text-sky-600 justify-end" : "text-red-500 justify-start";

  return (
    <div
      className={`relative grid min-h-0 grid-rows-6 overflow-hidden ${className}`}
    >
      {rows.map((level, index) => {
        const rowKey = level ? getLevelKey(level) : `empty-${side}-${index}`;

        return (
          <MemoizedOrderCountRow
            key={rowKey}
            level={level}
            textClassName={textClassName}
          />
        );
      })}
    </div>
  );
}

export default memo(OrderCountColumn);
