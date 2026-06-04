import AccountData from "./account-data";
import BalanceData from "./balance-data";

export default function DefaultAccount() {
  return (
    <div className="col gap-30">
      <AccountData />
      <BalanceData />
    </div>
  );
}
