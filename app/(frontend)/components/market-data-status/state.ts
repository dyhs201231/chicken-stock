import type { MarketDataResult } from "../../types/market-index";

const koreanDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  day: "numeric",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  month: "numeric",
  timeZone: "Asia/Seoul",
  year: "numeric",
});

export function getMarketDataStatusText<T>(result: MarketDataResult<T>) {
  if (result.status === "success") {
    return null;
  }

  if (result.status === "error") {
    return {
      title: "정보를 불러오지 못했습니다.",
      updatedAt: null,
    };
  }

  const updatedAt = new Date(result.updatedAt);

  return {
    title: "최근 업데이트된 데이터를 표시하고 있습니다.",
    updatedAt: Number.isFinite(updatedAt.getTime())
      ? koreanDateTimeFormatter.format(updatedAt)
      : null,
  };
}
