import { colorToken } from "@/app/(frontend)/constants/design-token";
import type { CandleRange } from "./types";

export const RISE_COLOR = colorToken.red[500];
export const FALL_COLOR = colorToken.blue[700];
export const GUIDE_COLOR = colorToken.green[100];
export const GRID_COLOR = `${colorToken.gray[700]}33`;
export const CROSSHAIR_COLOR = "#222222";
export const AXIS_TICK_MIN_SPACING = 52;
export const PRICE_AXIS_TICK_COUNT = 8;

export const rangeTabs: Array<{ label: string; value: CandleRange }> = [
  { label: "일", value: "daily" },
  { label: "주", value: "weekly" },
  { label: "월", value: "monthly" },
];
