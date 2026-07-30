import SegmentedControl from "@/app/(frontend)/components/ui/segmented-control";
import { TRANSACTION_CURRENCIES } from "@/app/(frontend)/constants/portfolio";
import type { TransactionCurrency } from "@/app/(frontend)/types/portfolio";
import { formatUsd, formatWon } from "../utils";

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
    <section className="col gap-0 rounded-2xl bg-white p-6 text-lg md:gap-4 md:p-8">
      <SegmentedControl
        aria-label="통화 선택"
        className="w-fit"
        onValueChange={(value) =>
          setSelectedCurrency(value as TransactionCurrency)
        }
        value={selectedCurrency}
      >
        {TRANSACTION_CURRENCIES.map((currency) => (
          <SegmentedControl.Item key={currency} value={currency}>
            {currency}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl>

      <div className="flex flex-col items-end text-right md:flex-row md:items-center md:gap-1 md:text-left">
        <p>주문 가능 {selectedCurrency}</p>
        <p>
          {selectedCurrency === "원화" && formatWon(krwBalance)}
          {selectedCurrency === "달러" && formatUsd(usdBalance)}
        </p>
      </div>
    </section>
  );
}
