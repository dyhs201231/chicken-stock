export type IncomeAnalysisView = "전체" | "국내주식" | "해외주식";

export type IncomeMonth = {
  year: number;
  month: number;
};

export type IncomeSummaryData = {
  accountInterest: number;
  dividendIncome: number;
  saleProfit: number | null;
  totalRealizedIncome: number | null;
};

export type SaleIncomeRow = {
  assetType: string;
  companyName: string;
  fee: number;
  id: string;
  profitRate: number | null;
  saleDate: string;
  saleProfit: number | null;
  totalPurchaseAmount: number | null;
  totalQuantity: number;
  totalSaleAmount: number;
};
