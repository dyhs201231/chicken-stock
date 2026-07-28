import SegmentedControl from "../../../ui/segmented-control";
import type {
  StockMarketFilter,
  StockRankingKey,
  StockRankingPeriod,
} from "../types";

type StockListControlsProps = {
  selectedMarket: StockMarketFilter;
  selectedRanking: StockRankingKey;
  selectedPeriod: StockRankingPeriod;
  onMarketChange: (value: StockMarketFilter) => void;
  onRankingChange: (value: StockRankingKey) => void;
  onPeriodChange: (value: StockRankingPeriod) => void;
};

const marketOptions = [
  { label: "전체", value: "all" },
  { label: "국내", value: "domestic" },
  { label: "해외", value: "global" },
] as const satisfies ReadonlyArray<{
  label: string;
  value: StockMarketFilter;
}>;

const rankingOptions = [
  { label: "거래대금", value: "tradingAmount" },
  { label: "거래량", value: "tradingVolume" },
] as const satisfies ReadonlyArray<{
  label: string;
  value: StockRankingKey;
}>;

const periodOptions = [
  { label: "실시간", value: "live" },
  { label: "1일", value: "1d" },
  { label: "1주일", value: "1w" },
  { label: "1개월", value: "1m" },
  { label: "3개월", value: "3m" },
  { label: "6개월", value: "6m" },
  { label: "1년", value: "1y" },
] as const satisfies ReadonlyArray<{
  label: string;
  value: StockRankingPeriod;
}>;

export default function StockListControls({
  selectedMarket,
  selectedRanking,
  selectedPeriod,
  onMarketChange,
  onRankingChange,
  onPeriodChange,
}: StockListControlsProps) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-3 md:w-auto md:gap-5">
      <SegmentedControl
        aria-label="시장 선택"
        onValueChange={(value) => {
          if (marketOptions.some((option) => option.value === value)) {
            onMarketChange(value as StockMarketFilter);
          }
        }}
        value={selectedMarket}
      >
        {marketOptions.map((option) => (
          <SegmentedControl.Item key={option.value} value={option.value}>
            {option.label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl>

      <SegmentedControl
        aria-label="랭킹 기준"
        onValueChange={(value) => {
          if (rankingOptions.some((option) => option.value === value)) {
            onRankingChange(value as StockRankingKey);
          }
        }}
        value={selectedRanking}
      >
        {rankingOptions.map((option) => (
          <SegmentedControl.Item key={option.value} value={option.value}>
            {option.label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl>

      <SegmentedControl
        aria-label="기간 선택"
        className="scrollbar-hide w-full max-w-full overflow-x-auto md:w-auto"
        onValueChange={(value) => {
          if (periodOptions.some((option) => option.value === value)) {
            onPeriodChange(value as StockRankingPeriod);
          }
        }}
        value={selectedPeriod}
      >
        {periodOptions.map((option) => (
          <SegmentedControl.Item
            key={option.value}
            className="shrink-0 whitespace-nowrap"
            value={option.value}
          >
            {option.label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl>
    </div>
  );
}
