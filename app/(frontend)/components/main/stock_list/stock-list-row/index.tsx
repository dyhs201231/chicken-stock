import type { StockData, StockTrend } from "../types";

type StockListRowProps = {
  stock: StockData;
};

function getChangeRateClassName(trend: StockTrend) {
  if (trend === "up") {
    return "bg-red-200 text-zinc-950";
  }

  return "bg-indigo-200 text-zinc-950";
}

export default function StockListRow({ stock }: StockListRowProps) {
  const changeRateClassName = getChangeRateClassName(stock.trend);

  return (
    <li className="grid grid-cols-[2.5rem_3.25rem_minmax(16rem,1fr)_12rem_minmax(8rem,1fr)_10rem_12rem] items-center gap-4 py-3 text-lg">
      <span className="text-left text-base">{stock.rank}</span>

      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${stock.logoClassName}`}
        aria-hidden="true"
      >
        {stock.logoLabel}
      </span>

      <strong className="truncate text-left text-lg font-semibold">
        {stock.name}
      </strong>

      <span className="col-start-4 text-right">{stock.price}</span>

      <span className="col-start-5 translate-x-1/2 text-center">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-base ${changeRateClassName}`}
        >
          {stock.changeRate}
        </span>
      </span>

      <span className="col-start-7 text-right">{stock.tradingAmount}</span>
    </li>
  );
}
