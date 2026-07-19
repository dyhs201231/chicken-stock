import { MarketApiError } from "./errors.ts";
import type {
  MarketIndexConfig,
} from "../market-data-collector.ts";
import type {
  MarketIndexCandleData,
} from "../../../(frontend)/types/market-index";

const PROVIDER_DECIMAL_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CANDLE_COUNT = 260;

function validationError(message: string, cause?: unknown) {
  return new MarketApiError("MARKET_API_VALIDATION", message, { cause });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(value: unknown, field: string) {
  if (!isRecord(value)) {
    throw validationError(`External market API ${field} must be an object`);
  }

  return value;
}

function getArray(value: unknown, field: string) {
  if (!Array.isArray(value)) {
    throw validationError(`External market API ${field} must be an array`);
  }

  return value;
}

function getFiniteNumber(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw validationError(`External market API ${field} must be finite`);
  }

  return value;
}

function getProviderDecimal(value: unknown, field: string) {
  if (
    typeof value !== "string" ||
    !PROVIDER_DECIMAL_PATTERN.test(value.trim())
  ) {
    throw validationError(
      `External market API ${field} must be a decimal string`,
    );
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw validationError(`External market API ${field} must be finite`);
  }

  return parsed;
}

function getDateKey(value: unknown, field: string) {
  if (typeof value !== "string" || !DATE_KEY_PATTERN.test(value)) {
    throw validationError(`External market API ${field} must be YYYY-MM-DD`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw validationError(`External market API ${field} is not a valid date`);
  }

  return value;
}

function validateCandle(candle: MarketIndexCandleData) {
  const { close, high, low, open, volume } = candle;

  if ([close, high, low, open].some((value) => value <= 0)) {
    throw validationError("External market API OHLC values must be positive");
  }

  if (volume < 0) {
    throw validationError("External market API volume must not be negative");
  }

  if (high < Math.max(open, close) || low > Math.min(open, close) || low > high) {
    throw validationError("External market API OHLC values are inconsistent");
  }

  return candle;
}

function normalizeCandles(
  candles: MarketIndexCandleData[],
  observedAt: Date,
) {
  if (!Number.isFinite(observedAt.getTime())) {
    throw validationError("Market observation time is invalid");
  }

  const cutoff = new Date(observedAt);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const observedDateKey = observedAt.toISOString().slice(0, 10);
  const byDate = new Map<string, MarketIndexCandleData>();

  candles.forEach((candle) => {
    if (candle.time > observedDateKey) {
      throw validationError("External market API candle cannot be in the future");
    }

    if (candle.time >= cutoffKey) {
      byDate.set(candle.time, validateCandle(candle));
    }
  });

  const normalized = [...byDate.values()]
    .sort((left, right) => left.time.localeCompare(right.time))
    .slice(-MAX_CANDLE_COUNT);

  if (normalized.length === 0) {
    throw validationError("External market API returned no valid candles");
  }

  return normalized;
}

export function parseYahooChartCandles(
  value: unknown,
  _config: MarketIndexConfig,
  observedAt: Date,
) {
  const root = getRecord(value, "response");
  const chart = getRecord(root.chart, "chart");

  if (chart.error !== null && chart.error !== undefined) {
    throw validationError("Yahoo Finance returned a chart error");
  }

  const results = getArray(chart.result, "chart.result");

  if (results.length === 0) {
    throw validationError("Yahoo Finance returned an empty result");
  }

  const result = getRecord(results[0], "chart.result[0]");
  const timestamps = getArray(result.timestamp, "timestamp");
  const indicators = getRecord(result.indicators, "indicators");
  const quotes = getArray(indicators.quote, "indicators.quote");
  const quote = getRecord(quotes[0], "indicators.quote[0]");

  if (timestamps.length === 0) {
    throw validationError("Yahoo Finance returned empty timestamps");
  }

  const requiredFields = ["open", "high", "low", "close"] as const;
  const arrays = Object.fromEntries(
    requiredFields.map((field) => [
      field,
      getArray(quote[field], `indicators.quote[0].${field}`),
    ]),
  ) as Record<(typeof requiredFields)[number], unknown[]>;
  const volumeValues =
    quote.volume === undefined
      ? undefined
      : getArray(quote.volume, "indicators.quote[0].volume");

  for (const values of [...Object.values(arrays), ...(volumeValues ? [volumeValues] : [])]) {
    if (values.length !== timestamps.length) {
      throw validationError("Yahoo Finance candle arrays have different lengths");
    }
  }

  const candles: MarketIndexCandleData[] = [];

  timestamps.forEach((timestampValue, index) => {
    const timestamp = getFiniteNumber(timestampValue, `timestamp[${index}]`);

    if (!Number.isInteger(timestamp) || timestamp <= 0) {
      throw validationError("Yahoo Finance timestamp must be a positive integer");
    }

    const ohlcValues = requiredFields.map((field) => arrays[field][index]);

    if (ohlcValues.every((fieldValue) => fieldValue === null)) {
      return;
    }

    if (ohlcValues.some((fieldValue) => fieldValue === null)) {
      throw validationError("Yahoo Finance returned a partially null candle");
    }

    const [open, high, low, close] = ohlcValues.map((fieldValue, valueIndex) =>
      getFiniteNumber(fieldValue, `${requiredFields[valueIndex]}[${index}]`),
    );
    const volumeValue = volumeValues?.[index];
    const volume =
      volumeValue === null || volumeValue === undefined
        ? 0
        : getFiniteNumber(volumeValue, `volume[${index}]`);
    const date = new Date(timestamp * 1_000);

    if (!Number.isFinite(date.getTime())) {
      throw validationError("Yahoo Finance timestamp is invalid");
    }

    candles.push({
      close,
      high,
      low,
      open,
      time: date.toISOString().slice(0, 10),
      volume,
    });
  });

  return normalizeCandles(candles, observedAt);
}

export function parseTwelveDataCandles(
  value: unknown,
  _config: MarketIndexConfig,
  observedAt: Date,
  expectedSymbol: string,
) {
  const root = getRecord(value, "response");

  if (root.status !== "ok") {
    throw validationError("Twelve Data response status is not ok");
  }

  const meta = getRecord(root.meta, "meta");

  if (meta.symbol !== expectedSymbol) {
    throw validationError("Twelve Data response symbol does not match request");
  }

  const values = getArray(root.values, "values");

  if (values.length === 0) {
    throw validationError("Twelve Data returned empty values");
  }

  const candles = values.map((item, index) => {
    const candle = getRecord(item, `values[${index}]`);
    const volume =
      candle.volume === undefined
        ? 0
        : getProviderDecimal(candle.volume, `values[${index}].volume`);

    return {
      close: getProviderDecimal(candle.close, `values[${index}].close`),
      high: getProviderDecimal(candle.high, `values[${index}].high`),
      low: getProviderDecimal(candle.low, `values[${index}].low`),
      open: getProviderDecimal(candle.open, `values[${index}].open`),
      time: getDateKey(candle.datetime, `values[${index}].datetime`),
      volume,
    } satisfies MarketIndexCandleData;
  });

  return normalizeCandles(candles, observedAt);
}
