"use client";

import GoogleLogo from "../../../icons/google-logo";
import { Button, Popover } from "../../../ui";

export default function LoginButton() {
  const handleGoogleLogin = () => {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const loginUrl = new URL("/api/auth/google", window.location.origin);

    loginUrl.searchParams.set("returnTo", returnTo);
    window.location.assign(loginUrl.toString());
  };

  return (
    <Popover className="flex items-center">
      <Popover.Trigger className="flex h-[50px] w-[130px] cursor-pointer items-center justify-center text-xl duration-200 hover:font-semibold">
        로그인
      </Popover.Trigger>

      <Popover.Content align="right">
        <Button
          variant="custom"
          className="flex h-[68px] w-[380px] items-center justify-center gap-4 whitespace-nowrap"
          onClick={handleGoogleLogin}
        >
          <GoogleLogo />
          <span className="text-xl">구글 계정으로 로그인</span>
        </Button>
      </Popover.Content>
    </Popover>
  );
}
