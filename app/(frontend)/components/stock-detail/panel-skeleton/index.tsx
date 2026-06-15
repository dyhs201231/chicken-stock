"use client";

import { twMerge } from "tailwind-merge";

type StockDetailPanelSkeletonProps = {
  className?: string;
  label: string;
};

export default function StockDetailPanelSkeleton({
  className,
  label,
}: StockDetailPanelSkeletonProps) {
  return (
    <section
      className={twMerge(
        "grid h-130 place-items-center rounded-3xl bg-white px-7 py-6 text-sm text-zinc-500 shadow-[0_10px_18px_rgba(0,0,0,0.22)]",
        className,
      )}
    >
      {label}
    </section>
  );
}
