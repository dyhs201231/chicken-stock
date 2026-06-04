import { useQuery } from "@tanstack/react-query";
import { getPortfolio, type GetPortfolioParams } from "./api";

export const portfolioQueryKeys = {
  myPortfolio: ["portfolio", "my-portfolio"],
  myPortfolioWithParams: (params?: GetPortfolioParams) => [
    ...portfolioQueryKeys.myPortfolio,
    params?.incomeYear ?? null,
    params?.incomeMonth ?? null,
  ],
} as const;

export function useGetPortfolio(params?: GetPortfolioParams) {
  return useQuery({
    queryFn: () => getPortfolio(params),
    queryKey: portfolioQueryKeys.myPortfolioWithParams(params),
  });
}
