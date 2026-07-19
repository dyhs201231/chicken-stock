import MarketIndexListItem from "../../../market-index-list-item";
import type { MarketIndexViewData } from "../../../../types/market-index";

type MarketIndexProps = {
  marketIndex: MarketIndexViewData;
};

export default function MarketIndex({ marketIndex }: MarketIndexProps) {
  return <MarketIndexListItem marketIndex={marketIndex} />;
}
