import { useGetPortfolio } from "@/app/(frontend)/apis/portfolio/queries";
import { Button, Input, Tab } from "@/app/(frontend)/components/ui";
import { colorToken } from "@/app/(frontend)/constants/design-token";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import { ExchangeType } from "@/app/(frontend)/types/portfolio";
import { IconChevronsDown } from "@tabler/icons-react";
import React from "react";
import { twMerge } from "tailwind-merge";

const TAB = [
  {
    value: "krwToUsd",
    label: "달러로 환전",
  },
  {
    value: "usdToKrw",
    label: "원화로 환전",
  },
];

export default function ExchangeForm({
  exchangeRate,
  setStep,
}: {
  exchangeRate: number;
  setStep: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { exchangeData, setExchangeData } = usePortfolioStore();
  const { data } = useGetPortfolio();
  const formattedExchangeValue = exchangeData.value
    ? exchangeData.value.toLocaleString("ko-KR")
    : "";
  const exchangedValue =
    exchangeData.type === "krwToUsd"
      ? exchangeData.value / exchangeRate
      : exchangeData.value * exchangeRate;
  const formattedExchangedValue = exchangedValue.toLocaleString("ko-KR", {
    maximumFractionDigits: exchangeData.type === "krwToUsd" ? 2 : 0,
  });

  if (!data) {
    return null;
  }

  const availableExchangeBalance =
    exchangeData.type === "krwToUsd" ? data.krwBalance : data.usdBalance;

  const handleExchangeValueChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextValue =
      event.target.value === ""
        ? 0
        : Number(event.target.value.replaceAll(",", ""));

    const safeValue = Number.isNaN(nextValue)
      ? 0
      : Math.min(Math.max(nextValue, 0), availableExchangeBalance);

    setExchangeData({
      ...exchangeData,
      value: safeValue,
    });
  };

  const handleExchangeTypeChange = (type: ExchangeType) => {
    if (type === exchangeData.type) {
      return;
    }

    setExchangeData({
      ...exchangeData,
      type,
      value: 0,
    });
  };

  return (
    <>
      <div className="col gap-6">
        <h1 className="text-2xl">환전하기</h1>

        <Tab.Root defaultValue={exchangeData.type} direction="row" type="fill">
          {TAB.map((item) => (
            <Tab.Item
              className="px-20 py-2 text-xl"
              value={item.value}
              key={item.value}
              onClick={() =>
                handleExchangeTypeChange(item.value as ExchangeType)
              }
            >
              {item.label}
            </Tab.Item>
          ))}
        </Tab.Root>
      </div>

      <div className="col center gap-3">
        <div className="col w-full gap-5">
          <div className="row center w-full gap-2">
            <label className="text-xl whitespace-nowrap" htmlFor="user-name">
              {exchangeData.type === "krwToUsd" && "원화를"}
              {exchangeData.type === "usdToKrw" && "달러를"}
            </label>
            <Input
              aria-label="원화 평가 금액"
              rightAddon={
                <>
                  {exchangeData.type === "krwToUsd" && "원"}
                  {exchangeData.type === "usdToKrw" && "달러"}
                </>
              }
              inputClassName={twMerge(
                exchangeData.type === "krwToUsd" && "pr-7",
                exchangeData.type === "usdToKrw" && "pr-11",
                "text-right",
              )}
              inputMode="decimal"
              value={formattedExchangeValue}
              variant="underline"
              onChange={handleExchangeValueChange}
            />
          </div>

          <div className="text-end">
            환전 가능 금액 :{" "}
            {exchangeData.type === "krwToUsd" &&
              `${data.krwBalance.toLocaleString()}원`}
            {exchangeData.type === "usdToKrw" &&
              `${data.usdBalance.toLocaleString()}달러`}
          </div>
        </div>

        <IconChevronsDown size={80} color={colorToken.gray[600]} />

        <div className="col w-full gap-5">
          <div className="row center w-full gap-2">
            <label className="text-xl whitespace-nowrap" htmlFor="user-name">
              {exchangeData.type === "krwToUsd" && "달러로"}
              {exchangeData.type === "usdToKrw" && "원화로"}
            </label>

            <Input
              disabled
              aria-label="원화 평가 금액"
              rightAddon={
                <>
                  {exchangeData.type === "krwToUsd" && "달러"}
                  {exchangeData.type === "usdToKrw" && "원"}
                </>
              }
              inputClassName={twMerge(
                exchangeData.type === "krwToUsd" && "pr-11",
                exchangeData.type === "usdToKrw" && "pr-7",
                "text-right disabled:cursor-default disabled:bg-transparent disabled:text-zinc-950",
              )}
              value={formattedExchangedValue}
              variant="underline"
            />
          </div>

          <div className="text-end">
            적용 환율 : {exchangeRate.toLocaleString()}원
          </div>
        </div>
      </div>

      <div className="row justify-end">
        <Button
          disabled={!exchangeData.value}
          variant="step-controls"
          onClick={() => setStep("check")}
        >
          다음
        </Button>
      </div>
    </>
  );
}
