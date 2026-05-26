import { prisma } from "../../../../(backend)/lib/prisma";
import type { StockDetailData } from "../../../types/stock/stock-detail";

type DecimalLike = {
  toNumber: () => number;
};

function toNumber(value: DecimalLike) {
  return value.toNumber();
}

export async function getStockDetailData(
  stockId: number,
): Promise<StockDetailData | null> {
  const stock = await prisma.stock.findUnique({
    where: {
      id: stockId,
    },
    include: {
      candles: {
        orderBy: {
          timestamp: "desc",
        },
        take: 18,
      },
      orderBookSnapshots: {
        orderBy: {
          timestamp: "desc",
        },
        take: 1,
        include: {
          levels: {
            orderBy: [
              {
                side: "asc",
              },
              {
                levelRank: "asc",
              },
            ],
          },
        },
      },
    },
  });

  if (!stock) {
    return null;
  }

  const [orderBookSnapshot] = stock.orderBookSnapshots;

  return {
    id: stock.id,
    ticker: stock.ticker,
    name: stock.name,
    imageUrl: stock.imageUrl || null,
    sector: stock.sector,
    riskLevel: stock.riskLevel,
    theme: stock.theme,
    countryCode: stock.countryCode,
    currencyCode: stock.currencyCode,
    currentPrice: toNumber(stock.currentPrice),
    previousClose: toNumber(stock.previousClose),
    changeAmount: toNumber(stock.changeAmount),
    changeRate: toNumber(stock.changeRate),
    dayHigh: toNumber(stock.dayHigh),
    dayLow: toNumber(stock.dayLow),
    high52w: toNumber(stock.high52w),
    low52w: toNumber(stock.low52w),
    volume: toNumber(stock.volume),
    tradingValue: toNumber(stock.tradingValue),
    marketCap: toNumber(stock.marketCap),
    per: toNumber(stock.per),
    eps: toNumber(stock.eps),
    marketStatus: stock.marketStatus,
    debtRatio: toNumber(stock.debtRatio),
    currentRatio: toNumber(stock.currentRatio),
    interestCoverageRatio: toNumber(stock.interestCoverageRatio),
    announcementDate: stock.announcementDate.toISOString(),
    estimatedOperatingProfit: stock.estimatedOperatingProfit,
    estimatedRevenue: toNumber(stock.estimatedRevenue),
    dividendCount: stock.dividendCount,
    dividendPerShare: toNumber(stock.dividendPerShare),
    dividendYield: toNumber(stock.dividendYield),
    candles: stock.candles
      .map((candle) => ({
        timestamp: Number(candle.timestamp),
        openPrice: toNumber(candle.openPrice),
        highPrice: toNumber(candle.highPrice),
        lowPrice: toNumber(candle.lowPrice),
        closePrice: toNumber(candle.closePrice),
      }))
      .reverse(),
    orderBookSnapshot: orderBookSnapshot
      ? {
          totalAskSize: toNumber(orderBookSnapshot.totalAskSize),
          totalBidSize: toNumber(orderBookSnapshot.totalBidSize),
          volume: toNumber(orderBookSnapshot.volume),
          buyVolume: toNumber(orderBookSnapshot.buyVolume),
          sellVolume: toNumber(orderBookSnapshot.sellVolume),
          executionStrength: toNumber(orderBookSnapshot.executionStrength),
          levels: orderBookSnapshot.levels.map((level) => ({
            side: level.side,
            levelRank: level.levelRank,
            price: toNumber(level.price),
            quantity: toNumber(level.quantity),
          })),
        }
      : null,
  };
}
