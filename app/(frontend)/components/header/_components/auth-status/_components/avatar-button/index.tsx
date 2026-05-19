"use client";

import { usePostLogout } from "@/app/(frontend)/apis/auth/mutations";
import { useGetMyInfo } from "@/app/(frontend)/apis/auth/queries";
import { Avatar, Popover } from "@/app/(frontend)/components/ui";
import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";

export default function AvatarButton() {
  const { data, isPending } = useGetMyInfo();
  const { mutate: logout, isPending: isLogoutPending } = usePostLogout();

  const handleLogout = () => {
    logout();
  };

  if (isPending || !data?.isLoggedIn) {
    return null;
  }

  return (
    <Popover className="flex items-center">
      <Popover.Trigger className="cursor-pointer">
        <Avatar
          type="header"
          src={data.user.profileImageUrl || "/test-image.png"}
          alt={data.user.name}
        />
      </Popover.Trigger>

      <Popover.Content align="right">
        <div className="flex min-w-[380px] flex-col px-9 py-7 whitespace-nowrap">
          <div className="flex items-center gap-3 border-b border-[#BABABA] py-2">
            <Avatar
              type="header"
              src={data.user.profileImageUrl || "/test-image.png"}
              alt={data.user.name}
            />

            <p className="text-xl">{data.user.name}</p>
          </div>

          <Link href="/my" className="flex items-center justify-between py-3">
            <p className="text-xl">마이페이지</p>

            <IconChevronRight stroke={2} />
          </Link>

          <button
            type="button"
            className="flex cursor-pointer items-center justify-between py-3 text-left disabled:cursor-not-allowed disabled:text-black/40"
            disabled={isLogoutPending}
            onClick={handleLogout}
          >
            <p className="text-xl">로그아웃</p>

            <IconChevronRight stroke={2} />
          </button>
        </div>
      </Popover.Content>
    </Popover>
  );
}
