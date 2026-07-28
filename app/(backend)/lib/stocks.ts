import { unstable_cache } from "next/cache";
import { Prisma } from "../generated/prisma/client";
import {
  USD_KRW_EXCHANGE_RATE,
  convertCurrencyValue,
  type CurrencyCode,
} from "../../(frontend)/utils/currency";
import type { StockData } from "../../(frontend)/components/main/stock_list/types";
import type { StocksRankingData } from "../../(frontend)/apis/stocks/api";
import { getMarketSessionStatus } from "./market-hours";
import { prisma } from "./prisma";
import {
  STOCK_RANKING_MAX_LIMIT,
  getStockRankingCountryCodes,
  getStockRankingWindow,
  mergeStockRankingWindows,
  type StockMarketFilter,
  type StockRankingKey,
  type StockRankingPeriod,
} from "./stock-ranking";

const STOCKS_RANKING_REVALIDATE_SECONDS = 5;

type DecimalLike = {
  toNumber: () => number;
};

type RankedStockRow = {
  id: number;
  name: string;
  countryCode: string;
  currencyCode: CurrencyCode;
  currentPrice: DecimalLike;
  changeRate: DecimalLike;
  tradingValue: DecimalLike;
  volume: DecimalLike;
};

type StockRankingWindow = {
  startDateKey: string;
  endDateKey: string;
};

type GetStocksRankingParams = {
  market: StockMarketFilter;
  ranking: StockRankingKey;
  period: StockRankingPeriod;
  limit: number;
  now?: Date;
};

function toNumber(value: DecimalLike) {
  return value.toNumber();
}

function formatPrice(value: number, currencyCode: CurrencyCode) {
  const krwValue = convertCurrencyValue(value, currencyCode, "KRW");

  return `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(krwValue)}원`;
}

function formatChangeRate(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatTradingValue(value: number, currencyCode: CurrencyCode) {
  const krwValue = convertCurrencyValue(value, currencyCode, "KRW");

  if (Math.abs(krwValue) >= 100_000_000) {
    return `${new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: 1,
    }).format(krwValue / 100_000_000)}억원`;
  }

  return `${new Intl.NumberFormat("ko-KR").format(krwValue)}원`;
}

function formatVolume(value: number) {
  return `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(value)}주`;
}

function getLogoLabel(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function getCountryCondition(countryCodes: Array<"KR" | "US">) {
  return Prisma.sql`s."country_code" IN (${Prisma.join(countryCodes)})`;
}

function getRankingExpression(ranking: StockRankingKey) {
  if (ranking === "tradingVolume") {
    return Prisma.sql`"volume"`;
  }

  return Prisma.sql`
    CASE
      WHEN "currencyCode" = ${"USD"}::"Currency_code"
        THEN FLOOR(
          "tradingValue" * ${USD_KRW_EXCHANGE_RATE}::numeric + 0.5
        )
      ELSE "tradingValue"
    END
  `;
}

function toDateKeyTimestamp(dateKey: string) {
  return BigInt(new Date(`${dateKey}T00:00:00.000Z`).getTime());
}

function getHistoricalCandleCondition(
  windowsByCountry: Map<"KR" | "US", StockRankingWindow>,
) {
  const conditions = [...windowsByCountry].map(
    ([countryCode, window]) =>
      Prisma.sql`(
      s."country_code" = ${countryCode}
      AND c."timestamp" BETWEEN
        ${toDateKeyTimestamp(window.startDateKey)}
        AND ${toDateKeyTimestamp(window.endDateKey)}
    )`,
  );

  return conditions.length > 0
    ? Prisma.join(conditions, " OR ")
    : Prisma.sql`FALSE`;
}

function formatStocks(
  stocks: RankedStockRow[],
  ranking: StockRankingKey,
): StockData[] {
  return stocks.map((stock, index) => {
    const changeRate = toNumber(stock.changeRate);
    const tradingValue = toNumber(stock.tradingValue);
    const volume = toNumber(stock.volume);

    return {
      id: stock.id,
      rank: index + 1,
      name: stock.name,
      price: formatPrice(toNumber(stock.currentPrice), stock.currencyCode),
      changeRate: formatChangeRate(changeRate),
      tradingAmount: formatTradingValue(tradingValue, stock.currencyCode),
      tradingVolume: formatVolume(volume),
      rankingValue:
        ranking === "tradingVolume"
          ? formatVolume(volume)
          : formatTradingValue(tradingValue, stock.currencyCode),
      market: stock.countryCode === "KR" ? "domestic" : "global",
      trend: changeRate >= 0 ? "up" : "down",
      logoLabel: getLogoLabel(stock.name),
    };
  });
}

async function getLiveRankingRows({
  countryCodes,
  limit,
  ranking,
}: {
  countryCodes: Array<"KR" | "US">;
  limit: number;
  ranking: StockRankingKey;
}) {
  return prisma.$queryRaw<RankedStockRow[]>(Prisma.sql`
    WITH "rankedStocks" AS (
      SELECT s."id",
             s."name",
             s."country_code" AS "countryCode",
             s."currency_code" AS "currencyCode",
             s."current_price" AS "currentPrice",
             s."change_rate" AS "changeRate",
             s."trading_value" AS "tradingValue",
             s."volume"
      FROM "public"."Stock" s
      WHERE s."market_status" = ${"LISTED"}::"Stock_market_status"
        AND ${getCountryCondition(countryCodes)}
    )
    SELECT "id",
           "name",
           "countryCode",
           "currencyCode",
           "currentPrice",
           "changeRate",
           "tradingValue",
           "volume"
    FROM "rankedStocks"
    ORDER BY ${getRankingExpression(ranking)} DESC, "id" ASC
    LIMIT ${limit + 1}
  `);
}

async function getHistoricalRankingRows({
  countryCodes,
  limit,
  ranking,
  windowsByCountry,
}: {
  countryCodes: Array<"KR" | "US">;
  limit: number;
  ranking: StockRankingKey;
  windowsByCountry: Map<"KR" | "US", StockRankingWindow>;
}) {
  return prisma.$queryRaw<RankedStockRow[]>(Prisma.sql`
    WITH "rankedStocks" AS (
      SELECT s."id",
             s."name",
             s."country_code" AS "countryCode",
             s."currency_code" AS "currencyCode",
             s."current_price" AS "currentPrice",
             s."change_rate" AS "changeRate",
             COALESCE(SUM(c."trading_value"), 0::numeric) AS "tradingValue",
             COALESCE(SUM(c."volume"), 0::numeric) AS "volume"
      FROM "public"."Stock" s
      LEFT JOIN "public"."Stock_candle" c
        ON c."ticker" = s."ticker"
       AND c."interval_code" = ${"1D"}
       AND (${getHistoricalCandleCondition(windowsByCountry)})
      WHERE s."market_status" = ${"LISTED"}::"Stock_market_status"
        AND ${getCountryCondition(countryCodes)}
      GROUP BY s."id"
    )
    SELECT "id",
           "name",
           "countryCode",
           "currencyCode",
           "currentPrice",
           "changeRate",
           "tradingValue",
           "volume"
    FROM "rankedStocks"
    ORDER BY ${getRankingExpression(ranking)} DESC, "id" ASC
    LIMIT ${limit + 1}
  `);
}

export async function getStocksRanking({
  market,
  ranking,
  period,
  limit,
  now = new Date(),
}: GetStocksRankingParams): Promise<StocksRankingData> {
  const rankingLimit = Math.min(
    Math.max(Math.floor(limit), 1),
    STOCK_RANKING_MAX_LIMIT,
  );
  const countryCodes = getStockRankingCountryCodes(market);
  const [holidays, marketSessions] = await Promise.all([
    period === "live"
      ? Promise.resolve([])
      : prisma.marketHoliday.findMany({
          select: {
            closeTime: true,
            countryCode: true,
            isClosed: true,
            marketDate: true,
          },
          where: {
            countryCode: {
              in: countryCodes,
            },
          },
        }),
    Promise.all(
      countryCodes.map((countryCode) =>
        getMarketSessionStatus(countryCode, now),
      ),
    ),
  ]);
  const closedDateKeysByCountry = new Map(
    countryCodes.map((countryCode) => [
      countryCode,
      new Set(
        holidays
          .filter(
            (holiday) =>
              holiday.countryCode === countryCode && holiday.isClosed,
          )
          .map((holiday) => holiday.marketDate.toISOString().slice(0, 10)),
      ),
    ]),
  );
  const closeTimeByDateKeyByCountry = new Map(
    countryCodes.map((countryCode) => [
      countryCode,
      new Map(
        holidays
          .filter((holiday) => holiday.countryCode === countryCode)
          .map(
            (holiday) =>
              [
                holiday.marketDate.toISOString().slice(0, 10),
                holiday.closeTime,
              ] as const,
          ),
      ),
    ]),
  );
  const marketSessionsByCountry = new Map(
    marketSessions.flatMap((session) =>
      session ? [[session.countryCode, session] as const] : [],
    ),
  );
  const windowsByCountry = new Map(
    countryCodes.flatMap((countryCode) => {
      const marketSession = marketSessionsByCountry.get(countryCode);
      const window = getStockRankingWindow({
        activeDateKey: marketSession?.isOpen
          ? marketSession.checkedAt
          : undefined,
        closedDateKeys: closedDateKeysByCountry.get(countryCode),
        closeTimeByDateKey: closeTimeByDateKeyByCountry.get(countryCode),
        countryCode,
        now,
        period,
      });

      return window ? [[countryCode, window] as const] : [];
    }),
  );
  const { periodStart, periodEnd } = mergeStockRankingWindows([
    ...windowsByCountry.values(),
  ]);
  const rows =
    period === "live"
      ? await getLiveRankingRows({
          countryCodes,
          limit: rankingLimit,
          ranking,
        })
      : await getHistoricalRankingRows({
          countryCodes,
          limit: rankingLimit,
          ranking,
          windowsByCountry,
        });
  const visibleRows = rows.slice(0, rankingLimit);

  return {
    stocks: formatStocks(visibleRows, ranking),
    asOf: now.toISOString(),
    periodStart,
    periodEnd,
    hasMore: rows.length > rankingLimit,
    marketOpen: marketSessions.some((session) => session?.isOpen === true),
  };
}

export const getCachedStocksRanking = unstable_cache(
  getStocksRanking,
  ["stocks-ranking-v1"],
  {
    revalidate: STOCKS_RANKING_REVALIDATE_SECONDS,
  },
);
