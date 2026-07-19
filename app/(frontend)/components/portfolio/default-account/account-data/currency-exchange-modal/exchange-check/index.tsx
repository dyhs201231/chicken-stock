import { useExchangePortfolio } from "@/app/(frontend)/apis/portfolio/mutations";
import { Button } from "@/app/(frontend)/components/ui";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import React from "react";
import { toast } from "sonner";
import { isAxiosError } from "axios";

export default function ExchangeCheck({
  exchangeRate,
  onExchangeSuccess,
  onQuoteExpired,
  quoteToken,
  setStep,
}: {
  exchangeRate: number;
  onExchangeSuccess: () => void;
  onQuoteExpired: () => void;
  quoteToken: string;
  setStep: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { exchangeData, setExchangeData } = usePortfolioStore();
  const { mutate: exchangePortfolio, isPending: isExchangePending } =
    useExchangePortfolio();
  const exchangedValue =
    exchangeData.type === "krwToUsd"
      ? exchangeData.value / exchangeRate
      : exchangeData.value * exchangeRate;
  const sourceAmount = exchangeData.value.toLocaleString("ko-KR");
  const targetAmount = exchangedValue.toLocaleString("ko-KR", {
    maximumFractionDigits: exchangeData.type === "krwToUsd" ? 2 : 0,
  });
  const sourceUnit = exchangeData.type === "krwToUsd" ? "원" : "달러";
  const targetUnit = exchangeData.type === "krwToUsd" ? "달러" : "원";
  const sourceText = `${sourceAmount}${sourceUnit}`;
  const targetText = `${targetAmount}${targetUnit}`;

  const handleExchange = () => {
    exchangePortfolio({ ...exchangeData, quoteToken }, {
      onError: (error) => {
        if (
          isAxiosError<{ code?: string }>(error) &&
          (error.response?.data.code === "EXCHANGE_RATE_QUOTE_EXPIRED" ||
            error.response?.data.code === "EXCHANGE_RATE_QUOTE_INVALID")
        ) {
          toast.error("환율이 갱신되었습니다. 금액을 다시 확인해주세요.");
          onQuoteExpired();
          return;
        }

        toast.error("환전에 실패했습니다. 잔액을 확인해주세요.");
      },
      onSuccess: () => {
        setExchangeData({
          ...exchangeData,
          value: 0,
        });
        onExchangeSuccess();
      },
    });
  };

  return (
    <>
      <h1 className="pt-20 text-center text-2xl">
        {sourceText}을 {targetText}로 바꿀게요
      </h1>

      <div className="col gap-10">
        <div className="row justify-between text-xl">
          <p>내야할 금액</p>
          <p>{sourceText}</p>
        </div>

        <div className="row justify-between text-xl">
          <p>적용 환율</p>
          <p>{exchangeRate.toLocaleString()} 원</p>
        </div>

        <div className="row justify-between text-xl">
          <p>환전 수수료</p>
          <p>0 원</p>
        </div>
      </div>

      <div className="row justify-end gap-2">
        <Button variant="step-controls" onClick={() => setStep("form")}>
          이전
        </Button>

        <Button
          disabled={isExchangePending}
          variant="step-controls"
          onClick={handleExchange}
        >
          {isExchangePending && "처리 중"}
          {!isExchangePending && "환전"}
        </Button>
      </div>
    </>
  );
}
