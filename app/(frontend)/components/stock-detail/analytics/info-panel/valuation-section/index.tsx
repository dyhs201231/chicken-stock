"use client";

import { useMemo, useState } from "react";
import ValuationChart from "../valuation-chart";
import { getValuationChartData, valuationLabels } from "../helpers";
import type { ValuationMetricTab } from "../types";
import type { StockOnlyProps } from "../../../../../types/stock/stock-detail";

const metricTabs: ValuationMetricTab[] = ["PER", "PBR"];
const industryLabels: Record<string, string> = {
  SEMICONDUCTOR: "반도체",
  SOFTWARE: "소프트웨어",
  AI: "AI",
  HARDWARE: "하드웨어",
  BIOTECH: "바이오테크",
  MEDICAL_DEVICE: "의료기기",
  BANK: "은행",
  INSURANCE: "보험",
  SECURITIES: "증권",
  RETAIL: "유통",
  FOOD: "식품",
  LUXURY: "명품",
};

export default function ValuationSection({ stock }: StockOnlyProps) {
  const [metric, setMetric] = useState<ValuationMetricTab>("PER");
  const chartData = useMemo(
    () => getValuationChartData(stock, metric),
    [metric, stock],
  );

  const industryLabel = industryLabels[stock.industry] ?? stock.industry;

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

      <ValuationChart
        data={chartData}
        industryLabel={industryLabel}
        metric={metric}
      />
    </section>
  );
}
