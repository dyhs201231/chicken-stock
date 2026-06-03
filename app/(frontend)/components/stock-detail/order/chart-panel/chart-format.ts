import type { CandlestickData, Time } from "lightweight-charts";
import type {
  AxisTickLabel,
  CandleRange,
  ChartCandleData,
  OhlcItem,
} from "./types";
import { AXIS_TICK_MIN_SPACING } from "./constants";

export function getChangeRate(value: number, base: number) {
  if (!Number.isFinite(base) || base === 0) {
    return 0;
  }

  return ((value - base) / base) * 100;
}

export function getShortDateLabel(time: string) {
  return time.replace(/^20/, "").replaceAll("-", ".");
}

export function getOhlcItems(
  candle: ChartCandleData | undefined,
  basePrice: number,
): OhlcItem[] {
  if (!candle) {
    return [];
  }

  return [
    { label: "시작", value: candle.open },
    { label: "고가", value: candle.high },
    { label: "저가", value: candle.low },
    { label: "종가", value: candle.close },
  ].map((item) => ({
    ...item,
    rate: getChangeRate(item.value, basePrice),
  }));
}

export function clampPosition(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function formatTimeLabel(time: Time) {
  if (typeof time === "string") {
    return time;
  }

  if (typeof time === "number") {
    return new Date(time * 1000).toISOString().slice(0, 10);
  }

  return `${time.year}-${String(time.month).padStart(2, "0")}-${String(
    time.day,
  ).padStart(2, "0")}`;
}

export function formatMonthTickLabel(time: Time) {
  const dateLabel = formatTimeLabel(time);
  const month = Number(dateLabel.slice(5, 7));

  return Number.isFinite(month) ? `${month}월` : dateLabel;
}

export function formatDayTickLabel(time: Time) {
  const dateLabel = formatTimeLabel(time);
  const day = Number(dateLabel.slice(8, 10));

  return Number.isFinite(day) ? `${day}일` : dateLabel;
}

export function formatCrosshairDateLabel(time: Time, range: CandleRange) {
  const dateLabel = formatTimeLabel(time);

  return range === "monthly" ? dateLabel.slice(0, 7) : dateLabel;
}

export function getSpacedAxisTickLabels(labels: AxisTickLabel[]) {
  return labels.reduce<AxisTickLabel[]>((spacedLabels, label) => {
    if (label.isMonth) {
      return [
        ...spacedLabels.filter(
          (spacedLabel) =>
            Math.abs(spacedLabel.left - label.left) >= AXIS_TICK_MIN_SPACING,
        ),
        label,
      ];
    }

    const hasNearbyLabel = spacedLabels.some(
      (spacedLabel) =>
        Math.abs(spacedLabel.left - label.left) < AXIS_TICK_MIN_SPACING,
    );

    return hasNearbyLabel ? spacedLabels : [...spacedLabels, label];
  }, []);
}

export function isCandlestickData(
  value: unknown,
): value is CandlestickData<Time> {
  return (
    !!value &&
    typeof value === "object" &&
    "open" in value &&
    "high" in value &&
    "low" in value &&
    "close" in value
  );
}

export function toChartCandleData(
  candle: CandlestickData<Time>,
): ChartCandleData {
  return {
    time: formatTimeLabel(candle.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };
}
