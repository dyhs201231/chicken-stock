import React from "react";

export default function FeesBenefits() {
  return (
    <div className="w-full">
      <h1 className="mb-9 w-full border-b border-(--cs-color-gray-500) pb-4 text-[40px]">
        수수료 및 혜택
      </h1>

      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">내 수수료</h2>

          <div className="flex flex-col gap-4 pl-6">
            <div className="flex gap-8">
              <p className="text-lg">국내주식</p>
              <p className="w-11 text-right text-lg font-semibold">0%</p>
            </div>

            <div className="flex gap-8">
              <p className="text-lg">해외주식</p>
              <p className="w-11 text-right text-lg font-semibold">0.1%</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">받고 있는 혜택</h2>

          <div className="flex flex-col gap-4 pl-6">
            <p className="text-lg">$10 이하 거래시 해외주식 수수료 무료</p>
            <p className="text-lg">환율 우대 95% (영업일 9:10 ~ 15:20)</p>
            <p className="text-lg">해외주식 실시간 시세 평생 무료</p>
          </div>
        </div>
      </div>
    </div>
  );
}
