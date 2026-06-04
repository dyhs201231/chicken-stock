import { TransactionCurrency } from "@/app/(frontend)/types/portfolio";
import { formatUsd, formatWon } from "../utils";
import { TRANSACTION_CURRENCIES } from "@/app/(frontend)/constants/portfolio";
import { twMerge } from "tailwind-merge";

interface CurrencyFilterProps {
  krwBalance: number;
  selectedCurrency: TransactionCurrency;
  setSelectedCurrency: (currency: TransactionCurrency) => void;
  usdBalance: number;
}

export default function CurrencyFilter({
  krwBalance,
  selectedCurrency,
  setSelectedCurrency,
  usdBalance,
}: CurrencyFilterProps) {
  return (
    <section className="col gap-4 text-xl">
      <div className="row items-center gap-4">
        {TRANSACTION_CURRENCIES.map((currency) => (
          <button
            key={currency}
            className={twMerge(
              "cursor-pointer pb-1",
              selectedCurrency === currency && "border-b border-black",
            )}
            type="button"
            onClick={() => setSelectedCurrency(currency)}
          >
            {currency}
          </button>
        ))}
      </div>

      <p>
        주문 가능 {selectedCurrency}{" "}
        {selectedCurrency === "원화" && formatWon(krwBalance)}
        {selectedCurrency === "달러" && formatUsd(usdBalance)}
      </p>
    </section>
  );
}
