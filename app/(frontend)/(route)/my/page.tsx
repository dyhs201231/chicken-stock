import MyInfo from "../../components/my/my-info";
import FeesBenefits from "../../components/my/fees-benefits";
import DeleteAccount from "../../components/my/delete-account";

export default function MyPage() {
  return (
    <div className="col mx-auto min-h-[calc(100dvh-72px)] w-full max-w-[1000px] gap-9 bg-white px-5 py-30">
      <MyInfo />
      <FeesBenefits />
      <DeleteAccount />
    </div>
  );
}
