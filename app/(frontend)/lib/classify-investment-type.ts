import type {
  CreateAccountInfo,
  InvestmentField,
  InvestmentType,
} from "@/app/(frontend)/types/portfolio";

type InvestmentSurveyInfo = Pick<CreateAccountInfo, InvestmentField>;

const INVESTMENT_FIELDS: InvestmentField[] = [
  "investmentGoal",
  "investmentExperience",
  "annualIncome",
  "lossTolerance",
  "interests",
];

const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  AGGRESSIVE: "공격투자형",
  ACTIVE: "적극투자형",
  BALANCED: "위험중립형",
  CONSERVATIVE: "안정추구형",
  STABLE: "안정형",
};

const INVESTMENT_TYPE_SCORE_RULES: Record<
  InvestmentField,
  Record<string, number>
> = {
  investmentGoal: {
    "안정적 자산 관리": 0,
    "수익 추구": 2,
    "단기 고수익": 4,
  },
  investmentExperience: {
    처음: 0,
    "조금 있음": 1,
    많음: 2,
  },
  annualIncome: {
    "3천만원 미만": 0,
    "5천만원 미만": 1,
    "8천만원 미만": 2,
    "1억 미만": 3,
    "1억 이상": 4,
  },
  lossTolerance: {
    "~5%도 부담": 0,
    "~15%까지 가능": 2,
    "고위험 가능": 4,
  },
  interests: {
    배당: 0,
    ETF: 1,
    성장주: 3,
    테마주: 4,
  },
};

const INVESTMENT_TYPE_THRESHOLDS: {
  maxScore: number;
  type: InvestmentType;
}[] = [
  { maxScore: 3, type: "STABLE" },
  { maxScore: 7, type: "CONSERVATIVE" },
  { maxScore: 11, type: "BALANCED" },
  { maxScore: 15, type: "ACTIVE" },
  { maxScore: Number.POSITIVE_INFINITY, type: "AGGRESSIVE" },
];

export function isInvestmentTypeSurveyComplete(info: InvestmentSurveyInfo) {
  return INVESTMENT_FIELDS.every((field) => info[field].trim().length > 0);
}

export function getInvestmentTypeLabel(type: InvestmentType) {
  return INVESTMENT_TYPE_LABELS[type];
}

export function classifyInvestmentType(
  info: InvestmentSurveyInfo,
): InvestmentType | null {
  if (!isInvestmentTypeSurveyComplete(info)) {
    return null;
  }

  const score = INVESTMENT_FIELDS.reduce((totalScore, field) => {
    const selectedValue = info[field];

    return (
      totalScore + (INVESTMENT_TYPE_SCORE_RULES[field][selectedValue] ?? 0)
    );
  }, 0);

  return (
    INVESTMENT_TYPE_THRESHOLDS.find(({ maxScore }) => score <= maxScore)
      ?.type ?? "STABLE"
  );
}
