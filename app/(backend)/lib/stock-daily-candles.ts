import { Prisma } from "../generated/prisma/client.ts";
import { parseMarketTimeToMinutes } from "./market-time.ts";

const DAILY_CANDLE_INTERVAL_CODE = "1D";
const CANDLE_UPSERT_BATCH_SIZE = 250;
const MIN_PRICE = 0.01;

type MarketCountryCode = "KR" | "US";

type MarketConfig = {
  closeHour: number;
  closeMinute: number;
  timeZone: string;
};

type ZonedDateTimeParts = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  weekday: string;
  year: number;
};

type ExistingDailyCandle = {
  closePrice: number;
  highPrice: number;
  intervalCode: string;
  lowPrice: number;
  openPrice: number;
  timestamp: bigint;
  tradingValue: number;
  volume: number;
};

type MissingDailyCandle = ExistingDailyCandle & {
  ticker: string;
};

type StockQuoteUpdate = {
  changeAmount: number;
  changeRate: number;
  currentPrice: number;
  dayHigh: number;
  dayLow: number;
  high52w: number;
  low52w: number;
  previousClose: number;
  tradingValue: number;
  volume: number;
};

type BuildMissingDailyCandlesParams = {
  completedDateKeys: string[];
  existingCandles: ExistingDailyCandle[];
  fallbackPrice: number;
  ticker: string;
};

type GetCompletedMarketDateKeysParams = {
  closedDateKeys?: Iterable<string>;
  closeTimeByDateKey?: ReadonlyMap<string, string | null>;
  countryCode: MarketCountryCode;
  lookbackDays: number;
  now?: Date;
};

type EnsureListedDailyCandlesOptions = {
  countryCode?: MarketCountryCode;
  lookbackDays?: number;
  now?: Date;
};

const MARKET_CONFIGS: Record<MarketCountryCode, MarketConfig> = {
  KR: {
    closeHour: 15,
    closeMinute: 30,
    timeZone: "Asia/Seoul",
  },
  US: {
    closeHour: 16,
    closeMinute: 0,
    timeZone: "America/New_York",
  },
};

function getZonedDateTimeParts(
  date: Date,
  timeZone: string,
): ZonedDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    weekday: "short",
    year: "numeric",
  }).formatToParts(date);
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    day: Number(getPart("day")),
    hour: Number(getPart("hour")),
    minute: Number(getPart("minute")),
    month: Number(getPart("month")),
    weekday: getPart("weekday"),
    year: Number(getPart("year")),
  };
}

function getDateKey(parts: Pick<ZonedDateTimeParts, "day" | "month" | "year">) {
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function getDateKeyTimestamp(dateKey: string) {
  return BigInt(new Date(`${dateKey}T00:00:00.000Z`).getTime());
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function isWeekend(dateKey: string) {
  const day = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();

  return day === 0 || day === 6;
}

function toMinutes(hour: number, minute: number) {
  return hour * 60 + minute;
}

function toFinitePrice(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    return value.toNumber();
  }

  return Number(value);
}

function toDecimal(value: number, decimalPlaces = 2) {
  return new Prisma.Decimal(value.toFixed(decimalPlaces));
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getDeterministicUnit(seed: string, salt: string) {
  return hashString(`${seed}:${salt}`) / 0xffffffff;
}

function getDeterministicRate(seed: string, salt: string, maxAbsRate: number) {
  return (getDeterministicUnit(seed, salt) * 2 - 1) * maxAbsRate;
}

function roundPrice(value: number) {
  return Math.max(MIN_PRICE, Math.round(value * 100) / 100);
}

function getEstimatedTradingValue(candle: {
  closePrice: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  volume: number;
}) {
  const typicalPrice =
    (candle.openPrice +
      candle.highPrice +
      candle.lowPrice +
      candle.closePrice) /
    4;

  return Math.round(typicalPrice * candle.volume * 100) / 100;
}

function getPriceTick(price: number) {
  return price >= 1000 ? 1 : MIN_PRICE;
}

function isInactiveFlatCandle(candle: ExistingDailyCandle) {
  return (
    candle.volume === 0 &&
    candle.openPrice === candle.highPrice &&
    candle.highPrice === candle.lowPrice &&
    candle.lowPrice === candle.closePrice
  );
}

function buildMarketLikeDailyCandle({
  dateKey,
  previousClose,
  ticker,
}: {
  dateKey: string;
  previousClose: number;
  ticker: string;
}): MissingDailyCandle {
  const seed = `${ticker}:${dateKey}`;
  const openPrice = roundPrice(
    previousClose * (1 + getDeterministicRate(seed, "open", 0.008)),
  );
  let closePrice = roundPrice(
    openPrice * (1 + getDeterministicRate(seed, "close", 0.026)),
  );

  if (closePrice === openPrice) {
    const direction = getDeterministicUnit(seed, "direction") >= 0.5 ? 1 : -1;

    closePrice = roundPrice(openPrice + getPriceTick(openPrice) * direction);
  }

  const highExtraRate = 0.003 + getDeterministicUnit(seed, "high") * 0.018;
  const lowExtraRate = 0.003 + getDeterministicUnit(seed, "low") * 0.018;
  const highPrice = roundPrice(
    Math.max(openPrice, closePrice) * (1 + highExtraRate),
  );
  const lowPrice = roundPrice(
    Math.min(openPrice, closePrice) * (1 - lowExtraRate),
  );
  const volume =
    1_000 + Math.floor(getDeterministicUnit(seed, "volume") * 49_000);
  const candle = {
    closePrice,
    highPrice: Math.max(highPrice, openPrice, closePrice),
    intervalCode: DAILY_CANDLE_INTERVAL_CODE,
    lowPrice: Math.max(MIN_PRICE, Math.min(lowPrice, openPrice, closePrice)),
    openPrice,
    ticker,
    timestamp: getDateKeyTimestamp(dateKey),
    volume,
  };

  return {
    ...candle,
    tradingValue: getEstimatedTradingValue(candle),
  };
}

function toMarketCountryCode(countryCode: string): MarketCountryCode {
  return countryCode === "US" ? "US" : "KR";
}

function isCurrentMarketDateCompleted(
  now: Date,
  config: MarketConfig,
  currentMarketDateKey: string,
  dateKey: string,
  closeTime: string | null | undefined,
) {
  if (dateKey !== currentMarketDateKey) {
    return true;
  }

  const parts = getZonedDateTimeParts(now, config.timeZone);
  const closeMinutes =
    parseMarketTimeToMinutes(closeTime) ??
    toMinutes(config.closeHour, config.closeMinute);

  return toMinutes(parts.hour, parts.minute) >= closeMinutes;
}

export function getMarketDateTimestamp(
  date: Date,
  countryCode: MarketCountryCode,
) {
  const config = MARKET_CONFIGS[countryCode];
  const parts = getZonedDateTimeParts(date, config.timeZone);

  return BigInt(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function getCompletedMarketDateKeys({
  closedDateKeys = [],
  closeTimeByDateKey = new Map(),
  countryCode,
  lookbackDays,
  now = new Date(),
}: GetCompletedMarketDateKeysParams) {
  const config = MARKET_CONFIGS[countryCode];
  const closedDates = new Set(closedDateKeys);
  const currentMarketDateKey = getDateKey(
    getZonedDateTimeParts(now, config.timeZone),
  );
  const completedDateKeys: string[] = [];
  let dateKey = currentMarketDateKey;

  while (completedDateKeys.length < lookbackDays) {
    if (
      !isWeekend(dateKey) &&
      !closedDates.has(dateKey) &&
      isCurrentMarketDateCompleted(
        now,
        config,
        currentMarketDateKey,
        dateKey,
        closeTimeByDateKey.get(dateKey),
      )
    ) {
      completedDateKeys.push(dateKey);
    }

    dateKey = addDays(dateKey, -1);
  }

  return completedDateKeys.reverse();
}

export function buildMissingDailyCandles({
  completedDateKeys,
  existingCandles,
  fallbackPrice,
  ticker,
}: BuildMissingDailyCandlesParams): MissingDailyCandle[] {
  const candlesByTimestamp = new Map(
    existingCandles.map((candle) => [candle.timestamp.toString(), candle]),
  );
  const sortedCandles = [...existingCandles].sort((left, right) =>
    left.timestamp < right.timestamp
      ? -1
      : left.timestamp > right.timestamp
        ? 1
        : 0,
  );
  const missingCandles: MissingDailyCandle[] = [];

  completedDateKeys.forEach((dateKey) => {
    const timestamp = getDateKeyTimestamp(dateKey);
    const existingCandle = candlesByTimestamp.get(timestamp.toString());

    if (existingCandle && !isInactiveFlatCandle(existingCandle)) {
      return;
    }

    const previousCandle = [...sortedCandles]
      .reverse()
      .find((candle) => candle.timestamp < timestamp);
    const closePrice = previousCandle?.closePrice ?? fallbackPrice;

    if (!Number.isFinite(closePrice) || closePrice <= 0) {
      return;
    }

    const candle = buildMarketLikeDailyCandle({
      dateKey,
      previousClose: closePrice,
      ticker,
    });

    missingCandles.push(candle);
    const existingIndex = sortedCandles.findIndex(
      (sortedCandle) => sortedCandle.timestamp === timestamp,
    );

    if (existingIndex >= 0) {
      sortedCandles[existingIndex] = candle;
    } else {
      sortedCandles.push(candle);
    }

    sortedCandles.sort((left, right) =>
      left.timestamp < right.timestamp
        ? -1
        : left.timestamp > right.timestamp
          ? 1
          : 0,
    );
    candlesByTimestamp.set(timestamp.toString(), candle);
  });

  return missingCandles;
}

export function buildStockQuoteUpdate({
  existingCandles,
  generatedCandles,
  high52w,
  low52w,
}: {
  existingCandles: ExistingDailyCandle[];
  generatedCandles: MissingDailyCandle[];
  high52w: number;
  low52w: number;
}): StockQuoteUpdate | null {
  if (generatedCandles.length === 0) {
    return null;
  }

  const candlesByTimestamp = new Map(
    existingCandles.map((candle) => [candle.timestamp.toString(), candle]),
  );
  generatedCandles.forEach((candle) => {
    candlesByTimestamp.set(candle.timestamp.toString(), candle);
  });
  const [latest, previous] = [...candlesByTimestamp.values()].sort(
    (left, right) =>
      left.timestamp > right.timestamp
        ? -1
        : left.timestamp < right.timestamp
          ? 1
          : 0,
  );

  if (!latest || !Number.isFinite(latest.closePrice) || latest.closePrice <= 0) {
    return null;
  }

  const previousClose =
    previous && previous.closePrice > 0 ? previous.closePrice : latest.closePrice;
  const changeAmount =
    Math.round((latest.closePrice - previousClose) * 100) / 100;
  const changeRate =
    Math.round((changeAmount / previousClose) * 100 * 10_000) / 10_000;

  return {
    changeAmount,
    changeRate,
    currentPrice: latest.closePrice,
    dayHigh: latest.highPrice,
    dayLow: latest.lowPrice,
    high52w: Math.max(high52w, latest.highPrice),
    low52w: Math.min(low52w, latest.lowPrice),
    previousClose,
    tradingValue: latest.tradingValue,
    volume: latest.volume,
  };
}

export async function ensureListedDailyCandles({
  countryCode,
  lookbackDays = 7,
  now = new Date(),
}: EnsureListedDailyCandlesOptions = {}) {
  const [{ prisma }] = await Promise.all([import("./prisma")]);
  const countryCodes = countryCode ? [countryCode] : (["KR", "US"] as const);
  const sinceDate = new Date(now);

  sinceDate.setUTCDate(sinceDate.getUTCDate() - Math.max(lookbackDays * 2, 14));

  const holidays = await prisma.marketHoliday.findMany({
    select: {
      closeTime: true,
      countryCode: true,
      isClosed: true,
      marketDate: true,
    },
    where: {
      countryCode: {
        in: [...countryCodes],
      },
      marketDate: {
        gte: new Date(
          Date.UTC(
            sinceDate.getUTCFullYear(),
            sinceDate.getUTCMonth(),
            sinceDate.getUTCDate(),
          ),
        ),
      },
    },
  });

  const closedDateKeysByCountry = new Map<MarketCountryCode, Set<string>>();
  const closeTimeByDateKeyByCountry = new Map<
    MarketCountryCode,
    Map<string, string | null>
  >();
  countryCodes.forEach((code) => {
    closedDateKeysByCountry.set(code, new Set());
    closeTimeByDateKeyByCountry.set(code, new Map());
  });
  holidays.forEach((holiday) => {
    const holidayCountryCode = toMarketCountryCode(holiday.countryCode);
    const dateKey = holiday.marketDate.toISOString().slice(0, 10);

    if (holiday.isClosed) {
      closedDateKeysByCountry.get(holidayCountryCode)?.add(dateKey);
    }

    closeTimeByDateKeyByCountry
      .get(holidayCountryCode)
      ?.set(dateKey, holiday.closeTime);
  });

  const completedDateKeysByCountry = new Map(
    countryCodes.map((code) => [
      code,
      getCompletedMarketDateKeys({
        closedDateKeys: closedDateKeysByCountry.get(code),
        closeTimeByDateKey: closeTimeByDateKeyByCountry.get(code),
        countryCode: code,
        lookbackDays,
        now,
      }),
    ]),
  );

  const listedStocks = await prisma.stock.findMany({
    select: { id: true },
    where: {
      countryCode: {
        in: [...countryCodes],
      },
      marketStatus: "LISTED",
    },
  });
  const stockIds = listedStocks.map((stock) => stock.id).sort((a, b) => a - b);

  if (stockIds.length === 0) {
    return {
      created: 0,
      lookbackDays,
      stocks: 0,
    };
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT "id"
      FROM "Stock"
      WHERE "id" IN (${Prisma.join(stockIds)})
      ORDER BY "id" ASC
      FOR UPDATE
    `;

    const stocks = await tx.stock.findMany({
      orderBy: { id: "asc" },
      select: {
        candles: {
          orderBy: {
            timestamp: "desc",
          },
          select: {
            closePrice: true,
            highPrice: true,
            intervalCode: true,
            lowPrice: true,
            openPrice: true,
            timestamp: true,
            tradingValue: true,
            volume: true,
          },
          take: lookbackDays + 30,
          where: {
            intervalCode: DAILY_CANDLE_INTERVAL_CODE,
          },
        },
        countryCode: true,
        currentPrice: true,
        high52w: true,
        id: true,
        low52w: true,
        previousClose: true,
        ticker: true,
      },
      where: {
        id: { in: stockIds },
        marketStatus: "LISTED",
      },
    });

    const stockCandleResults = stocks.map((stock) => {
      const existingCandles = stock.candles.map((candle) => ({
        closePrice: toFinitePrice(candle.closePrice),
        highPrice: toFinitePrice(candle.highPrice),
        intervalCode: candle.intervalCode,
        lowPrice: toFinitePrice(candle.lowPrice),
        openPrice: toFinitePrice(candle.openPrice),
        timestamp: candle.timestamp,
        tradingValue: toFinitePrice(candle.tradingValue),
        volume: toFinitePrice(candle.volume),
      }));
      const generatedCandles = buildMissingDailyCandles({
        completedDateKeys:
          completedDateKeysByCountry.get(
            toMarketCountryCode(stock.countryCode),
          ) ?? [],
        existingCandles,
        fallbackPrice:
          toFinitePrice(stock.previousClose) ||
          toFinitePrice(stock.currentPrice),
        ticker: stock.ticker,
      });

      return {
        generatedCandles,
        quoteUpdate: buildStockQuoteUpdate({
          existingCandles,
          generatedCandles,
          high52w: toFinitePrice(stock.high52w),
          low52w: toFinitePrice(stock.low52w),
        }),
        stockId: stock.id,
      };
    });
    const missingCandles = stockCandleResults.flatMap(
      ({ generatedCandles }) => generatedCandles,
    );

    for (
      let candleStart = 0;
      candleStart < missingCandles.length;
      candleStart += CANDLE_UPSERT_BATCH_SIZE
    ) {
      const candleBatch = missingCandles.slice(
        candleStart,
        candleStart + CANDLE_UPSERT_BATCH_SIZE,
      );
      const candleValues = candleBatch.map((candle) =>
        Prisma.sql`(
          ${candle.ticker},
          ${candle.intervalCode},
          ${candle.timestamp},
          ${toDecimal(candle.openPrice)},
          ${toDecimal(candle.highPrice)},
          ${toDecimal(candle.lowPrice)},
          ${toDecimal(candle.closePrice)},
          ${toDecimal(candle.tradingValue)},
          ${toDecimal(candle.volume, 0)}
        )`,
      );

      await tx.$executeRaw`
        INSERT INTO "Stock_candle" (
          "ticker",
          "interval_code",
          "timestamp",
          "open_price",
          "high_price",
          "low_price",
          "close_price",
          "trading_value",
          "volume"
        )
        VALUES ${Prisma.join(candleValues)}
        ON CONFLICT ("ticker", "interval_code", "timestamp")
        DO UPDATE SET
          "open_price" = EXCLUDED."open_price",
          "high_price" = EXCLUDED."high_price",
          "low_price" = EXCLUDED."low_price",
          "close_price" = EXCLUDED."close_price",
          "trading_value" = EXCLUDED."trading_value",
          "volume" = EXCLUDED."volume"
      `;
    }

    const quoteUpdates = stockCandleResults.flatMap((result) => {
      if (!result.quoteUpdate) {
        return [];
      }

      const quote = result.quoteUpdate;
      const currentPrice = toDecimal(quote.currentPrice);

      return [
        {
          currentPrice,
          quote: {
            changeAmount: toDecimal(quote.changeAmount),
            changeRate: toDecimal(quote.changeRate, 4),
            currentPrice,
            dayHigh: toDecimal(quote.dayHigh),
            dayLow: toDecimal(quote.dayLow),
            high52w: toDecimal(quote.high52w),
            low52w: toDecimal(quote.low52w),
            previousClose: toDecimal(quote.previousClose),
            tradingValue: toDecimal(quote.tradingValue),
            volume: toDecimal(quote.volume, 0),
          },
          stockId: result.stockId,
        },
      ];
    });

    for (const { quote, stockId } of quoteUpdates) {
      await tx.stock.update({
        data: quote,
        where: { id: stockId },
      });
    }

    if (quoteUpdates.length > 0) {
      const quoteValues = quoteUpdates.map(({ currentPrice, stockId }) =>
        Prisma.sql`(${stockId}, ${currentPrice})`,
      );

      await tx.$executeRaw`
        WITH quote_values("stock_id", "current_price") AS (
          VALUES ${Prisma.join(quoteValues)}
        )
        UPDATE "Portfolio_item" AS portfolio_item
        SET
          "current_price" = quote_values."current_price",
          "current_amount" = ROUND((quote_values."current_price" * portfolio_item."quantity")::numeric, 2),
          "evaluation_amount" = ROUND((quote_values."current_price" * portfolio_item."quantity")::numeric, 2),
          "profit" = ROUND(((quote_values."current_price" * portfolio_item."quantity") - portfolio_item."total_invested")::numeric, 2),
          "profit_rate" = CASE
            WHEN portfolio_item."total_invested" > 0 THEN
              ROUND(((((quote_values."current_price" * portfolio_item."quantity") - portfolio_item."total_invested")
                / portfolio_item."total_invested") * 100)::numeric, 4)
            ELSE 0
          END,
          "updated_at" = NOW()
        FROM quote_values
        WHERE portfolio_item."stock_id" = quote_values."stock_id"
      `;
    }

    return { created: missingCandles.length };
  }, {
    maxWait: 30_000,
    timeout: 240_000,
  });

  return {
    created: transactionResult.created,
    lookbackDays,
    stocks: stockIds.length,
    upserted: transactionResult.created,
  };
}
