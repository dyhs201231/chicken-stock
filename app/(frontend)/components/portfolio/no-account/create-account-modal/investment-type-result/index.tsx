import { useUpdateMyInfo } from "@/app/(frontend)/apis/auth/mutations";
import { Button } from "@/app/(frontend)/components/ui";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import {
  classifyInvestmentType,
  getInvestmentTypeLabel,
} from "../../../../../lib/classify-investment-type";

export default function InvestmentTypeResult() {
  const {
    createAccountStep: step,
    setCreateAccountStep: setStep,
    createAccountInfo,
  } = usePortfolioStore();
  const { mutate: updateMyInfo, isPending: isUpdateMyInfoPending } =
    useUpdateMyInfo();

  const investmentType = classifyInvestmentType(createAccountInfo);
  const investmentTypeLabel = investmentType
    ? getInvestmentTypeLabel(investmentType)
    : "미정";
  const userName = createAccountInfo.name.trim() || "고객";

  const handleNextClick = () => {
    if (!investmentType) {
      return;
    }

    updateMyInfo(
      { investmentType },
      {
        onSuccess: () => {
          setStep(step + 1);
        },
      },
    );
  };

  return (
    <>
      <div className="col center flex-1 gap-6">
        <p className="text-xl">{userName}님의 투자성향은</p>
        <p className="text-[48px] leading-none">{investmentTypeLabel}</p>
      </div>

      <div className="row justify-end gap-3">
        <Button
          disabled={isUpdateMyInfoPending}
          variant="step-controls"
          onClick={() => setStep(step - 1)}
        >
          이전
        </Button>

        <Button
          disabled={!investmentType || isUpdateMyInfoPending}
          variant="step-controls"
          onClick={handleNextClick}
        >
          다음
        </Button>
      </div>
    </>
  );
}
