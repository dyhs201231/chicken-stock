import { requests } from "../request";
import type { ExchangeType, InvestmentType } from "../../types/portfolio";

export type PortfolioTransactionType =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "EXCHANGE"
  | "DEPOSIT"
  | "WITHDRAWAL";
export type PortfolioAssetType = "DOMESTIC_STOCK" | "FOREIGN_STOCK";

export type CreatePortfolioRequest = {
  investmentType: InvestmentType;
};

export type ExchangePortfolioRequest = {
  type: ExchangeType;
  value: number;
};

export type GetPortfolioParams = {
  incomeMonth?: number;
  incomeYear?: number;
};

export type PortfolioItem = {
  assetType: PortfolioAssetType;
  averagePrice: string;
  companyLogoUrl: string;
  companyName: string;
  createdAt: string;
  currentPrice: string;
  fee: string;
  portfolioId: string;
  profit: string;
  profitRate: string;
  quantity: number;
  saleTax: string;
  stockId: number;
  totalInvested: string;
  updatedAt: string;
};

export type PortfolioTransaction = {
  companyName: string;
  createdAt: string;
  executedAt: string;
  exchangeRate: string | null;
  exchangeType: ExchangeType | null;
  fee: string;
  id: string;
  paidAmount: string | null;
  portfolioId: string;
  purchaseAmount: string | null;
  receivedAmount: string | null;
  realizedProfit: string | null;
  stockId: number | null;
  totalAmount: string;
  totalQuantity: number;
  tradeOrderId: string | null;
  transactionType: PortfolioTransactionType;
  updatedAt: string;
  withdrawalAt: string;
};

export type Portfolio = {
  accountNumber: string;
  createdAt: string;
  domesticStockAmount: number;
  foreignStockAmount: number;
  id: string;
  items: PortfolioItem[];
  krwBalance: number;
  totalAvailableOrderAmount: number;
  totalBalance: number;
  totalInvestmentAmount: number;
  transactions: PortfolioTransaction[];
  updatedAt: string;
  usdBalance: number;
  userId: string;
};

export type PortfolioResponse = Portfolio | null;

export type CreatePortfolioResponse = {
  ok: true;
  portfolio: {
    accountNumber: string;
    id: string;
    userId: string;
  };
};

export type ExchangePortfolioResponse = {
  exchangeRate: number;
  ok: true;
  paidAmount: number;
  portfolio: Pick<
    Portfolio,
    | "id"
    | "krwBalance"
    | "totalAvailableOrderAmount"
    | "totalBalance"
    | "usdBalance"
  >;
  receivedAmount: number;
  type: ExchangeType;
};

export async function getPortfolio(params?: GetPortfolioParams) {
  const { data } = await requests.get<PortfolioResponse>("/api/portfolio", {
    params,
  });

  return data;
}

export async function createPortfolio(payload: CreatePortfolioRequest) {
  const { data } = await requests.post<CreatePortfolioResponse>(
    "/api/portfolio",
    payload,
  );

  return data;
}

export async function exchangePortfolio(payload: ExchangePortfolioRequest) {
  const { data } = await requests.post<ExchangePortfolioResponse>(
    "/api/portfolio/exchange",
    payload,
  );

  return data;
}
