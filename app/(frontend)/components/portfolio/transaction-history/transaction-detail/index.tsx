import type {
  PortfolioItem,
  PortfolioTransaction,
} from "@/app/(frontend)/apis/portfolio/api";
import {
  formatTransactionAmount,
  getLogoText,
  getTransactionDetailRows,
} from "../utils";

interface TransactionDetailProps {
  item?: PortfolioItem;
  transaction: PortfolioTransaction;
}

export default function TransactionDetail({
  item,
  transaction,
}: TransactionDetailProps) {
  const detailRows = getTransactionDetailRows(transaction);

  return (
    <div className="col gap-5 md:gap-7">
      <div className="row items-start justify-between gap-4 md:gap-6">
        <div className="col gap-1">
          <p className="text-sm md:text-base">{transaction.companyName}</p>
          <p className="text-xl md:text-2xl">
            {formatTransactionAmount(transaction)}
          </p>
        </div>

        <div className="row center size-16 shrink-0 bg-[#1628a0] px-1.5 text-center text-[10px] font-bold text-white md:size-20 md:px-2 md:text-xs">
          {getLogoText(item, transaction.companyName)}
        </div>
      </div>

      <dl className="col gap-5 text-sm md:gap-8 md:text-base">
        {detailRows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-0"
          >
            <dt>{row.label}</dt>
            <dd className="text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
