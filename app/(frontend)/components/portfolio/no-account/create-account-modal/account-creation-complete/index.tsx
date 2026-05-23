import { Button } from "@/app/(frontend)/components/ui";

type AccountCreationCompleteProps = {
  onConfirm: () => void;
};

export default function AccountCreationComplete({
  onConfirm,
}: AccountCreationCompleteProps) {
  return (
    <>
      <div className="col center flex-1 text-[36px] font-semibold">
        <p>축하합니다!</p>
        <p>삼성전자 1주를 받았습니다!</p>
      </div>

      <div className="row justify-end">
        <Button variant="step-controls" onClick={onConfirm}>
          확인
        </Button>
      </div>
    </>
  );
}
