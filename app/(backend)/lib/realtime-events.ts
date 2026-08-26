import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/app/(backend)/lib/prisma";
import { getRealtimeBroadcastDurationBucket } from "@/app/(backend)/lib/realtime-broadcast-retry";
import { sendRealtimeHttpBroadcast } from "@/app/(backend)/lib/realtime-http-broadcast";
import { createRealtimeStockUpdateScheduler } from "@/app/(backend)/lib/realtime-stock-update-scheduler";
import { reportServerError } from "@/app/(backend)/lib/report-server-error";
import {
  getStockRealtimeChannelName,
  getUserOrderRealtimeChannelName,
} from "@/app/(backend)/lib/realtime-channels";
import {
  getStockMarketSync,
  getStockMutationSync,
  type StockSyncReason,
} from "@/app/(backend)/lib/stock-order-sync";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import type { TradeOrderType } from "@/app/(backend)/generated/prisma/enums";

const TRADE_EXECUTED_STOCK_UPDATED_THROTTLE_MS = getNonNegativeIntegerEnv(
  "TRADE_EXECUTED_STOCK_UPDATED_THROTTLE_MS",
  1_500,
);
const ORDER_CHANGED_STOCK_UPDATED_THROTTLE_MS = getNonNegativeIntegerEnv(
  "ORDER_CHANGED_STOCK_UPDATED_THROTTLE_MS",
  300,
);

type BroadcastPayload = Record<string, unknown>;
type StockMarketSyncPayload = Awaited<ReturnType<typeof getStockMarketSync>>;
type StockMutationSyncPayload = Awaited<ReturnType<typeof getStockMutationSync>>;

export type UserOrderFilledPayload = {
  counterOrderId: string | null;
  executedAt: string;
  executionId: string;
  orderId: string;
  price: number;
  quantity: number;
  side: TradeOrderType;
  stockId: number;
  stockName: string;
  sync?: StockMutationSyncPayload | null;
  ticker: string;
  totalAmount: number;
};

export type StockUpdatedPayload = StockMarketSyncPayload & {
  changedAt?: string;
  lastExecutionPrice?: number;
  lastExecutionQuantity?: number;
  stockId: number;
  ticker?: string;
};
type ScheduledStockUpdatedPayload = Omit<
  StockUpdatedPayload,
  "candles" | "orderBookSnapshot"
> & {
  includeSync?: boolean;
};

type UserOrderFilledEvent = {
  payload: UserOrderFilledPayload;
  userId: bigint;
};

let serverSupabaseClient: SupabaseClient | null = null;
const stockUpdatedPayloads = new Map<number, ScheduledStockUpdatedPayload>();
const lastStockUpdatedAt = new Map<number, number>();

function getSupabaseServerClient() {
  if (serverSupabaseClient) {
    return serverSupabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.warn(
      "Supabase Realtime env is missing. Realtime events will be skipped.",
    );
    return null;
  }

  serverSupabaseClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverSupabaseClient;
}

function getNonNegativeIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);

  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function getStockUpdatedThrottleMs(reason: StockSyncReason) {
  return reason === "ORDER_CHANGED"
    ? ORDER_CHANGED_STOCK_UPDATED_THROTTLE_MS
    : TRADE_EXECUTED_STOCK_UPDATED_THROTTLE_MS;
}

async function publishBroadcast(
  channelName: string,
  event: string,
  payload: BroadcastPayload,
) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const channel = supabase.channel(channelName);

  try {
    const { cleanupError, delivery } = await sendRealtimeHttpBroadcast({
      channel,
      event,
      payload,
      removeChannel: () => supabase.removeChannel(channel),
    });

    if (delivery.result !== "ok") {
      const deliveryError =
        delivery.error instanceof Error
          ? delivery.error
          : new Error("Supabase Realtime HTTP broadcast failed");

      reportServerError(
        deliveryError,
        {
          attempt_count: String(delivery.attempts),
          component: "realtime-events",
          duration_bucket: getRealtimeBroadcastDurationBucket(
            delivery.elapsedMs,
          ),
          failure_result: delivery.result,
          kind: "background",
          operation: "publish-broadcast",
        },
      );
      console.warn("Supabase Realtime HTTP broadcast failed", {
        attempts: delivery.attempts,
        channelName,
        durationMs: delivery.elapsedMs,
        event,
        response: delivery.result,
      });
    }

    if (cleanupError) {
      reportServerError(cleanupError, {
        component: "realtime-events",
        failure_result: "error",
        kind: "background",
        operation: "cleanup-broadcast-channel",
      });
      console.warn("Supabase Realtime channel cleanup failed", {
        channelName,
        error: cleanupError,
        event,
      });
    }
  } catch (error) {
    reportServerError(error, {
      component: "realtime-events",
      kind: "background",
      operation: "publish-broadcast",
    });
    console.error("Supabase Realtime broadcast failed", {
      channelName,
      error,
      event,
    });
  }
}

async function getSafeStockMarketSync(
  stockId: number,
  reason: StockSyncReason,
): Promise<StockMarketSyncPayload> {
  try {
    return await getStockMarketSync(stockId, reason);
  } catch (error) {
    reportServerError(error, {
      component: "realtime-events",
      kind: "background",
      operation: "build-stock-sync",
    });
    console.error("Building stock realtime sync payload failed", {
      error,
      reason,
      stockId,
    });

    return {
      candles: null,
      orderBookSnapshot: null,
      reason,
    };
  }
}

async function getSafeStockMutationSync(
  userId: bigint,
  stockId: number,
): Promise<StockMutationSyncPayload | null> {
  try {
    return await getStockMutationSync({
      reason: "TRADE_EXECUTED",
      stockId,
      userId,
    });
  } catch (error) {
    reportServerError(error, {
      component: "realtime-events",
      kind: "background",
      operation: "build-user-order-sync",
    });
    console.error("Building user order realtime sync payload failed", {
      error,
      stockId,
      userId: userId.toString(),
    });

    return null;
  }
}

function serializeDecimalNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

function getFillTotalAmount(price: Prisma.Decimal, quantity: number) {
  return serializeDecimalNumber(price.mul(quantity).toDecimalPlaces(2));
}

export async function publishUserOrderFilled(
  userId: bigint | number | string,
  payload: UserOrderFilledPayload,
) {
  await publishBroadcast(
    getUserOrderRealtimeChannelName(userId),
    "order_filled",
    payload,
  );
}

function mergeStockUpdatedPayload(
  stockId: number,
  payload: Omit<ScheduledStockUpdatedPayload, "stockId">,
) {
  const previous = stockUpdatedPayloads.get(stockId);
  const includeSync = previous
    ? previous.includeSync !== false || payload.includeSync !== false
    : payload.includeSync !== false;

  stockUpdatedPayloads.set(stockId, {
    ...previous,
    ...payload,
    changedAt: new Date().toISOString(),
    includeSync,
    reason:
      previous?.reason === "TRADE_EXECUTED" || payload.reason === "TRADE_EXECUTED"
        ? "TRADE_EXECUTED"
        : "ORDER_CHANGED",
    stockId,
  });
}

async function publishScheduledStockUpdated(stockId: number) {
  try {
    const payload = stockUpdatedPayloads.get(stockId);

    stockUpdatedPayloads.delete(stockId);

    if (!payload) {
      return;
    }

    const broadcastPayload = { ...payload };
    delete broadcastPayload.includeSync;
    const sync =
      payload.includeSync === false
        ? {
            candles: null,
            orderBookSnapshot: null,
            reason: payload.reason,
          }
        : await getSafeStockMarketSync(stockId, payload.reason);

    lastStockUpdatedAt.set(stockId, Date.now());
    await publishBroadcast(
      getStockRealtimeChannelName(stockId),
      "stock_updated",
      {
        ...broadcastPayload,
        ...sync,
        stockId,
      },
    );
  } catch (error) {
    reportServerError(error, {
      component: "realtime-events",
      kind: "background",
      operation: "publish-stock-update",
    });
    console.error("Publishing scheduled stock update failed", {
      error,
      stockId,
    });
  }
}

const stockUpdateScheduler = createRealtimeStockUpdateScheduler({
  publish: publishScheduledStockUpdated,
});

export function scheduleStockUpdated(
  stockId: number,
  payload: Omit<ScheduledStockUpdatedPayload, "stockId">,
): Promise<void> {
  mergeStockUpdatedPayload(stockId, payload);

  const scheduledPayload = stockUpdatedPayloads.get(stockId);

  if (!scheduledPayload) {
    return Promise.resolve();
  }

  const now = Date.now();
  const lastPublishedAt = lastStockUpdatedAt.get(stockId) ?? 0;
  const throttleMs = getStockUpdatedThrottleMs(scheduledPayload.reason);
  const delay = Math.max(throttleMs - (now - lastPublishedAt), 0);

  return stockUpdateScheduler.schedule(stockId, delay);
}

export async function getOrderFilledRealtimeEvents(
  orderId: bigint,
  options?: {
    since?: Date;
  },
) {
  const executions = await prisma.tradeExecution.findMany({
    include: {
      buyOrder: {
        select: {
          orderId: true,
          portfolio: {
            select: {
              userId: true,
            },
          },
        },
      },
      sellOrder: {
        select: {
          orderId: true,
          portfolio: {
            select: {
              userId: true,
            },
          },
        },
      },
      stock: {
        select: {
          id: true,
          name: true,
          ticker: true,
        },
      },
    },
    orderBy: {
      executedAt: "asc",
    },
    where: {
      ...(options?.since
        ? {
            executedAt: {
              gte: options.since,
            },
          }
        : {}),
      OR: [
        {
          buyOrderId: orderId,
        },
        {
          sellOrderId: orderId,
        },
      ],
      buyOrderId: {
        not: null,
      },
      sellOrderId: {
        not: null,
      },
    },
  });
  const events: UserOrderFilledEvent[] = [];

  for (const execution of executions) {
    if (!execution.buyOrder || !execution.sellOrder) {
      continue;
    }

    const basePayload = {
      executedAt: execution.executedAt.toISOString(),
      executionId: execution.id,
      price: serializeDecimalNumber(execution.price),
      quantity: execution.quantity,
      stockId: execution.stock.id,
      stockName: execution.stock.name,
      ticker: execution.stock.ticker,
      totalAmount: getFillTotalAmount(execution.price, execution.quantity),
    };

    events.push(
      {
        payload: {
          ...basePayload,
          counterOrderId: execution.sellOrder.orderId.toString(),
          orderId: execution.buyOrder.orderId.toString(),
          side: "BUY",
        },
        userId: execution.buyOrder.portfolio.userId,
      },
      {
        payload: {
          ...basePayload,
          counterOrderId: execution.buyOrder.orderId.toString(),
          orderId: execution.sellOrder.orderId.toString(),
          side: "SELL",
        },
        userId: execution.sellOrder.portfolio.userId,
      },
    );
  }

  return events;
}

export async function publishOrderFilledEventsForOrder(
  orderId: bigint,
  options?: {
    includeSync?: boolean;
    since?: Date;
  },
) {
  try {
    const events = await getOrderFilledRealtimeEvents(orderId, options);

    await Promise.all(
      events.map(async (event) => {
        const sync =
          options?.includeSync === false
            ? null
            : await getSafeStockMutationSync(
                event.userId,
                event.payload.stockId,
              );

        return publishUserOrderFilled(event.userId, {
          ...event.payload,
          sync,
        });
      }),
    );
  } catch (error) {
    reportServerError(error, {
      component: "realtime-events",
      kind: "background",
      operation: "publish-order-filled-events",
    });
    console.error("Publishing order filled realtime events failed", {
      error,
      orderId: orderId.toString(),
    });
  }
}
