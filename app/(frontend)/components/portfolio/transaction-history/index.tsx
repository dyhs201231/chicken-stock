import { useState } from "react";
import { useGetPortfolio } from "@/app/(frontend)/apis/portfolio/queries";
import CurrencyFilter from "./currency-filter";
import TransactionDetail from "./transaction-detail";
import TransactionFilter from "./transaction-filter";
import TransactionList from "./transaction-list";
import { getFilteredTransactions } from "./utils";
import {
  TransactionCurrency,
  TransactionHistoryFilter,
} from "@/app/(frontend)/types/portfolio";

export default function TransactionHistory() {
  const { data } = useGetPortfolio();
  const [selectedCurrency, setSelectedCurrency] =
    useState<TransactionCurrency>("원화");
  const [selectedFilter, setSelectedFilter] =
    useState<TransactionHistoryFilter>("전체");
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);

  if (!data) {
    return null;
  }

  const transactions = getFilteredTransactions(
    data.transactions,
    selectedFilter,
  );
  const selectedTransaction =
    transactions.find(
      (transaction) => transaction.id === selectedTransactionId,
    ) ??
    transactions[0] ??
    null;
  const itemByStockId = new Map(
    data.items.map((item) => [item.stockId, item] as const),
  );
  const selectedItem =
    selectedTransaction?.stockId === null || !selectedTransaction
      ? undefined
      : itemByStockId.get(selectedTransaction.stockId);

  return (
    <div className="col flex-1 gap-5 overflow-visible xl:min-h-0 xl:overflow-hidden">
      <CurrencyFilter
        krwBalance={data.krwBalance}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
        usdBalance={data.usdBalance}
      />

      <section className="grid flex-none grid-cols-1 grid-rows-[400px_400px] gap-5 overflow-visible xl:min-h-0 xl:flex-1 xl:grid-cols-2 xl:grid-rows-1 xl:overflow-hidden">
        <div className="col h-[400px] min-h-0 overflow-hidden rounded-2xl bg-white p-4 md:p-8 xl:h-auto">
          <TransactionFilter
            selectedFilter={selectedFilter}
            setSelectedFilter={(filter) => {
              setSelectedFilter(filter);
              setSelectedTransactionId(null);
            }}
          />

          <div className="min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <TransactionList
              selectedTransactionId={selectedTransaction?.id ?? null}
              setSelectedTransactionId={setSelectedTransactionId}
              transactions={transactions}
            />
          </div>
        </div>

        <div className="h-[400px] min-h-0 [scrollbar-width:none] overflow-y-auto rounded-2xl bg-white p-4 md:p-8 xl:h-auto [&::-webkit-scrollbar]:hidden">
          {selectedTransaction && (
            <TransactionDetail
              item={selectedItem}
              transaction={selectedTransaction}
            />
          )}

          {!selectedTransaction && (
            <div className="row center h-full text-base text-(--cs-color-gray-700) md:text-lg">
              거래를 선택해 주세요.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
