import { Button, Select } from "@/app/(frontend)/components/ui";
import { INVESTMENT_SELECTS } from "@/app/(frontend)/constants/portfolio";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import type { InvestmentField } from "@/app/(frontend)/types/portfolio";
import { isInvestmentTypeSurveyComplete } from "../../../../../lib/classify-investment-type";

export default function InvestmentTypeCheck() {
  const {
    createAccountStep: step,
    setCreateAccountStep: setStep,
    createAccountInfo,
    setCreateAccountInfo,
  } = usePortfolioStore();

  const handleValueChange = (field: InvestmentField, value: string) => {
    setCreateAccountInfo({
      ...createAccountInfo,
      [field]: value,
    });
  };

  const isNextButtonDisabled =
    !isInvestmentTypeSurveyComplete(createAccountInfo);

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
              triggerClassName="h-8 rounded-[10px] border-2 border-[#D9D9D9] px-4  shadow-none hover:border-zinc-300 focus-visible:border-zinc-400 focus-visible:ring-0 [&_svg]:size-7 [&_svg]:text-[#C6C6C6]"
              contentClassName="rounded-[10px] border-2 border-[#D9D9D9] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
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

        <Button
          disabled={isNextButtonDisabled}
          variant="step-controls"
          onClick={() => setStep(step + 1)}
        >
          다음
        </Button>
      </div>
    </>
  );
}
