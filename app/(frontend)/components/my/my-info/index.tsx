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
    <section className="w-full rounded-2xl bg-white p-6 md:p-8">
      <h1 className="mb-6 text-lg font-bold tracking-[-0.02em] md:text-xl">
        내 정보
      </h1>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar
          type="mypage"
          src={data.user.profileImageUrl || "/test-image.webp"}
          alt="프로필 이미지"
        />

        <dl className="grid flex-1 gap-4">
          <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:gap-4">
            <dt className="text-sm font-medium text-(--cs-text-muted)">
              이름(이메일)
            </dt>
            <dd className="text-base break-words md:text-lg">
              {data.user.email}
            </dd>
          </div>

          <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:gap-4">
            <dt className="text-sm font-medium text-(--cs-text-muted)">
              내 투자유형
            </dt>
            <dd className="text-base font-semibold text-(--cs-color-blue-500) md:text-lg">
              {data.user.investmentType
                ? getInvestmentTypeLabel(data.user.investmentType)
                : "미정"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
