import { Button } from "@/app/(frontend)/components/ui";

type AccountCreationCompleteProps = {
  isPending: boolean;
  onConfirm: () => void;
};

export default function AccountCreationComplete({
  isPending,
  onConfirm,
}: AccountCreationCompleteProps) {
  return (
    <>
      <div className="col center flex-1 text-[36px] font-semibold">
        <p>축하합니다!</p>
        <p>원화 100,000원이 충전되었습니다!</p>
      </div>

      <div className="row justify-end">
        <Button
          disabled={isPending}
          variant="step-controls"
          onClick={onConfirm}
        >
          {isPending && "처리 중"}
          {!isPending && "확인"}
        </Button>
      </div>
    </>
  );
}
