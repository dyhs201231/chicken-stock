import { Modal } from "@/app/(frontend)/components/ui";
import PersonalInfo from "./personal-info";
import InvestmentTypeCheck from "./investment-type-check";
import InvestmentTypeResult from "./investment-type-result";
import RealFlow from "./real-flow";
import AccountCreationComplete from "./account-creation-complete";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authQueryKeys } from "@/app/(frontend)/apis/auth/queries";

const STEPS = [
  {
    title: "개인정보 입력",
  },

  {
    title: "투자 성향 분석",
  },

  {
    title: "투자 성향 분석 결과",
  },

  {
    title: "실제 증권사에서는 이렇게 해요",
  },

  {
    title: "신규 계좌 개설 완료",
  },
];

export default function CreateAccountModal() {
  const { createAccountStep: step, clearPortfolioStore } = usePortfolioStore();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const invalidateMyInfo = () => {
    void queryClient.invalidateQueries({ queryKey: authQueryKeys.myInfo });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);

    if (!nextOpen) {
      invalidateMyInfo();
      clearPortfolioStore();
    }
  };

  const handleComplete = () => {
    handleOpenChange(false);
  };

  const stepComponent = [
    <PersonalInfo key="personal-info" />,
    <InvestmentTypeCheck key="investment-type-check" />,
    <InvestmentTypeResult key="investment-type-result" />,
    <RealFlow key="real-flow" />,
    <AccountCreationComplete
      key="account-creation-complete"
      onConfirm={handleComplete}
    />,
  ][step];

  return (
    <Modal.Root
      isOpen={isOpen}
      setIsOpen={handleOpenChange}
      showCloseButton={false}
    >
      <Modal.Trigger className="cursor-pointer rounded-[10px] bg-[#D9D9D9]/40 px-3.5 py-2.5 text-xl font-semibold">
        계좌 개설하기
      </Modal.Trigger>

      <Modal.Overlay>
        <Modal.Content className="col min-h-[565px] w-full max-w-[650px] justify-between">
          <h1 className="text-2xl">{STEPS[step].title}</h1>

          {stepComponent}
        </Modal.Content>
      </Modal.Overlay>
    </Modal.Root>
  );
}
