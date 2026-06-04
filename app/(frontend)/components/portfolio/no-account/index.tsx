import CreateAccountModal from "./create-account-modal";

export default function NoAccount() {
  return (
    <div className="col center flex-1 gap-12">
      <div className="col center gap-5">
        <h1 className="text-[40px]">아직 개설된 계좌가 없어요.</h1>
        <p className="text-xl">
          포트폴리오를 확인하려면 먼저 모의투자 계좌를 개설해 주세요.
        </p>
      </div>

      <CreateAccountModal />
    </div>
  );
}
