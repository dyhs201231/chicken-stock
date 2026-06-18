"use client";

import { useGetMyInfo } from "@/app/(frontend)/apis/auth/queries";
import LoginButton from "./login-button";
import AvatarButton from "./avatar-button";

export default function HeaderAuthStatus() {
  const { data, isPending } = useGetMyInfo();

  if (isPending) {
    return <div className="h-[50px] w-[50px] rounded-full bg-(--cs-color-gray-200)/40" />;
  }

  if (!data?.isLoggedIn) {
    return <LoginButton />;
  }

  return <AvatarButton />;
}
