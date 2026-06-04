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
      className="w-fit rounded-none border-b border-[#D9D9D9] p-0"
    >
      {PORTFOLIO_TAB.map((tab) => (
        <Tab.Item
          key={tab}
          className="px-15 py-4.5 text-xl font-semibold"
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
