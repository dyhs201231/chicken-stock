import MarketIndexListItem from "../../../market-index-list-item";
import type { MarketIndexSummaryData } from "../../../../types/market-index";

type MarketIndexProps = {
  marketIndex: MarketIndexSummaryData;
};

export default function MarketIndex({ marketIndex }: MarketIndexProps) {
  return <MarketIndexListItem marketIndex={marketIndex} />;
}
