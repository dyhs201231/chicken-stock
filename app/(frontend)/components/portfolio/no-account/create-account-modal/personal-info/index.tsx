import { Button, Input } from "@/app/(frontend)/components/ui";
import formatPhoneNumber from "@/app/(frontend)/lib/format-phone-number";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import { ChangeEvent } from "react";

export default function PersonalInfo() {
  const {
    createAccountStep: step,
    setCreateAccountStep: setStep,
    createAccountInfo,
    setCreateAccountInfo,
  } = usePortfolioStore();

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCreateAccountInfo({
      ...createAccountInfo,
      name: event.target.value,
    });
  };

  const handlePhoneNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCreateAccountInfo({
      ...createAccountInfo,
      phoneNumber: formatPhoneNumber(event.target.value),
    });
  };

  return (
    <>
      <div className="col center gap-10">
        <div className="row w-70 items-center justify-between whitespace-nowrap">
          <label className="text-xl" htmlFor="user-name">
            이름
          </label>
          <Input
            id="user-name"
            className="w-[185px]"
            inputClassName="text-center text-xl text-black placeholder:text-zinc-400"
            value={createAccountInfo.name}
            onChange={handleNameChange}
            placeholder="김현수"
            variant="underline"
          />
        </div>

        <div className="row w-70 items-center justify-between whitespace-nowrap">
          <label className="text-xl" htmlFor="user-phone">
            연락처
          </label>
          <Input
            id="user-phone"
            className="w-[185px]"
            inputClassName="text-center text-xl text-black placeholder:text-zinc-400"
            inputMode="numeric"
            maxLength={13}
            autoComplete="tel"
            placeholder="010-1234-5678"
            value={createAccountInfo.phoneNumber}
            onChange={handlePhoneNumberChange}
            variant="underline"
          />
        </div>
      </div>

      <div className="row justify-end gap-3">
        {/* <Button variant="step-controls" onClick={() => setStep(step - 1)}>
          이전
        </Button> */}

        <Button variant="step-controls" onClick={() => setStep(step + 1)}>
          다음
        </Button>
      </div>
    </>
  );
}
