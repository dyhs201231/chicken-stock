"use client";

import Link from "next/link";
import { showWarningToast } from "@/app/(frontend)/utils/toast";

type QuizStartButtonProps = {
  href: string;
  isCompleted: boolean;
  isLoggedIn: boolean;
};

const buttonClassName =
  "inline-flex min-h-14 items-center justify-center rounded-lg bg-zinc-950 px-10 text-2xl font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:outline-none";

export default function QuizStartButton({
  href,
  isCompleted,
  isLoggedIn,
}: QuizStartButtonProps) {
  if (isCompleted) {
    return (
      <button
        type="button"
        className="inline-flex min-h-14 cursor-not-allowed items-center justify-center rounded-lg bg-zinc-300 px-10 text-2xl font-semibold text-zinc-500"
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
