import { notFound } from "next/navigation";
import {
  getCachedMarketIndexDetail,
  getCachedMarketIndexSummaries,
} from "@/app/(backend)/lib/market-indices";
import MarketIndexDetail from "../../../components/market-index-detail";

export const revalidate = 10;

type IndexDetailPageProps = {
  params: Promise<{
    indexId: string;
  }>;
};

export default async function IndexDetailPage({
  params,
}: IndexDetailPageProps) {
  const { indexId } = await params;
  const [marketIndex, marketIndexes] = await Promise.all([
    getCachedMarketIndexDetail(indexId),
    getCachedMarketIndexSummaries(),
  ]);

  if (!marketIndex) {
    notFound();
  }

  return (
    <MarketIndexDetail
      marketIndex={marketIndex}
      marketIndexes={marketIndexes}
    />
  );
}
