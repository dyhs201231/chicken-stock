import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  CreateAccountInfo,
  ExchangeData,
  PortfolioTab,
} from "../../types/portfolio";

interface PortfolioStore {
  selectedTab: PortfolioTab;
  setSelectedTab: (tab: PortfolioTab) => void;

  createAccountStep: number;
  setCreateAccountStep: (step: number) => void;

  createAccountInfo: CreateAccountInfo;
  setCreateAccountInfo: (info: PortfolioStore["createAccountInfo"]) => void;

  exchangeData: ExchangeData;
  setExchangeData: (data: PortfolioStore["exchangeData"]) => void;

  clearPortfolioStore: () => void;
}

export const usePortfolioStore = create<PortfolioStore>()(
  devtools((set) => ({
    selectedTab: "기본계좌",
    setSelectedTab: (tab) => set({ selectedTab: tab }),

    createAccountStep: 0,
    setCreateAccountStep: (step) => set({ createAccountStep: step }),

    createAccountInfo: {
      name: "",
      phoneNumber: "",
      investmentGoal: "",
      investmentExperience: "",
      annualIncome: "",
      lossTolerance: "",
      interests: "",
    },
    setCreateAccountInfo: (info) => set({ createAccountInfo: info }),

    exchangeData: {
      type: "krwToUsd",
      value: 0,
    },
    setExchangeData: (data) => set({ exchangeData: data }),

    clearPortfolioStore: () =>
      set({
        selectedTab: "기본계좌",
        createAccountStep: 0,

        createAccountInfo: {
          name: "",
          phoneNumber: "",
          investmentGoal: "",
          investmentExperience: "",
          annualIncome: "",
          lossTolerance: "",
          interests: "",
        },
      }),
  })),
);
