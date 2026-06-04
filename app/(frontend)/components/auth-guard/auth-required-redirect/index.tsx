"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const AUTH_REQUIRED_MESSAGE = "로그인이 필요한 페이지입니다.";

export default function AuthRequiredRedirect() {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    window.alert(AUTH_REQUIRED_MESSAGE);
    router.replace("/");
  }, [router]);

  return null;
}
