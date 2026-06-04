import { rangeTabs } from "../constants";
import type { CandleRange } from "../types";

type RangeToolbarProps = {
  selectedRange: CandleRange;
  onRangeChange: (range: CandleRange) => void;
};

export function RangeToolbar({
  selectedRange,
  onRangeChange,
}: RangeToolbarProps) {
  return (
    <div className="text-md mb-3 flex items-center gap-6 tracking-normal">
      {rangeTabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={`rounded-xl px-3 py-2 transition-colors ${
            selectedRange === tab.value ? "bg-zinc-200" : "hover:bg-zinc-100"
          }`}
          onClick={() => onRangeChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}

      <span className="h-8 w-px bg-zinc-300" />

      <button type="button" className="rounded-xl px-3 py-2 hover:bg-zinc-100">
        캔들
      </button>
    </div>
  );
}
