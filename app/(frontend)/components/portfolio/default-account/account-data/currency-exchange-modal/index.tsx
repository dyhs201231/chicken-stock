import { useUsdKrwExchangeRateQuery } from "@/app/(frontend)/apis/market-indices/queries";
import { Modal } from "@/app/(frontend)/components/ui";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import { USD_KRW_EXCHANGE_RATE } from "@/app/(frontend)/utils/currency";
import { useState } from "react";
import ExchangeForm from "./exchange-form";
import ExchangeCheck from "./exchange-check";

export default function CurrencyExchangeModal() {
  const { exchangeData, setExchangeData } = usePortfolioStore();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState("form");
  const { data: exchangeRateData } = useUsdKrwExchangeRateQuery(isOpen);
  const exchangeRate = exchangeRateData?.currentValue ?? USD_KRW_EXCHANGE_RATE;

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
          {step === "form" && (
            <ExchangeForm exchangeRate={exchangeRate} setStep={setStep} />
          )}
          {step === "check" && (
            <ExchangeCheck
              exchangeRate={exchangeRate}
              setStep={setStep}
              onExchangeSuccess={() => handleOpenChange(false)}
            />
          )}
        </Modal.Content>
      </Modal.Overlay>
    </Modal.Root>
  );
}
