import { useUsdKrwExchangeRateQuery } from "@/app/(frontend)/apis/market-indices/queries";
import { Modal } from "@/app/(frontend)/components/ui";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import { useState } from "react";
import ExchangeForm from "./exchange-form";
import ExchangeCheck from "./exchange-check";
import { getExchangeViewState } from "./exchange-state";

export default function CurrencyExchangeModal() {
  const { exchangeData, setExchangeData } = usePortfolioStore();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState("form");
  const {
    data: exchangeRateQuote,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useUsdKrwExchangeRateQuery(isOpen);
  const exchangeViewState = getExchangeViewState({
    data: exchangeRateQuote,
    isError,
    isLoading: isPending || isFetching,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);

    if (!nextOpen) {
      setStep("form");
      setExchangeData({
        ...exchangeData,
        value: 0,
      });
    }
  };

  return (
    <Modal.Root isOpen={isOpen} setIsOpen={handleOpenChange}>
      <button onClick={() => handleOpenChange(true)} className="cursor-pointer">
        환전
      </button>

      <Modal.Overlay>
        <Modal.Content className="col min-h-[565px] w-full max-w-[650px] justify-between">
          {isPending && (
            <p className="m-auto text-center text-xl">최신 환율 확인 중...</p>
          )}
          {isError && (
            <div className="col center m-auto gap-4 text-center">
              <p className="text-xl">
                최신 환율을 확인할 수 없어 지금은 환전할 수 없습니다.
              </p>
              <button className="cursor-pointer underline" onClick={() => refetch()}>
                다시 시도
              </button>
            </div>
          )}
          {exchangeViewState.canContinue && step === "form" && (
            <ExchangeForm exchangeRate={exchangeViewState.rate} setStep={setStep} />
          )}
          {exchangeViewState.canContinue && step === "check" && (
            <ExchangeCheck
              exchangeRate={exchangeViewState.rate}
              quoteToken={exchangeViewState.token}
              setStep={setStep}
              onExchangeSuccess={() => handleOpenChange(false)}
              onQuoteExpired={() => {
                setStep("form");
                void refetch();
              }}
            />
          )}
        </Modal.Content>
      </Modal.Overlay>
    </Modal.Root>
  );
}
