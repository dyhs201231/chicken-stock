"use client";

import Link from "next/link";
import { showWarningToast } from "@/app/(frontend)/utils/toast";

type QuizStartButtonProps = {
  href: string;
  isCompleted: boolean;
  isLoggedIn: boolean;
};

const buttonClassName =
  "inline-flex min-h-12 items-center justify-center rounded-lg bg-(--cs-brand-700) px-7 text-lg font-semibold text-white shadow-(--cs-shadow-sm) transition-colors hover:bg-(--cs-brand-800)";

export default function QuizStartButton({
  href,
  isCompleted,
  isLoggedIn,
}: QuizStartButtonProps) {
  if (isCompleted) {
    return (
      <button
        type="button"
        className="inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-lg bg-(--cs-brand-100) px-7 text-lg font-semibold text-(--cs-brand-700) opacity-70"
        disabled
      >
        퀴즈 완료
      </button>
    );
  }

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        className={buttonClassName}
        onClick={() => {
          void showWarningToast("로그인이 필요한 페이지입니다.");
        }}
      >
        퀴즈 풀러 가기
      </button>
    );
  }

  return (
    <Link href={href} className={buttonClassName}>
      퀴즈 풀러 가기
    </Link>
  );
}
