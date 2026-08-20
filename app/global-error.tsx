"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="flex min-h-screen items-center justify-center bg-white px-6 text-(--cs-text-default)">
        <main className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-bold">페이지를 표시할 수 없습니다</h1>
          <p className="text-sm text-gray-600">
            오류를 확인하고 있습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <button
            className="rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white"
            onClick={reset}
            type="button"
          >
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
