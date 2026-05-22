import MyInfo from "../../components/my/my-info";
import FeesBenefits from "../../components/my/fees-benefits";
import DeleteAccount from "../../components/my/delete-account";

export default function MyPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-72px)] w-full max-w-[1000px] flex-col gap-9 bg-white py-30">
      <MyInfo />
      <FeesBenefits />
      <DeleteAccount />
    </div>
  );
}
