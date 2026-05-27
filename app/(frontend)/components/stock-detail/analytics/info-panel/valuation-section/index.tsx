"use client";

import { useMemo, useState } from "react";
import type { StockOnlyProps } from "../../../../../types/stock/stock-detail";
import {
  formatMultiple,
  getValuationChartData,
  valuationLabels,
} from "../helpers";
import type { ValuationMetricTab } from "../types";
import MetricCard from "../metric-card";
import ValuationChart from "../valuation-chart";

const metricTabs: ValuationMetricTab[] = ["PER", "PBR"];

export default function ValuationSection({ stock }: StockOnlyProps) {
  const [metric, setMetric] = useState<ValuationMetricTab>("PER");
  const chartData = useMemo(() => getValuationChartData(stock), [stock]);

  return (
    <section>
      <h3 className="mb-4 text-2xl font-semibold tracking-normal">가치평가</h3>
      <div className="mb-4 flex gap-5 text-xs">
        {metricTabs.map((tab) => (
          <button
            key={tab}
            className={`px-0 py-1 ${metric === tab ? "font-bold" : ""}`}
            type="button"
            onClick={() => setMetric(tab)}
          >
            {valuationLabels[tab]}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <MetricCard
          label="PER"
          value={formatMultiple(stock.financialMetric?.per)}
        />

        <MetricCard
          label="PBR"
          value={formatMultiple(stock.financialMetric?.pbr)}
        />
      </div>

      <ValuationChart data={chartData} metric={metric} />
    </section>
  );
}
