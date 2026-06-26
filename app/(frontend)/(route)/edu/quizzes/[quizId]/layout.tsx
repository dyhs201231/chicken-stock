import type { ReactNode } from "react";
import type { Metadata } from "next";
import { createCanonicalUrl, createPageMetadata, SITE_NAME } from "../../seo";

type EduLayoutProps = {
  children: ReactNode;
  params: Promise<{
    quizId: string;
  }>;
};

export async function generateMetadata({
  params,
}: Omit<EduLayoutProps, "children">): Promise<Metadata> {
  const { quizId } = await params;
  const url = createCanonicalUrl(`/edu/quizzes/${quizId}`);

  return createPageMetadata({
    title: "주식 투자 퀴즈 | Chicken Stock",
    description:
      "Chicken Stock에서 주식 투자 개념을 이해했는지 퀴즈로 확인하고 단계별 학습을 이어가보세요.",
    url,
    robots: {
      index: false,
      follow: false,
    },
  });
}

export default async function EduLayout({ children, params }: EduLayoutProps) {
  const { quizId } = await params;
  const url = createCanonicalUrl(`/edu/quizzes/${quizId}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: "주식 투자 퀴즈 | Chicken Stock",
    description:
      "Chicken Stock에서 주식 투자 개념을 이해했는지 확인할 수 있는 퀴즈 페이지입니다.",
    url,
    learningResourceType: "Quiz",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
      {children}
    </>
  );
}
