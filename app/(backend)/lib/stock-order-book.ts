import type { StockOrderBookSnapshotData } from "@/app/(frontend)/types/stock/stock-detail";
import { prisma } from "./prisma";

type DecimalLike = {
  toNumber: () => number;
};

type OrderBookSnapshotSource = {
  timestamp: bigint;
  totalAskSize: DecimalLike;
  totalBidSize: DecimalLike;
  volume: DecimalLike;
  buyVolume: DecimalLike;
  sellVolume: DecimalLike;
  executionStrength: DecimalLike;
  lastTradeVolume: DecimalLike;
  levels: {
    side: "ASK" | "BID";
    levelRank: number;
    price: DecimalLike;
    quantity: DecimalLike;
  }[];
};

function toNumber(value: DecimalLike) {
  return value.toNumber();
}

export function serializeOrderBookSnapshot(
  snapshot: OrderBookSnapshotSource,
): StockOrderBookSnapshotData {
  return {
    timestamp: Number(snapshot.timestamp),
    totalAskSize: toNumber(snapshot.totalAskSize),
    totalBidSize: toNumber(snapshot.totalBidSize),
    volume: toNumber(snapshot.volume),
    buyVolume: toNumber(snapshot.buyVolume),
    sellVolume: toNumber(snapshot.sellVolume),
    executionStrength: toNumber(snapshot.executionStrength),
    lastTradeVolume: toNumber(snapshot.lastTradeVolume),
    levels: snapshot.levels.map((level) => ({
      side: level.side,
      levelRank: level.levelRank,
      price: toNumber(level.price),
      quantity: toNumber(level.quantity),
    })),
  };
}

export async function getLatestOrderBookSnapshot(stockId: number) {
  const stock = await prisma.stock.findUnique({
    where: {
      id: stockId,
    },
    select: {
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
    return {
      stockExists: false,
      orderBookSnapshot: null,
    };
  }

  const [orderBookSnapshot] = stock.orderBookSnapshots;

  return {
    stockExists: true,
    orderBookSnapshot: orderBookSnapshot
      ? serializeOrderBookSnapshot(orderBookSnapshot)
      : null,
  };
}
