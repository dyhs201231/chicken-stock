"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useGetMyInfo } from "../../../apis/auth/queries";
import { useEducationSummariesQuery } from "../../../apis/edu/queries";
import type { EducationSummary } from "../../../apis/edu/api";
import EducationCard from "../education-card";

const educationCardStyles = [
  {
    image: "/images/edu/egg.webp",
    className:
      "xl:absolute xl:top-96 xl:left-0 xl:z-10 xl:h-[359px] xl:w-[440px] xl:max-w-[500px]",
  },
  {
    image: "/images/edu/chick.webp",
    className:
      "xl:absolute xl:top-[31rem] xl:left-1/2 xl:z-30 xl:h-[359px] xl:w-[440px] xl:max-w-[500px] xl:-translate-x-1/2",
  },
  {
    image: "/images/edu/chicken.webp",
    className:
      "xl:absolute xl:top-96 xl:right-0 xl:z-10 xl:h-[359px] xl:w-[440px] xl:max-w-[500px]",
  },
] as const;

type EduContentProps = {
  initialEducationSummaries?: EducationSummary[];
};

export default function EduContent({
  initialEducationSummaries,
}: EduContentProps) {
  const searchParams = useSearchParams();
  const openLevel = searchParams.get("openLevel");
  const { data: myInfo, isLoading: isMyInfoLoading } = useGetMyInfo();
  const userId = myInfo?.isLoggedIn ? myInfo.user.id : null;

  const {
    data: educationSummaries = [],
    isError,
    isLoading: isEducationLoading,
  } = useEducationSummariesQuery(userId, {
    initialData: initialEducationSummaries,
  });

  const educationCards = useMemo(
    () =>
      educationSummaries.map((summary, index) => ({
        level: String(summary.stage),
        title: summary.title,
        image:
          educationCardStyles[index]?.image ?? educationCardStyles[0].image,
        className: educationCardStyles[index]?.className,
        data: {
          summary: summary.summary,
          list: summary.articles.map((article) => ({
            id: String(article.id),
            level: String(summary.stage),
            title: article.title,
            progressRate: article.progressRate,
            isCompleted: article.isCompleted,
          })),
        },
      })),
    [educationSummaries],
  );

  const isLoading = isMyInfoLoading || isEducationLoading;
  const hasEducationCards = educationCards.length > 0;
  const isEmpty = !isLoading && !isError && !hasEducationCards;
  const shouldShowCards = !isLoading && !isError && hasEducationCards;

  return (
    <>
      {isLoading && (
        <p className="mt-3 rounded-lg bg-white/90 px-5 py-4 text-center text-base font-medium text-zinc-700 shadow-sm">
          학습 데이터를 불러오고 있어요.
        </p>
      )}

      {isError && (
        <p className="mt-3 rounded-lg bg-white/90 px-5 py-4 text-center text-base font-medium text-zinc-700 shadow-sm">
          학습 데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      )}

      {shouldShowCards &&
        educationCards.map((card, index) => (
          <EducationCard
            key={`${card.level}-${openLevel === card.level ? "open" : "idle"}`}
            level={card.level}
            title={card.title}
            image={card.image}
            data={card.data}
            className={card.className}
            autoOpenList={openLevel === card.level}
            priority={index === 0}
          />
        ))}

      {isEmpty && (
        <p className="mt-3 rounded-lg bg-white/90 px-5 py-4 text-center text-base font-medium text-zinc-700 shadow-sm">
          아직 준비된 학습 데이터가 없어요.
        </p>
      )}
    </>
  );
}
