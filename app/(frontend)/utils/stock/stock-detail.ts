import { StockDetailData } from "../../types/stock/stock-detail";

export function getLogoLabel(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export function getLogoColorClassName(stockId: number) {
  const classNames = [
    "border-red-200 bg-red-100 text-red-700",
    "border-orange-200 bg-orange-100 text-orange-700",
    "border-amber-200 bg-amber-100 text-amber-700",
    "border-emerald-200 bg-emerald-100 text-emerald-700",
    "border-cyan-200 bg-cyan-100 text-cyan-700",
    "border-blue-200 bg-blue-100 text-blue-700",
    "border-indigo-200 bg-indigo-100 text-indigo-700",
    "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700",
  ];

  return classNames[stockId % classNames.length];
}

export function isUsableImageUrl(value: string | undefined) {
  if (!value) {
    return false;
  }

  if (value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits,
  }).format(value);
}

export function formatPrice(
  value: number,
  currencyCode: StockDetailData["currencyCode"],
) {
  if (currencyCode === "KRW") {
    return `${formatNumber(value)}원`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPlainPrice(
  value: number,
  currencyCode: StockDetailData["currencyCode"],
) {
  return currencyCode === "KRW" ? formatNumber(value) : value.toFixed(2);
}

export function formatWon(value: number) {
  return `${formatNumber(value)}원`;
}

export function formatChange(
  value: number,
  currencyCode: StockDetailData["currencyCode"],
) {
  const sign = value > 0 ? "+" : "";
  const unit = currencyCode === "KRW" ? "원" : "";

  return `${sign}${formatNumber(value, 2)}${unit}`;
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

export function formatTradingValue(
  value: number,
  currencyCode: StockDetailData["currencyCode"],
) {
  if (currencyCode === "KRW" && Math.abs(value) >= 100_000_000) {
    return `${formatNumber(value / 100_000_000, 1)}억`;
  }

  return formatPrice(value, currencyCode);
}

export function formatDateLabel(timestamp: number) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getMonth() + 1}월`;
}
