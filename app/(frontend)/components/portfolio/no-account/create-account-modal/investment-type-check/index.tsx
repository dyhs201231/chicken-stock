import { Button, Select } from "@/app/(frontend)/components/ui";
import { INVESTMENT_SELECTS } from "@/app/(frontend)/constants/portfolio";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import type { InvestmentField } from "@/app/(frontend)/types/portfolio";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { isInvestmentTypeSurveyComplete } from "../../../../../lib/classify-investment-type";

const SELECT_TRIGGER_CLASS_NAME =
  "h-8 rounded-[10px] border-2 border-(--cs-color-gray-200) px-4  shadow-none hover:border-zinc-300 focus-visible:border-zinc-400 focus-visible:ring-0 [&_svg]:size-7 [&_svg]:text-(--cs-color-gray-400)";
const SELECT_TRIGGER_ERROR_CLASS_NAME =
  "border-red-500 bg-red-50 hover:border-red-500 focus-visible:border-red-500";

export default function InvestmentTypeCheck() {
  const {
    createAccountStep: step,
    setCreateAccountStep: setStep,
    createAccountInfo,
    setCreateAccountInfo,
  } = usePortfolioStore();
  const [isValidationRequested, setIsValidationRequested] = useState(false);

  const handleValueChange = (field: InvestmentField, value: string) => {
    setCreateAccountInfo({
      ...createAccountInfo,
      [field]: value,
    });
  };

  const handleNextButtonClick = () => {
    setIsValidationRequested(true);

    if (!isInvestmentTypeSurveyComplete(createAccountInfo)) {
      return;
    }

    setStep(step + 1);
  };

  return (
    <>
      <div className="col center gap-7">
        {INVESTMENT_SELECTS.map(({ id, label, field, options }) => (
          <div
            className="row center w-[485px] gap-4 whitespace-nowrap"
            key={field}
          >
            <label className="w-[130px] text-end text-xl" htmlFor={id}>
              {label}
            </label>

            <Select
              id={id}
              className="w-[200px]"
              aria-invalid={
                isValidationRequested && !createAccountInfo[field].trim()
              }
              triggerClassName={twMerge(
                SELECT_TRIGGER_CLASS_NAME,
                isValidationRequested &&
                  !createAccountInfo[field].trim() &&
                  SELECT_TRIGGER_ERROR_CLASS_NAME,
              )}
              contentClassName="rounded-[10px] border-2 border-(--cs-color-gray-200) py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
              optionClassName="min-h-11 px-4 text-base"
              options={options}
              value={createAccountInfo[field]}
              onValueChange={(value) => handleValueChange(field, value)}
            />
          </div>
        ))}
      </div>

      <div className="row justify-end gap-3">
        <Button variant="step-controls" onClick={() => setStep(step - 1)}>
          이전
        </Button>

        <Button variant="step-controls" onClick={handleNextButtonClick}>
          다음
        </Button>
      </div>
    </>
  );
}
