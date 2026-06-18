import type {
  PortfolioItem,
  PortfolioTransaction,
  PortfolioTransactionType,
} from "@/app/(frontend)/apis/portfolio/api";
import type { TransactionHistoryFilter } from "@/app/(frontend)/types/portfolio";

const transactionLabels: Record<PortfolioTransactionType, string> = {
  BUY: "구매",
  DEPOSIT: "입금",
  DIVIDEND: "배당",
  EXCHANGE: "환전",
  SELL: "판매",
  WITHDRAWAL: "출금",
};

export function getFilteredTransactions(
  transactions: PortfolioTransaction[],
  filter: TransactionHistoryFilter,
) {
  if (filter === "전체") {
    return transactions;
  }

  if (filter === "거래") {
    return transactions.filter(
      (transaction) => transaction.transactionType !== "EXCHANGE",
    );
  }

  if (filter === "환전") {
    return transactions.filter(
      (transaction) => transaction.transactionType === "EXCHANGE",
    );
  }

  return [];
}

export function getTransactionDetailRows(transaction: PortfolioTransaction) {
  if (transaction.transactionType === "EXCHANGE") {
    return getExchangeDetailRows(transaction);
  }

  if (
    transaction.transactionType === "DEPOSIT" ||
    transaction.transactionType === "WITHDRAWAL"
  ) {
    return getCashDetailRows(transaction);
  }

  const label = getTransactionLabel(transaction.transactionType);

  return [
    {
      label: "거래유형",
      value: label,
    },
    {
      label: `${label}일`,
      value: formatDateKorean(transaction.executedAt),
    },
    {
      label: getSettlementDateLabel(transaction.transactionType),
      value: formatDateKorean(transaction.withdrawalAt),
    },
    {
      label: `총 ${label}수량`,
      value: `${transaction.totalQuantity.toLocaleString()}주`,
    },
    {
      label: `총 ${label}금액`,
      value: formatWon(transaction.totalAmount),
    },
    {
      label: "수수료",
      value: formatWon(transaction.fee),
    },
  ];
}

export function getTransactionLabel(type: PortfolioTransactionType) {
  return transactionLabels[type];
}

export function getTransactionToneClassName(type: PortfolioTransactionType) {
  if (type === "EXCHANGE") {
    return "text-[#555555]";
  }

  if (type === "BUY" || type === "WITHDRAWAL") {
    return "text-(--cs-color-red-600)";
  }

  if (type === "SELL") {
    return "text-[#0066ff]";
  }

  return "text-[#1a7f37]";
}

export function getLogoText(
  item: PortfolioItem | undefined,
  companyName: string,
) {
  if (companyName.includes("환전")) {
    return "환전";
  }

  if (companyName.includes("충전") || companyName.includes("입금")) {
    return "원화";
  }

  if (companyName.includes("삼성")) {
    return "SAMSUNG";
  }

  return (item?.companyName ?? companyName).slice(0, 2).toUpperCase();
}

export function formatDateShort(value: string) {
  const { month, day } = parseDateParts(value);

  return `${month}.${day}`;
}

export function formatTransactionAmount(transaction: PortfolioTransaction) {
  if (transaction.transactionType === "EXCHANGE") {
    return `-${formatCurrencyAmount(
      transaction.paidAmount ?? transaction.totalAmount,
      getExchangeSourceCurrency(transaction.exchangeType),
    )}`;
  }

  const sign =
    transaction.transactionType === "BUY" ||
    transaction.transactionType === "WITHDRAWAL"
      ? "-"
      : "";

  return `${sign}${formatWon(transaction.totalAmount)}`;
}

export function formatWon(value: number | string) {
  return `${Number(value).toLocaleString("ko-KR", {
    maximumFractionDigits: 0,
  })}원`;
}

export function formatUsd(value: number | string) {
  return `${Number(value).toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  })}달러`;
}

function getSettlementDateLabel(type: PortfolioTransactionType) {
  if (type === "EXCHANGE") {
    return "처리일";
  }

  if (type === "SELL" || type === "DEPOSIT") {
    return "입금일";
  }

  if (type === "DIVIDEND") {
    return "지급일";
  }

  return "출금일";
}

function getCashDetailRows(transaction: PortfolioTransaction) {
  const label = getTransactionLabel(transaction.transactionType);

  return [
    {
      label: "거래유형",
      value: label,
    },
    {
      label: `${label}일`,
      value: formatDateKorean(transaction.executedAt),
    },
    {
      label: `총 ${label}금액`,
      value: formatWon(transaction.totalAmount),
    },
    {
      label: "수수료",
      value: formatWon(transaction.fee),
    },
  ];
}

function formatDateKorean(value: string) {
  const { year, month, day } = parseDateParts(value);

  return `${year}년 ${month}월 ${day}일`;
}

function parseDateParts(value: string) {
  const [date] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);

  return {
    day,
    month,
    year,
  };
}

function getExchangeDetailRows(transaction: PortfolioTransaction) {
  const paidAmount = transaction.paidAmount ?? transaction.totalAmount;
  const receivedAmount = transaction.receivedAmount ?? "0";
  const sourceCurrency = getExchangeSourceCurrency(transaction.exchangeType);
  const targetCurrency = getExchangeTargetCurrency(transaction.exchangeType);

  return [
    {
      label: "거래유형",
      value: "환전",
    },
    {
      label: "환전일",
      value: formatDateKorean(transaction.executedAt),
    },
    {
      label: "환전방향",
      value: `${sourceCurrency} -> ${targetCurrency}`,
    },
    {
      label: "환전금액",
      value: formatCurrencyAmount(paidAmount, sourceCurrency),
    },
    {
      label: "환전결과",
      value: formatCurrencyAmount(receivedAmount, targetCurrency),
    },
    {
      label: "적용환율",
      value: transaction.exchangeRate
        ? `${Number(transaction.exchangeRate).toLocaleString("ko-KR")}원`
        : "-",
    },
    {
      label: "수수료",
      value: formatWon(transaction.fee),
    },
  ];
}

function getExchangeSourceCurrency(exchangeType: string | null) {
  return exchangeType === "usdToKrw" ? "달러" : "원화";
}

function getExchangeTargetCurrency(exchangeType: string | null) {
  return exchangeType === "usdToKrw" ? "원화" : "달러";
}

function formatCurrencyAmount(value: number | string, currency: string) {
  return currency === "달러" ? formatUsd(value) : formatWon(value);
}
