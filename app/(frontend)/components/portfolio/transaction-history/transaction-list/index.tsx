import type { PortfolioTransaction } from "@/app/(frontend)/apis/portfolio/api";
import {
  formatDateShort,
  formatTransactionAmount,
  getTransactionLabel,
  getTransactionToneClassName,
} from "../utils";
import { twMerge } from "tailwind-merge";

interface TransactionListProps {
  selectedTransactionId: string | null;
  setSelectedTransactionId: (transactionId: string) => void;
  transactions: PortfolioTransaction[];
}

export default function TransactionList({
  selectedTransactionId,
  setSelectedTransactionId,
  transactions,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="row center min-h-60 text-lg text-[#777777]">
        표시할 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="col mt-8 gap-7">
      {transactions.map((transaction, index) => {
        const showDate =
          index === 0 ||
          transaction.executedAt !== transactions[index - 1]?.executedAt;
        const isSelected = selectedTransactionId === transaction.id;

        return (
          <button
            key={transaction.id}
            className={twMerge(
              "grid cursor-pointer grid-cols-[3.5rem_minmax(0,1fr)_auto] items-start gap-2 text-left transition-opacity",
              isSelected && "opacity-100",
              !isSelected && "opacity-80 hover:opacity-100",
            )}
            type="button"
            onClick={() => setSelectedTransactionId(transaction.id)}
          >
            <span className="text-xl">
              {showDate && formatDateShort(transaction.executedAt)}
            </span>

            <span className="col gap-1">
              <span className="text-xl">{transaction.companyName}</span>
              <span
                className={`text-sm ${getTransactionToneClassName(
                  transaction.transactionType,
                )}`}
              >
                {getTransactionLabel(transaction.transactionType)}
              </span>
            </span>

            <span className="text-xl">
              {formatTransactionAmount(transaction)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
