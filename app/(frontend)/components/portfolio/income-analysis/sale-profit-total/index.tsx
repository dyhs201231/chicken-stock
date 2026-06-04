import { formatSignedWon } from "@/app/(frontend)/utils/portfolio/income-analysis";

interface SaleProfitTotalProps {
  totalSaleProfit: number | null;
}

export default function SaleProfitTotal({
  totalSaleProfit,
}: SaleProfitTotalProps) {
  return (
    <p className="text-xl">총 판매수익 {formatSignedWon(totalSaleProfit)}</p>
  );
}
