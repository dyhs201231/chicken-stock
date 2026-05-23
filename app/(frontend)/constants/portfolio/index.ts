import { SelectOption } from "../../components/ui";
import { InvestmentField, PortfolioTab } from "../../types/portfolio";

export const PORTFOLIO_TAB = [
  "기본계좌",
  "거래내역",
  "예상 배당금",
  "수입분석",
] as PortfolioTab[];

export const INVESTMENT_SELECTS: {
  id: string;
  label: string;
  field: InvestmentField;
  options: SelectOption[];
}[] = [
  {
    id: "investment-goal",
    label: "투자 목적",
    field: "investmentGoal",
    options: [
      { label: "안정적 자산 관리", value: "안정적 자산 관리" },
      { label: "수익 추구", value: "수익 추구" },
      { label: "단기 고수익", value: "단기 고수익" },
    ],
  },
  {
    id: "investment-experience",
    label: "투자 경험",
    field: "investmentExperience",
    options: [
      { label: "처음", value: "처음" },
      { label: "조금 있음", value: "조금 있음" },
      { label: "많음", value: "많음" },
    ],
  },
  {
    id: "annual-income",
    label: "연 소득",
    field: "annualIncome",
    options: [
      { label: "3천만원 미만", value: "3천만원 미만" },
      { label: "5천만원 미만", value: "5천만원 미만" },
      { label: "8천만원 미만", value: "8천만원 미만" },
      { label: "1억 미만", value: "1억 미만" },
      { label: "1억 이상", value: "1억 이상" },
    ],
  },
  {
    id: "loss-tolerance",
    label: "손실 허용 범위",
    field: "lossTolerance",
    options: [
      { label: "~5%도 부담", value: "~5%도 부담" },
      { label: "~15%까지 가능", value: "~15%까지 가능" },
      { label: "고위험 가능", value: "고위험 가능" },
    ],
  },
  {
    id: "interests",
    label: "관심 분야",
    field: "interests",
    options: [
      { label: "배당", value: "배당" },
      { label: "성장주", value: "성장주" },
      { label: "ETF", value: "ETF" },
      { label: "테마주", value: "테마주" },
    ],
  },
];
