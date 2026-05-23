export type PortfolioTab = "기본계좌" | "거래내역" | "예상 배당금" | "수입분석";

export type InvestmentType =
  | "AGGRESSIVE"
  | "ACTIVE"
  | "BALANCED"
  | "CONSERVATIVE"
  | "STABLE";

export type InvestmentField =
  | "investmentGoal"
  | "investmentExperience"
  | "annualIncome"
  | "lossTolerance"
  | "interests";

export type CreateAccountInfo = {
  name: string;
  phoneNumber: string;
  investmentGoal: string;
  investmentExperience: string;
  annualIncome: string;
  lossTolerance: string;
  interests: string;
};
