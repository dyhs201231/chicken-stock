import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authQueryKeys } from "../auth/queries";
import { createPortfolio, exchangePortfolio } from "./api";
import { portfolioQueryKeys } from "./queries";

export function useCreatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPortfolio,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.myInfo });
      void queryClient.invalidateQueries({
        queryKey: portfolioQueryKeys.myPortfolio,
      });
    },
  });
}

export function useExchangePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exchangePortfolio,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: portfolioQueryKeys.myPortfolio,
      });
    },
  });
}
