import type {
  PortfolioItem,
  PortfolioTransaction,
} from "@/app/(frontend)/apis/portfolio/api";
import type {
  IncomeAnalysisView,
  IncomeMonth,
  IncomeSummaryData,
  SaleIncomeRow,
} from "@/app/(frontend)/types/portfolio/income-analysis";

export function getCurrentIncomeMonth(): IncomeMonth {
  const now = new Date();

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function getLatestIncomeMonth(transactions: PortfolioTransaction[]) {
  const latestTransaction = transactions[0];

  if (!latestTransaction) {
    return null;
  }

  return getIncomeMonth(latestTransaction.executedAt);
}

export function getPreviousIncomeMonth(month: IncomeMonth) {
  if (month.month === 1) {
    return {
      month: 12,
      year: month.year - 1,
    };
  }

  return {
    month: month.month - 1,
    year: month.year,
  };
}

export function getNextIncomeMonth(month: IncomeMonth) {
  if (month.month === 12) {
    return {
      month: 1,
      year: month.year + 1,
    };
  }

  return {
    month: month.month + 1,
    year: month.year,
  };
}

export function getIncomeAnalysis(
  transactions: PortfolioTransaction[],
  items: PortfolioItem[],
  month: IncomeMonth,
  selectedView: IncomeAnalysisView,
) {
  const itemByStockId = new Map(
    items.map((item) => [item.stockId, item] as const),
  );
  const monthlyTransactions = transactions.filter((transaction) =>
    isSameIncomeMonth(transaction.executedAt, month),
  );
  const saleIncomeRows = getSaleIncomeRows(
    monthlyTransactions,
    itemByStockId,
    selectedView,
  );
  const saleProfit = getSaleProfit(saleIncomeRows);
  const dividendIncome = getTotalAmount(monthlyTransactions, "DIVIDEND");
  const accountInterest = getAccountInterest(monthlyTransactions);

  return {
    saleIncomeRows,
    summary: {
      accountInterest,
      dividendIncome,
      saleProfit,
      totalRealizedIncome:
        saleProfit === null
          ? null
          : saleProfit + dividendIncome + accountInterest,
    } satisfies IncomeSummaryData,
  };
}

export function formatMonthLabel(month: IncomeMonth) {
  return `${month.year}년 ${month.month}월`;
}

export function formatWon(value: number | string) {
  return `${Number(value).toLocaleString("ko-KR", {
    maximumFractionDigits: 0,
  })}원`;
}

export function formatNullableWon(value: number | null) {
  if (value === null) {
    return "-";
  }

  return formatWon(value);
}

export function formatSignedWon(value: number | null) {
  if (value === null) {
    return "-";
  }

  if (value > 0) {
    return `+${formatWon(value)}`;
  }

  return formatWon(value);
}

export function formatRate(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${Number(value.toFixed(2)).toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  })}%`;
}

function getSaleIncomeRows(
  transactions: PortfolioTransaction[],
  itemByStockId: Map<number, PortfolioItem>,
  selectedView: IncomeAnalysisView,
) {
  const rows = transactions
    .filter((transaction) => transaction.transactionType === "SELL")
    .map((transaction) => getSaleIncomeRow(transaction, itemByStockId));

  if (selectedView === "전체") {
    return rows;
  }

  return rows.filter((row) => row.assetType === selectedView);
}

function getSaleIncomeRow(
  transaction: PortfolioTransaction,
  itemByStockId: Map<number, PortfolioItem>,
): SaleIncomeRow {
  const item =
    transaction.stockId === null
      ? undefined
      : itemByStockId.get(transaction.stockId);
  const totalSaleAmount = toNumber(transaction.totalAmount);
  const totalPurchaseAmount = getSalePurchaseAmount(transaction, item);
  const fee = toNumber(transaction.fee);
  const saleProfit = getRealizedProfit(
    transaction,
    totalSaleAmount,
    totalPurchaseAmount,
    fee,
  );

  return {
    assetType: getAssetTypeLabel(item),
    companyName: transaction.companyName,
    fee,
    id: transaction.id,
    profitRate: getProfitRate(saleProfit, totalPurchaseAmount),
    saleDate: formatDateTiny(transaction.executedAt),
    saleProfit,
    totalPurchaseAmount,
    totalQuantity: transaction.totalQuantity,
    totalSaleAmount,
  };
}

function getSaleProfit(rows: SaleIncomeRow[]) {
  if (rows.length === 0) {
    return 0;
  }

  if (rows.some((row) => row.saleProfit === null)) {
    return null;
  }

  return rows.reduce((total, row) => total + (row.saleProfit ?? 0), 0);
}

function getTotalAmount(
  transactions: PortfolioTransaction[],
  transactionType: PortfolioTransaction["transactionType"],
) {
  return transactions
    .filter((transaction) => transaction.transactionType === transactionType)
    .reduce(
      (total, transaction) => total + toNumber(transaction.totalAmount),
      0,
    );
}

function getAccountInterest(_transactions: PortfolioTransaction[]) {
  void _transactions;
  // TODO: 현재 포트폴리오 API에는 계좌이자 거래/필드가 없다. 계좌이자 데이터가 추가되면 여기에서 실제 값으로 교체한다.
  return 0;
}

function getSalePurchaseAmount(
  transaction: PortfolioTransaction,
  _item: PortfolioItem | undefined,
) {
  void _item;

  if (transaction.purchaseAmount === null) {
    return null;
  }

  return toNumber(transaction.purchaseAmount);
}

function getRealizedProfit(
  transaction: PortfolioTransaction,
  totalSaleAmount: number,
  totalPurchaseAmount: number | null,
  fee: number,
) {
  if (transaction.realizedProfit !== null) {
    return toNumber(transaction.realizedProfit);
  }

  if (totalPurchaseAmount === null) {
    return null;
  }

  return totalSaleAmount - totalPurchaseAmount - fee;
}

function getProfitRate(
  saleProfit: number | null,
  purchaseAmount: number | null,
) {
  if (saleProfit === null || !purchaseAmount) {
    return null;
  }

  return (saleProfit / purchaseAmount) * 100;
}

function getAssetTypeLabel(item: PortfolioItem | undefined) {
  if (item?.assetType === "DOMESTIC_STOCK") {
    return "국내주식";
  }

  if (item?.assetType === "FOREIGN_STOCK") {
    return "해외주식";
  }

  return "-";
}

function isSameIncomeMonth(value: string, month: IncomeMonth) {
  const incomeMonth = getIncomeMonth(value);

  return incomeMonth.year === month.year && incomeMonth.month === month.month;
}

function getIncomeMonth(value: string) {
  const [date] = value.split("T");
  const [year, month] = date.split("-").map(Number);

  return {
    month,
    year,
  };
}

function formatDateTiny(value: string) {
  const [date] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);

  return `${String(year).slice(2)}.${month}.${day}`;
}

function toNumber(value: number | string) {
  return Number(value);
}
