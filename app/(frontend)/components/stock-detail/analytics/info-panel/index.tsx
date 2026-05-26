// TODO: 추후 실제 데이터로 변경 예정
import OrderPanel from "../../order/order-panel";
import type { StockOnlyProps } from "../../../../types/stock/stock-detail";
import {
  formatPrice,
  formatTradingValue,
} from "../../../../utils/stock/stock-detail";

const sectorLabels: Record<string, string> = {
  TECH: "기술",
  BIO: "바이오",
  FINANCE: "금융",
  CONSUMER: "소비재",
};

const riskLabels: Record<string, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
};

export default function InfoPanel({ stock }: StockOnlyProps) {
  return (
    <div className="grid h-130 grid-cols-[1fr_22rem] gap-7">
      <section className="border-4 border-[#ff260d] bg-white p-7">
        <h3 className="mb-5 text-2xl font-semibold">종목 정보</h3>
        <dl className="grid grid-cols-2 gap-x-10 gap-y-4 text-lg">
          <dt className="text-zinc-500">티커</dt>
          <dd className="text-right font-semibold">{stock.ticker}</dd>
          <dt className="text-zinc-500">섹터</dt>
          <dd className="text-right font-semibold">
            {sectorLabels[stock.sector] ?? stock.sector}
          </dd>
          <dt className="text-zinc-500">테마</dt>
          <dd className="text-right font-semibold">{stock.theme}</dd>
          <dt className="text-zinc-500">위험도</dt>
          <dd className="text-right font-semibold">
            {riskLabels[stock.riskLevel] ?? stock.riskLevel}
          </dd>
          <dt className="text-zinc-500">시가총액</dt>
          <dd className="text-right font-semibold">
            {formatTradingValue(stock.marketCap, stock.currencyCode)}
          </dd>
          <dt className="text-zinc-500">PER</dt>
          <dd className="text-right font-semibold">{stock.per.toFixed(2)}</dd>
          <dt className="text-zinc-500">EPS</dt>
          <dd className="text-right font-semibold">
            {formatPrice(stock.eps, stock.currencyCode)}
          </dd>
          <dt className="text-zinc-500">배당수익률</dt>
          <dd className="text-right font-semibold">
            {stock.dividendYield.toFixed(2)}%
          </dd>
        </dl>
      </section>

      <OrderPanel stock={stock} />
    </div>
  );
}
