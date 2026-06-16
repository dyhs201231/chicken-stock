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
    <div className="flex gap-2">
      {NAVIGATION.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex h-12.5 w-32.5 items-center justify-center text-xl duration-200 hover:font-semibold"
          onClick={
            item.href === "/portfolio" ? handlePortfolioClick : undefined
          }
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
