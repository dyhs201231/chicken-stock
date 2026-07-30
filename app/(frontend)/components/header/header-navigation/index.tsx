"use client";

import { type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useGetMyInfo } from "@/app/(frontend)/apis/auth/queries";
import { showWarningToast } from "@/app/(frontend)/utils/toast";

const AUTH_REQUIRED_MESSAGE = "로그인이 필요한 페이지입니다.";

const NAVIGATION = [
  {
    label: "학습",
    href: "/edu",
  },
  {
    label: "포트폴리오",
    href: "/portfolio",
  },
] as const;

export default function HeaderNavigation() {
  const router = useRouter();
  const { data, refetch } = useGetMyInfo();

  const handlePortfolioClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (data?.isLoggedIn) {
      return;
    }

    event.preventDefault();

    const myInfo = data ?? (await refetch()).data;

    if (myInfo?.isLoggedIn) {
      router.push("/portfolio");
      return;
    }

    void showWarningToast(AUTH_REQUIRED_MESSAGE);
  };

  return (
    <nav aria-label="주요 메뉴" className="flex gap-0.5 md:gap-1">
      {NAVIGATION.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex h-9 items-center justify-center rounded-lg px-1 text-sm font-medium whitespace-nowrap text-(--cs-text-default) duration-200 hover:bg-(--cs-brand-50) hover:text-(--cs-brand-800) md:h-10 md:px-4 md:text-base lg:px-6 lg:text-lg"
          onClick={
            item.href === "/portfolio" ? handlePortfolioClick : undefined
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
