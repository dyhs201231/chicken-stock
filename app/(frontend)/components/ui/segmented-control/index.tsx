"use client";

import { useId, useState } from "react";
import { twMerge } from "tailwind-merge";

type SegmentedStyle = "panel" | "invertedPanel" | "text";
type SegmentedOption = {
  label: string;
  value: string;
  disabled?: boolean;
  className?: string;
  selected?: string;
};
type SegmentedControlProps = {
  "aria-label": string;
  options: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  style?: SegmentedStyle;
  className?: string;
  onValueChange?: (value: string) => void;
};

const selectedVariants: Record<SegmentedStyle, string> = {
  panel: "bg-white text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.12)]",
  invertedPanel:
    "bg-zinc-200 text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.12)]",
  text: "text-white",
};

export default function SegmentedControl({
  "aria-label": ariaLabel,
  style = "panel",
  className = "",
  options,
  value,
  defaultValue,
  onValueChange,
}: SegmentedControlProps) {
  const groupId = useId();
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? options[0]?.value,
  );
  const selectedValue = value ?? internalValue;
  const selectValue = (nextValue: string) => {
    setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <div
      aria-label={ariaLabel}
      className={twMerge(
        "inline-flex h-8 items-center rounded-md p-0.5 text-sm font-semibold text-zinc-950",
        style === "invertedPanel" ? "bg-white" : "bg-zinc-200",
        className,
      )}
      role="radiogroup"
    >
      {options.map((option) => {
        const selected = option.value === selectedValue;
        const id = `${groupId}-${option.value}`;

        return (
          <label
            key={option.value}
            htmlFor={id}
            className={twMerge(
              "relative inline-flex h-7 min-w-12 cursor-pointer items-center justify-center rounded px-3 transition",
              selected
                ? selectedVariants[style]
                : "text-zinc-500 hover:text-zinc-800",
              option.disabled ? "cursor-not-allowed opacity-45" : undefined,
              option.className,
              selected ? option.selected : undefined,
            )}
          >
            <input
              id={id}
              checked={selected}
              className="sr-only"
              disabled={option.disabled}
              name={groupId}
              onChange={() => selectValue(option.value)}
              type="radio"
              value={option.value}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
