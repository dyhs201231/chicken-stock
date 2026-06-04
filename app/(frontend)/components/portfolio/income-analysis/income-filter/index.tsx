import { twMerge } from "tailwind-merge";
import type { IncomeAnalysisView } from "@/app/(frontend)/types/portfolio/income-analysis";

const incomeAnalysisViews: IncomeAnalysisView[] = [
  "전체",
  "국내주식",
  "해외주식",
];

interface IncomeFilterProps {
  selectedView: IncomeAnalysisView;
  setSelectedView: (view: IncomeAnalysisView) => void;
}

export default function IncomeFilter({
  selectedView,
  setSelectedView,
}: IncomeFilterProps) {
  return (
    <div className="row gap-10 text-sm font-medium">
      <span className="pb-1">판매수익</span>

      {incomeAnalysisViews.map((view) => (
        <button
          key={view}
          className={twMerge(
            "cursor-pointer",
            selectedView === view && "border-b border-black",
          )}
          type="button"
          onClick={() => setSelectedView(view)}
        >
          {view}
        </button>
      ))}
    </div>
  );
}
