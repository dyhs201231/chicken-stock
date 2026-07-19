import type { MarketDataResult } from "../../types/market-index";
import { getMarketDataStatusText } from "./state";

export default function MarketDataStatus<T>({
  fallbackTitle,
  onRetry,
  result,
}: {
  fallbackTitle?: string;
  onRetry?: () => void;
  result: MarketDataResult<T>;
}) {
  const status = getMarketDataStatusText(result);

  if (!status) {
    return null;
  }

  return (
    <div className="mt-2 text-sm text-zinc-500" role="status">
      <p>
        {result.status === "fallback" && fallbackTitle
          ? fallbackTitle
          : status.title}
      </p>
      {status.updatedAt && <p>마지막 갱신 {status.updatedAt}</p>}
      {result.status === "error" && onRetry && (
        <button className="mt-1 cursor-pointer underline" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}
