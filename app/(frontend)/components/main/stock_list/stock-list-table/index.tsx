import StockListRow from "../stock-list-row";
import type { StockData, StockRankingKey } from "../types";

type StockListTableProps = {
  basisLabel: string;
  stocks: StockData[];
  selectedRanking: StockRankingKey;
  isError?: boolean;
  isLoading?: boolean;
};

function getRankingLabel(selectedRanking: StockRankingKey) {
  if (selectedRanking === "tradingVolume") {
    return "거래량 순";
  }

  return "거래대금 순";
}

export default function StockListTable({
  basisLabel,
  isError = false,
  isLoading = false,
  stocks,
  selectedRanking,
}: StockListTableProps) {
  const rankingLabel = getRankingLabel(selectedRanking);

  return (
    <>
      <div className="grid min-w-230 grid-cols-[2.5rem_3.25rem_minmax(16rem,1fr)_12rem_minmax(8rem,1fr)_10rem_12rem] items-center gap-4 border-b border-(--cs-border-subtle) pb-3 text-sm text-(--cs-text-muted)">
        <span className="col-span-3 flex h-4 items-center text-left leading-none">
          순위 / 오늘 {basisLabel}
        </span>
        <span className="col-start-4 flex h-4 items-center justify-end leading-none">
          현재가
        </span>
        <span className="col-start-5 flex h-4 translate-x-1/2 items-center justify-center leading-none">
          등락률
        </span>
        <span className="col-start-7 flex h-4 items-center justify-end leading-none">
          {rankingLabel}
        </span>
      </div>

      {isError && stocks.length === 0 && (
        <div className="py-16 text-center text-base text-red-500" role="alert">
          종목 순위를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </div>
      )}

      {!isError && isLoading && (
        <div className="py-16 text-center text-base text-zinc-500">
          종목을 불러오는 중입니다.
        </div>
      )}

      {!isError && !isLoading && stocks.length === 0 && (
        <div className="py-16 text-center text-base text-zinc-500">
          표시할 종목이 없습니다.
        </div>
      )}

      {stocks.length > 0 && (
        <ol className="min-w-230">
          {stocks.map((stock) => (
            <StockListRow key={stock.id} stock={stock} />
          ))}
        </ol>
      )}
    </>
  );
}
