import { notFound } from "next/navigation";
import { getCachedStockPageShellData } from "../page-data";
import StockDetail from "../../../../components/stock-detail";

export const revalidate = 10;

type StockOrderPageProps = {
  params: Promise<{
    stockId: string;
  }>;
};

export default async function StockOrderPage({ params }: StockOrderPageProps) {
  const { stockId } = await params;
  const parsedStockId = Number(stockId);

  if (!Number.isInteger(parsedStockId) || parsedStockId <= 0) notFound();

  const stock = await getCachedStockPageShellData(parsedStockId);

  if (!stock) notFound();

  return <StockDetail activeTab="chart-orderbook" stock={stock} />;
}
