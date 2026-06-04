import type { CandleRange } from "./types";

export const RISE_COLOR = "#FF0505";
export const FALL_COLOR = "#0084FF";
export const GUIDE_COLOR = "#75D291";
export const GRID_COLOR = "#7B787833";
export const CROSSHAIR_COLOR = "#222222";
export const AXIS_TICK_MIN_SPACING = 52;
export const PRICE_AXIS_TICK_COUNT = 8;

export const rangeTabs: Array<{ label: string; value: CandleRange }> = [
  { label: "일", value: "daily" },
  { label: "주", value: "weekly" },
  { label: "월", value: "monthly" },
];
