"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Toaster = dynamic(() => import("sonner").then((mod) => mod.Toaster), {
  ssr: false,
});

export default function ToastProvider() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const scheduleIdle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback.bind(window)
        : (callback: IdleRequestCallback) =>
            window.setTimeout(() => callback({} as IdleDeadline), 1500);
    const cancelIdle =
      typeof window.cancelIdleCallback === "function"
        ? window.cancelIdleCallback.bind(window)
        : window.clearTimeout.bind(window);
    const id = scheduleIdle(() => {
      setIsReady(true);
    });

    return () => {
      cancelIdle(id);
    };
  }, []);

  return isReady ? <Toaster /> : null;
}
