import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { portfolioQueryKeys } from "../portfolio/queries";
import {
  cancelAllStockOrders,
  cancelStockOrder,
  createStockOrder,
  type CreateStockOrderRequest,
  type UpdateStockOrderRequest,
  updateStockOrder,
} from "./api";
import { stockQueryKeys } from "./queries";

type CreateStockOrderVariables = {
  payload: CreateStockOrderRequest;
  stockId: number;
};

type UpdateStockOrderVariables = {
  orderId: string;
  payload: UpdateStockOrderRequest;
  stockId: number;
};

type CancelStockOrderVariables = {
  orderId: string;
  stockId: number;
};

function useInvalidateStockOrderQueries() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return (stockId: number) => {
    void queryClient.invalidateQueries({
      queryKey: stockQueryKeys.lists(),
    });
    void queryClient.invalidateQueries({
      queryKey: ["stock-candles", stockId],
    });
    void queryClient.invalidateQueries({
      queryKey: stockQueryKeys.orders(stockId),
    });
    void queryClient.invalidateQueries({
      queryKey: stockQueryKeys.orderBook(stockId),
    });
    void queryClient.invalidateQueries({
      queryKey: portfolioQueryKeys.myPortfolio,
    });
    router.refresh();
  };
}

export function useCreateStockOrder() {
  const invalidateStockOrderQueries = useInvalidateStockOrderQueries();

  return useMutation({
    mutationFn: ({ payload, stockId }: CreateStockOrderVariables) =>
      createStockOrder(stockId, payload),
    onSuccess: (_data, variables) => {
      invalidateStockOrderQueries(variables.stockId);
    },
  });
}

export function useUpdateStockOrder() {
  const invalidateStockOrderQueries = useInvalidateStockOrderQueries();

  return useMutation({
    mutationFn: ({ orderId, payload, stockId }: UpdateStockOrderVariables) =>
      updateStockOrder(stockId, orderId, payload),
    onSuccess: (_data, variables) => {
      invalidateStockOrderQueries(variables.stockId);
    },
  });
}

export function useCancelStockOrder() {
  const invalidateStockOrderQueries = useInvalidateStockOrderQueries();

  return useMutation({
    mutationFn: ({ orderId, stockId }: CancelStockOrderVariables) =>
      cancelStockOrder(stockId, orderId),
    onSuccess: (_data, variables) => {
      invalidateStockOrderQueries(variables.stockId);
    },
  });
}

export function useCancelAllStockOrders(stockId: number) {
  const invalidateStockOrderQueries = useInvalidateStockOrderQueries();

  return useMutation({
    mutationFn: () => cancelAllStockOrders(stockId),
    onSuccess: () => {
      invalidateStockOrderQueries(stockId);
    },
  });
}
