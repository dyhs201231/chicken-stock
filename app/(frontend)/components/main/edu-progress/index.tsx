"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useGetMyInfo } from "../../../apis/auth/queries";
import { useEducationSummariesQuery } from "../../../apis/edu/queries";

function clampProgressRate(progressRate: number) {
  return Math.min(100, Math.max(0, progressRate));
}

function getCharacterImages() {
  return {
    nest: "/images/main/nest.webp",
    egg: "/images/main/egg.svg",
  };
}

export default function EduProgress() {
  const characterImages = getCharacterImages();
  const { data: myInfo, isLoading: isMyInfoLoading } = useGetMyInfo();
  const isLoggedIn = myInfo?.isLoggedIn === true;
  const userId = isLoggedIn ? myInfo.user.id : null;
  const userLevel = isLoggedIn ? myInfo.user.currentLevel : null;

  const { data: educationSummaries = [], isLoading: isEducationLoading } =
    useEducationSummariesQuery(userId, { enabled: isLoggedIn });

  const progressRate = useMemo(() => {
    const articles = educationSummaries.flatMap((summary) => summary.articles);

    if (articles.length === 0) {
      return 0;
    }

    const totalProgressRate = articles.reduce(
      (total, article) => total + clampProgressRate(article.progressRate),
      0,
    );

    return Math.floor(totalProgressRate / articles.length);
  }, [educationSummaries]);

  const guestBubbleText =
    !isMyInfoLoading && !isLoggedIn && "가입하고 주식 공부를 시작해보세요!";

  const progressBubbleText =
    isLoggedIn && !isEducationLoading && `진행중 ${progressRate}%`;

  const bubbleText = guestBubbleText || progressBubbleText || null;

  return (
    <section className="flex min-w-0 flex-col rounded-2xl bg-white p-5 lg:h-full">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl leading-tight font-bold tracking-[-0.02em] text-(--cs-text-strong)">
            학습 현황
          </h2>
        </div>
      </div>

      <div className="relative h-28 w-full overflow-hidden rounded-xl">
        <div aria-hidden="true" className="absolute inset-0">
          {/* <Image
            src="/images/main/edu-progress.webp"
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 1024px) calc(100vw - 40px), 25vw"
            className="object-fill brightness-95 saturate-115"
          /> */}
        </div>

        <div className="absolute inset-y-0 left-3 flex items-end">
          <div className="relative h-24 w-32">
            <Image
              src={characterImages.nest}
              alt=""
              width={172}
              height={110}
              className="absolute bottom-0 left-1/2 w-24 -translate-x-1/2"
            />

            <Image
              src={characterImages.egg}
              alt={userLevel ? `Level ${userLevel} 학습 캐릭터` : "학습 캐릭터"}
              width={119}
              height={145}
              loading="eager"
              className="absolute bottom-6 left-1/2 w-14 -translate-x-1/2"
              unoptimized
            />
          </div>
        </div>

        {bubbleText && (
          <div className="absolute top-1 right-2 h-20 w-24">
            <Image
              src="/images/main/rounded-speech-bubble.webp"
              alt=""
              fill
              sizes="192px"
              className="object-contain"
              unoptimized
            />

            <p className="absolute top-[43%] left-1/2 w-3/4 -translate-x-1/2 -translate-y-1/2 text-center text-xs leading-4 font-semibold text-zinc-950">
              {bubbleText}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
