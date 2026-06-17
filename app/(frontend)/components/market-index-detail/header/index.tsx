import type { MarketIndexDetailData } from "../../../types/market-index";
import {
  formatMarketIndexChange,
  formatMarketIndexPercent,
  formatMarketIndexValue,
  formatMarketIndexVolume,
  getMarketIndexCountryLabel,
  getMarketIndexTrendTextColor,
} from "../../../utils/market-index";

type MarketIndexHeaderProps = {
  marketIndex: MarketIndexDetailData;
};

type StatItemProps = {
  label: string;
  value: string;
};

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="min-w-18 text-right">
      <dt className="text-sm text-zinc-950">{label}</dt>
      <dd className="mt-2 text-base leading-5 text-zinc-950">{value}</dd>
    </div>
  );
}

export default function MarketIndexHeader({
  marketIndex,
}: MarketIndexHeaderProps) {
  const trendTextColor = getMarketIndexTrendTextColor(marketIndex.trend);
  const realtimeText = marketIndex.isRealtime ? "실시간" : "지연";
  const countryText = getMarketIndexCountryLabel(marketIndex.countryCode);

  return (
    <header className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl leading-8 tracking-normal text-zinc-950">
          {marketIndex.name} {formatMarketIndexValue(marketIndex.currentValue)}
        </h1>

        <p className="mt-3 text-base leading-5 text-zinc-950">
          전일 대비{" "}
          <span className={trendTextColor}>
            {formatMarketIndexChange(marketIndex.changeAmount)}(
            {formatMarketIndexPercent(marketIndex.changeRate)})
          </span>
          <span className="ml-3 text-zinc-500">
            {realtimeText} | {countryText}
          </span>
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-x-8 gap-y-5 md:grid-cols-6">
        <StatItem
          label="거래량"
          value={formatMarketIndexVolume(marketIndex.volume)}
        />
        <StatItem
          label="시작"
          value={formatMarketIndexValue(marketIndex.openValue)}
        />
        <StatItem
          label="1일 최고"
          value={formatMarketIndexValue(marketIndex.dayHigh)}
        />
        <StatItem
          label="1일 최저"
          value={formatMarketIndexValue(marketIndex.dayLow)}
        />
        <StatItem
          label="52주 최고"
          value={formatMarketIndexValue(marketIndex.high52w)}
        />
        <StatItem
          label="52주 최저"
          value={formatMarketIndexValue(marketIndex.low52w)}
        />
      </dl>
    </header>
  );
}
