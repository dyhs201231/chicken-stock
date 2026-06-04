"use client";

import { useMemo } from "react";
import { useStockOrderBookQuery } from "../../../../apis/stocks/queries";
import type {
  StockCurrencyCode,
  StockDetailData,
  StockOrderBookLevelData,
  StockOrderBookSnapshotData,
} from "../../../../types/stock/stock-detail";
import {
  convertCurrencyValue,
  formatNumber,
  formatPercent,
  formatPlainPrice,
} from "../../../../utils/stock/stock-detail";

type OrderBookPanelProps = {
  stock: StockDetailData;
  sourceCurrencyCode: StockCurrencyCode;
  initialOrderBookSnapshot: StockOrderBookSnapshotData | null;
};

const DISPLAY_LEVEL_COUNT = 6;

function getLevelKey(level: StockOrderBookLevelData) {
  return `${level.side}-${level.levelRank}`;
}

function getTrendTextClassName(changeRate: number) {
  if (changeRate > 0) {
    return "text-red-500";
  }

  if (changeRate < 0) {
    return "text-sky-600";
  }

  return "text-zinc-600";
}

function groupLevels(levels: StockOrderBookLevelData[]) {
  const asks = levels
    .filter((level) => level.side === "ASK")
    .sort((a, b) => a.levelRank - b.levelRank)
    .slice(0, DISPLAY_LEVEL_COUNT)
    .reverse();
  const bids = levels
    .filter((level) => level.side === "BID")
    .sort((a, b) => a.levelRank - b.levelRank)
    .slice(0, DISPLAY_LEVEL_COUNT);

  return {
    asks,
    bids,
  };
}

function fillRows<T>(items: T[], count: number) {
  return Array.from({ length: count }, (_, index) => items[index] ?? null);
}

function convertOrderBookSnapshotCurrency(
  snapshot: StockOrderBookSnapshotData | null | undefined,
  fromCurrencyCode: StockCurrencyCode,
  toCurrencyCode: StockCurrencyCode,
) {
  if (!snapshot) {
    return null;
  }

  if (fromCurrencyCode === toCurrencyCode) {
    return snapshot;
  }

  return {
    ...snapshot,
    levels: snapshot.levels.map((level) => ({
      ...level,
      price: convertCurrencyValue(
        level.price,
        fromCurrencyCode,
        toCurrencyCode,
      ),
    })),
  };
}

function formatCompactQuantity(value: number) {
  const roundedValue = Math.round(value);
  const sign = roundedValue < 0 ? "-" : "";
  const absoluteValue = Math.abs(roundedValue);

  if (absoluteValue < 10_000) {
    return `${sign}${formatNumber(absoluteValue)}`;
  }

  const tenThousands = Math.floor(absoluteValue / 10_000);
  const remainder = absoluteValue % 10_000;

  if (remainder === 0) {
    return `${sign}${formatNumber(tenThousands)}만`;
  }

  return `${sign}${formatNumber(tenThousands)}만 ${formatNumber(remainder)}`;
}

function getVolumeChangeRate(stock: StockDetailData) {
  const previousCandle = stock.candles.at(-2);

  if (!previousCandle || previousCandle.volume <= 0) {
    return null;
  }

  return ((stock.volume - previousCandle.volume) / previousCandle.volume) * 100;
}

function getMiddlePrice(
  bestAsk: StockOrderBookLevelData | undefined,
  bestBid: StockOrderBookLevelData | undefined,
) {
  if (!bestAsk || !bestBid) {
    return null;
  }

  return (bestAsk.price + bestBid.price) / 2;
}

function getClosestLevelKey(
  levels: StockOrderBookLevelData[],
  currentPrice: number,
) {
  const [closestLevel] = levels.toSorted(
    (a, b) =>
      Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice),
  );

  return closestLevel ? getLevelKey(closestLevel) : null;
}

function OrderBookStatePanel({ message }: { message: string }) {
  return (
    <section className="flex h-130 items-center justify-center rounded-3xl bg-white px-6 text-center text-lg font-medium text-zinc-500 shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
      {message}
    </section>
  );
}

export default function OrderBookPanel({
  initialOrderBookSnapshot,
  sourceCurrencyCode,
  stock,
}: OrderBookPanelProps) {
  const { data, isError, isFetching } = useStockOrderBookQuery(
    stock.id,
    initialOrderBookSnapshot,
  );
  const orderBookSnapshot =
    data === undefined ? initialOrderBookSnapshot : data;
  const snapshot = useMemo(
    () =>
      convertOrderBookSnapshotCurrency(
        orderBookSnapshot,
        sourceCurrencyCode,
        stock.currencyCode,
      ),
    [orderBookSnapshot, sourceCurrencyCode, stock.currencyCode],
  );

  if (!snapshot) {
    if (isFetching) {
      return <OrderBookStatePanel message="호가 데이터를 불러오는 중입니다." />;
    }

    if (isError) {
      return <OrderBookStatePanel message="호가 데이터를 불러오지 못했습니다." />;
    }

    return <OrderBookStatePanel message="표시할 호가 데이터가 없습니다." />;
  }

  const { asks, bids } = groupLevels(snapshot.levels);
  const askRows = fillRows(asks, DISPLAY_LEVEL_COUNT);
  const bidRows = fillRows(bids, DISPLAY_LEVEL_COUNT);
  const priceRows = [...askRows, ...bidRows];
  const bestAsk = asks.at(-1);
  const bestBid = bids[0];
  const middlePrice = getMiddlePrice(bestAsk, bestBid);
  const openingPrice = stock.candles.at(-1)?.openPrice ?? stock.previousClose;
  const volumeChangeRate = getVolumeChangeRate(stock);
  const trendTextClassName = getTrendTextClassName(stock.changeRate);
  const closestLevelKey = getClosestLevelKey(
    [...asks, ...bids],
    stock.currentPrice,
  );
  const sessionLabel = stock.countryCode === "US" ? "애프터마켓" : "정규장";

  return (
    <section className="flex h-130 flex-col overflow-hidden rounded-3xl bg-white text-zinc-950 shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
      <div className="grid min-h-0 flex-1 grid-cols-[34%_31%_35%]">
        <div className="flex min-w-0 flex-col border-r-2 border-zinc-950">
          <div className="flex h-16 shrink-0 items-center px-4 text-2xl font-semibold">
            호가
          </div>

          <div className="flex min-h-0 flex-[6] flex-col border-t-2 border-zinc-200">
            {askRows.map((level, index) => (
              <div
                key={level ? getLevelKey(level) : `empty-ask-${index}`}
                className="flex min-h-0 flex-1 items-center justify-end border-b-2 border-zinc-200 px-4 text-right text-xl font-medium text-sky-600"
              >
                {level ? formatNumber(level.quantity) : ""}
              </div>
            ))}
          </div>

          <div className="shrink-0 border-t-2 border-zinc-950 px-3 py-3">
            <p className="text-lg font-semibold">체결강도</p>
            <p className="text-xl font-medium text-sky-600">
              {snapshot.executionStrength.toFixed(2)}%
            </p>
          </div>

          <dl className="grid shrink-0 grid-cols-[1fr_auto] gap-x-2 gap-y-1 px-3 pb-4 text-base">
            <dt>직전체결</dt>
            <dd className="text-right text-sky-600">
              {formatNumber(snapshot.lastTradeVolume)}
            </dd>
            <dt>매수체결</dt>
            <dd className="text-right text-red-500">
              {formatCompactQuantity(snapshot.buyVolume)}
            </dd>
            <dt>매도체결</dt>
            <dd className="text-right text-sky-600">
              {formatCompactQuantity(snapshot.sellVolume)}
            </dd>
          </dl>
        </div>

        <div className="flex min-w-0 flex-col border-r-2 border-zinc-950 text-center">
          {priceRows.map((level, index) => {
            const isClosestLevel =
              level !== null && getLevelKey(level) === closestLevelKey;

            return (
              <div
                key={level ? getLevelKey(level) : `empty-price-${index}`}
                className={`flex min-h-0 flex-1 flex-col items-center justify-center px-1 ${
                  isClosestLevel
                    ? "m-2 rounded-xl border-2 border-zinc-800"
                    : "border-b border-transparent"
                }`}
              >
                {level && (
                  <>
                    <strong className={`text-2xl ${trendTextClassName}`}>
                      {formatPlainPrice(level.price, stock.currencyCode)}
                    </strong>
                    <span className={`text-sm ${trendTextClassName}`}>
                      {formatPercent(stock.changeRate)}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-col">
          <dl className="shrink-0 space-y-3 px-4 py-12 text-zinc-500">
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <dt className="text-lg font-semibold">시작</dt>
              <dd className="text-right text-lg">
                {formatPlainPrice(openingPrice, stock.currencyCode)}
              </dd>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <dt className="text-lg font-semibold">최고</dt>
              <dd className="text-right text-lg text-red-500">
                {formatPlainPrice(stock.dayHigh, stock.currencyCode)}
              </dd>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <dt className="text-lg font-semibold">최저</dt>
              <dd className="text-right text-lg text-sky-600">
                {formatPlainPrice(stock.dayLow, stock.currencyCode)}
              </dd>
            </div>

            <div className="border-t-2 border-zinc-200 pt-4">
              <dt className="text-lg font-semibold">거래량</dt>
              <dd className="mt-1 text-lg">
                {formatCompactQuantity(stock.volume)}
              </dd>
              <dt className="mt-2 text-lg font-semibold">어제보다</dt>
              <dd className="mt-1 text-lg">
                {volumeChangeRate === null
                  ? "-"
                  : formatPercent(volumeChangeRate)}
              </dd>
            </div>
          </dl>

          <div className="shrink-0 border-t-2 border-zinc-200 px-4 py-3">
            <p className="text-lg font-semibold text-zinc-500">중간호가</p>
            <p className="mt-1 text-lg font-medium">
              {middlePrice === null
                ? "-"
                : formatPlainPrice(middlePrice, stock.currencyCode)}
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-t-2 border-zinc-200">
            {bidRows.map((level, index) => (
              <div
                key={level ? getLevelKey(level) : `empty-bid-${index}`}
                className="flex min-h-0 flex-1 items-center border-b-2 border-zinc-200 px-6 text-xl font-medium text-red-500"
              >
                {level ? formatNumber(level.quantity) : ""}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid h-8 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-t-2 border-zinc-200 px-4 text-base font-semibold">
        <p className="truncate text-sky-600">
          <span className="text-zinc-950">판매대기 </span>
          {formatNumber(snapshot.totalAskSize)}
        </p>
        <p className="whitespace-nowrap text-zinc-950">{sessionLabel}</p>
        <p className="truncate text-right text-red-500">
          {formatNumber(snapshot.totalBidSize)}
          <span className="text-zinc-950"> 구매대기</span>
        </p>
      </div>
    </section>
  );
}
