import type { Metadata } from "next";
import type { MyInfoResponse } from "../../apis/auth/api";
import type { PortfolioResponse } from "../../apis/portfolio/api";
import PortfolioContent from "../../components/portfolio/portfolio-content";
import {
  getRequestCookieHeader,
  getRequestOrigin,
} from "../../lib/server/request";
import { createCanonicalUrl, createPageMetadata } from "../edu/seo";

const title = "가상 투자 포트폴리오 | Chicken Stock";
const description =
  "Chicken Stock에서 보유 종목, 수익률, 평가금액 등 가상 투자 포트폴리오 현황을 확인해보세요.";
const url = createCanonicalUrl("/portfolio");

export const metadata: Metadata = createPageMetadata({
  title,
  description,
  url,
  robots: {
    index: false,
    follow: false,
  },
});

async function getInitialJson<T>(path: string): Promise<T | null> {
  try {
    const cookieHeader = await getRequestCookieHeader();
    const response = await fetch(new URL(path, await getRequestOrigin()), {
      cache: "no-store",
      headers: cookieHeader
        ? {
            Cookie: cookieHeader,
          }
        : undefined,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default async function PortfolioPage() {
  const [initialMyInfo, initialPortfolio] = await Promise.all([
    getInitialJson<MyInfoResponse>("/api/auth/my-info"),
    getInitialJson<PortfolioResponse>("/api/portfolio"),
  ]);

  return (
    <PortfolioContent
      initialMyInfo={initialMyInfo ?? { isLoggedIn: false, user: null }}
      initialPortfolio={initialPortfolio}
    />
  );
}
