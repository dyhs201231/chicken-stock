"use client";

import { useGetMyInfo } from "@/app/(frontend)/apis/auth/queries";
import { Avatar } from "@/app/(frontend)/components/ui";
import { getInvestmentTypeLabel } from "@/app/(frontend)/lib/classify-investment-type";

export default function MyInfo() {
  const { data, isPending } = useGetMyInfo();

  if (isPending) {
    return null;
  }

  if (!data?.isLoggedIn) {
    return null;
  }

  return (
    <div className="w-full">
      <h1 className="mb-9 w-full border-b border-(--cs-color-gray-500) pb-4 text-[40px]">
        내 정보
      </h1>

      <div className="flex items-center gap-4">
        <Avatar
          type="mypage"
          src={data.user.profileImageUrl || "/test-image.webp"}
          alt="프로필 이미지"
        />

        <div className="flex flex-col gap-4">
          <div className="flex gap-7">
            <p className="w-25 text-lg">이름(이메일)</p>
            <p className="text-lg">{data.user.email}</p>
          </div>

          <div className="flex gap-7">
            <p className="w-25 text-lg">내 투자유형</p>
            <p className="text-lg font-semibold text-(--cs-color-blue-500)">
              {data.user.investmentType
                ? getInvestmentTypeLabel(data.user.investmentType)
                : "미정"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
