"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const AUTH_REQUIRED_MESSAGE = "로그인이 필요한 페이지입니다.";

export default function AuthRequiredRedirect() {
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    toast.warning(AUTH_REQUIRED_MESSAGE);
  }, []);

  return null;
}
