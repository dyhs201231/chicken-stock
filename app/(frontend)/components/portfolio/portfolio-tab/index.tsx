"use client";

import { Tab } from "@/app/(frontend)/components/ui";
import { PORTFOLIO_TAB } from "@/app/(frontend)/constants/portfolio";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import { toast } from "sonner";

export default function PortfolioTab() {
  const { selectedTab, setSelectedTab } = usePortfolioStore();

  return (
    <Tab.Root
      defaultValue={selectedTab}
      direction="row"
      type="fill"
      className="mb-8 w-full overflow-x-auto rounded-none border-b border-(--cs-border-strong) bg-transparent p-0 md:mb-12"
    >
      {PORTFOLIO_TAB.map((tab) => (
        <Tab.Item
          key={tab}
          className="shrink-0 rounded-none px-5 py-3 text-base font-semibold md:px-10 md:py-4 md:text-xl"
          activeClassName="bg-(--cs-brand-100) text-(--cs-brand-800)"
          value={tab}
          onClick={() => {
            if (tab === "예상 배당금") {
              return toast.warning("준비 중입니다.");
            }

            setSelectedTab(tab);
          }}
        >
          {tab}
        </Tab.Item>
      ))}
    </Tab.Root>
  );
}
