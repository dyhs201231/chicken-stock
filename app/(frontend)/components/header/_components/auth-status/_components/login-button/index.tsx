"use client";

import { Button, Popover } from "../../../../../ui";

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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="45"
            height="45"
            viewBox="0 0 45 45"
            fill="none"
          >
            <path
              d="M40.8853 18.8278H39.375V18.75H22.5V26.25H33.0966C31.5506 30.6159 27.3966 33.75 22.5 33.75C16.2872 33.75 11.25 28.7128 11.25 22.5C11.25 16.2872 16.2872 11.25 22.5 11.25C25.3678 11.25 27.9769 12.3319 29.9634 14.0991L35.2669 8.79562C31.9181 5.67469 27.4387 3.75 22.5 3.75C12.1453 3.75 3.75 12.1453 3.75 22.5C3.75 32.8547 12.1453 41.25 22.5 41.25C32.8547 41.25 41.25 32.8547 41.25 22.5C41.25 21.2428 41.1206 20.0156 40.8853 18.8278Z"
              fill="#FFC107"
            />
            <path
              d="M5.91187 13.7728L12.0722 18.2906C13.7391 14.1637 17.7759 11.25 22.5 11.25C25.3678 11.25 27.9769 12.3319 29.9634 14.0991L35.2669 8.79562C31.9181 5.67469 27.4387 3.75 22.5 3.75C15.2981 3.75 9.05249 7.81594 5.91187 13.7728Z"
              fill="#FF3D00"
            />
            <path
              d="M22.5 41.2499C27.3432 41.2499 31.7438 39.3965 35.071 36.3824L29.2679 31.4718C27.3221 32.9515 24.9445 33.7518 22.5 33.7499C17.6232 33.7499 13.4822 30.6402 11.9222 26.3005L5.80786 31.0115C8.91099 37.0837 15.2129 41.2499 22.5 41.2499Z"
              fill="#4CAF50"
            />
            <path
              d="M40.8853 18.8278H39.375V18.75H22.5V26.25H33.0966C32.3571 28.3279 31.025 30.1436 29.265 31.4728L29.2678 31.4709L35.0709 36.3816C34.6603 36.7547 41.25 31.875 41.25 22.5C41.25 21.2428 41.1206 20.0156 40.8853 18.8278Z"
              fill="#1976D2"
            />
          </svg>

          <span className="text-xl">구글 계정으로 로그인</span>
        </Button>
      </Popover.Content>
    </Popover>
  );
}
