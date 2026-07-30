"use client";

import type { ChartDatum, ValuationMetricTab } from "../types";

type ValuationChartProps = {
  data: ChartDatum[];
  industryLabel: string;
  metric: ValuationMetricTab;
};

type BarSpec = {
  key: "stockValue" | "industryValue";
  label: string;
  className: string;
};

export default function ValuationChart({
  data,
  industryLabel,
  metric,
}: ValuationChartProps) {
  const bars: BarSpec[] = [
    {
      key: "stockValue",
      label: "조회종목",
      className: "bg-[#e989dc] ring-2 ring-[#d65ccd]",
    },
    {
      key: "industryValue",
      label: industryLabel,
      className: "bg-[#bdf5e5] ring-2 ring-[#75e5ca]",
    },
  ];

  const values = data.flatMap((item) =>
    bars
      .map((bar) => item[bar.key])
      .filter((value): value is number => value !== undefined),
  );

  const maxValue = Math.max(...values, 1);
  const hasData = values.length > 0;

  return (
    <div className="w-full min-w-0">
      <div className="relative h-48 px-1 pb-7 md:px-4">
        {hasData && (
          <>
            <div className="pointer-events-none absolute inset-x-1 top-0 bottom-7 grid grid-cols-4 border-l border-zinc-200 md:inset-x-4">
              <span />
              <span className="border-r border-zinc-200" />
              <span className="border- border-zinc-200" />
              <span className="border-r border-zinc-200" />
            </div>

            <div className="relative z-10 grid h-full grid-cols-2 gap-3 md:gap-8">
              {data.map((item) => (
                <div
                  className="grid min-w-0 grid-rows-[1fr_auto] gap-1"
                  key={item.label}
                >
                  <div className="flex items-end justify-center gap-2 border-b border-zinc-200 md:gap-5">
                    {bars.map((bar) => {
                      const value = item[bar.key];
                      const height =
                        value === undefined
                          ? 0
                          : Math.max((value / maxValue) * 100, 4);

                      return (
                        <div
                          className="flex h-full w-6 flex-col justify-end md:w-8"
                          key={bar.key}
                        >
                          {value !== undefined && (
                            <div className="mb-2 -translate-x-0.5 text-center text-[10px] whitespace-nowrap text-zinc-500 md:text-xs">
                              {value.toLocaleString("ko-KR", {
                                maximumFractionDigits: 2,
                              })}
                              배
                            </div>
                          )}

                          <span
                            aria-label={`${item.label} ${bar.label} ${metric}`}
                            className={`w-6 rounded-t-sm md:w-8 ${bar.className}`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <span className="truncate text-center text-xs text-zinc-500">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {!hasData && (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500">
            표시할 가치평가 데이터가 없습니다.
          </div>
        )}
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-96 items-center justify-center gap-3 rounded-xl bg-zinc-100 px-2 py-3 text-xs font-semibold md:mt-5 md:gap-6 md:rounded-2xl md:px-4 md:py-4 md:text-sm">
        <span className="flex items-center gap-1.5 md:gap-2">
          <span className="size-3 bg-[#e989dc]" />
          조회종목
        </span>

        <span className="h-5 w-px bg-zinc-900" />

        <span className="flex items-center gap-1.5 md:gap-2">
          <span className="size-3 bg-[#bdf5e5]" />
          {industryLabel}
        </span>
      </div>
    </div>
  );
}
