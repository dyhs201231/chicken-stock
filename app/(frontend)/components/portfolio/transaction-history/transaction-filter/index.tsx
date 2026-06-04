import { TRANSACTION_HISTORY_FILTERS } from "@/app/(frontend)/constants/portfolio";
import { TransactionHistoryFilter } from "@/app/(frontend)/types/portfolio";
import { twMerge } from "tailwind-merge";

interface TransactionFilterProps {
  selectedFilter: TransactionHistoryFilter;
  setSelectedFilter: (filter: TransactionHistoryFilter) => void;
}

export default function TransactionFilter({
  selectedFilter,
  setSelectedFilter,
}: TransactionFilterProps) {
  return (
    <div className="row gap-10 text-lg font-medium">
      {TRANSACTION_HISTORY_FILTERS.map((filter) => (
        <button
          key={filter}
          className={twMerge(
            "cursor-pointer pb-1",
            selectedFilter === filter && "border-b border-black",
          )}
          type="button"
          onClick={() => setSelectedFilter(filter)}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
