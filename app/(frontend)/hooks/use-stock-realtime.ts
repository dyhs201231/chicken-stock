"use client";

import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { portfolioQueryKeys } from "@/app/(frontend)/apis/portfolio/queries";
import { stockQueryKeys } from "@/app/(frontend)/apis/stocks/queries";
import { getSupabaseBrowserClient } from "@/app/(frontend)/lib/supabase-client";

type UserOrderFilledPayload = {
  executedAt: string;
  orderId: string;
  price: number;
  quantity: number;
  side: "BUY" | "SELL";
  stockId: number;
  stockName: string;
  ticker: string;
  totalAmount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUserOrderFilledPayload(
  value: unknown,
): value is UserOrderFilledPayload {
  return (
    isRecord(value) &&
    typeof value.executedAt === "string" &&
    typeof value.orderId === "string" &&
    typeof value.price === "number" &&
    typeof value.quantity === "number" &&
    (value.side === "BUY" || value.side === "SELL") &&
    typeof value.stockId === "number" &&
    typeof value.stockName === "string" &&
    typeof value.ticker === "string" &&
    typeof value.totalAmount === "number"
  );
}

function invalidateStockMarketQueries(
  queryClient: QueryClient,
  stockId: number,
) {
  void queryClient.invalidateQueries({
    queryKey: stockQueryKeys.lists(),
  });
  void queryClient.invalidateQueries({
    queryKey: ["stock-candles", stockId],
  });
  void queryClient.invalidateQueries({
    queryKey: stockQueryKeys.orderBook(stockId),
  });
}

function invalidatePersonalTradeQueries(
  queryClient: QueryClient,
  stockId: number,
) {
  invalidateStockMarketQueries(queryClient, stockId);
  void queryClient.invalidateQueries({
    queryKey: stockQueryKeys.orders(stockId),
  });
  void queryClient.invalidateQueries({
    queryKey: portfolioQueryKeys.myPortfolio,
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function showOrderFilledToast(payload: UserOrderFilledPayload) {
  const sideLabel = payload.side === "BUY" ? "매수" : "매도";

  toast.success(`${payload.stockName} ${sideLabel} 체결`, {
    description: `${formatNumber(payload.quantity)}주 · ${formatNumber(
      payload.price,
    )} · 총 ${formatNumber(payload.totalAmount)}`,
  });
}

export function useUserRealtime(userOrderChannel: string | null | undefined) {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!userOrderChannel) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel(userOrderChannel)
      .on("broadcast", { event: "order_filled" }, ({ payload }) => {
        if (!isUserOrderFilledPayload(payload)) {
          return;
        }

        invalidatePersonalTradeQueries(queryClient, payload.stockId);
        showOrderFilledToast(payload);
        router.refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, router, userOrderChannel]);
}

export function useStockRealtime(stockId: number | null | undefined) {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!Number.isInteger(stockId) || !stockId || stockId <= 0) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel(`stock:${stockId}`)
      .on("broadcast", { event: "stock_updated" }, () => {
        invalidateStockMarketQueries(queryClient, stockId);
        router.refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, router, stockId]);
}
