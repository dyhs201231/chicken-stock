import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";
import { getCachedEducationArticle } from "@/app/(backend)/lib/education";
import { getArticleQuizzes } from "@/app/(backend)/lib/quizzes";
import AuthRequiredRedirect from "@/app/(frontend)/components/auth-guard/auth-required-redirect";
import { getCurrentUser } from "../../../../lib/auth-check";
import { isPositiveIntegerString } from "../../../../utils/number";
import QuizContainer from "@/app/(frontend)/components/edu/quizzes/quiz-container";
import type { QuizContentData } from "@/app/(frontend)/components/edu/quizzes/quiz-content";
import { createCanonicalUrl, SITE_NAME } from "../../seo";

type QuizPageProps = {
  params: Promise<{
    quizId: string;
  }>;
  searchParams: Promise<{
    level?: string;
  }>;
};

type QuizArticleContextData = {
  id: number;
  title: string;
  educationSummary: {
    stage: number;
  };
};

async function getQuizArticleContext(quizId: string, level?: string) {
  const parsedArticleId = Number(quizId);
  let articleId = parsedArticleId;
  let levelParam: string | null = null;
  let article: QuizArticleContextData | null = null;

  if (Number.isNaN(parsedArticleId)) {
    articleId = 1;
  }

  if (typeof level === "string" && isPositiveIntegerString(level)) {
    levelParam = level;
  }

  if (isPositiveIntegerString(quizId) && levelParam) {
    article = await getCachedEducationArticle(articleId, Number(levelParam));
  }

  let articleHref: { pathname: string; query: { level: string } } | string =
    `/edu/articles/${articleId}`;

  if (levelParam) {
    articleHref = {
      pathname: `/edu/articles/${articleId}`,
      query: { level: levelParam },
    };
  }

  return {
    articleHref,
    articleId,
    label: {
      level: article?.educationSummary.stage ?? levelParam ?? "-",
      id: article?.id,
      title: article?.title ?? "학습 주제",
    },
  };
}

function getQuizSeoTitle(articleTitle: string, level?: string | null) {
  return level
    ? `${articleTitle} 퀴즈 - Level ${level} | Chicken Stock`
    : `${articleTitle} 퀴즈 | 주식 투자 퀴즈 | Chicken Stock`;
}

function getQuizSeoDescription(articleTitle: string) {
  return `${articleTitle} 개념을 이해했는지 퀴즈로 확인하고, Chicken Stock에서 주식 투자 지식을 단계별로 학습해보세요.`;
}

export default async function QuizPage({
  params,
  searchParams,
}: QuizPageProps) {
  const { quizId } = await params;
  const { level } = await searchParams;
  const [currentUser, articleContext] = await Promise.all([
    getCurrentUser(),
    getQuizArticleContext(quizId, level),
  ]);

  if (!currentUser) {
    return <AuthRequiredRedirect />;
  }

  const currentUserId = String(currentUser.id);
  const { articleHref, articleId, label } = articleContext;
  const initialQuizzes: QuizContentData[] = await getArticleQuizzes(
    articleId,
    currentUser.id,
  );
  const quizTitle = getQuizSeoTitle(label.title, level);
  const quizDescription = getQuizSeoDescription(label.title);
  const canonicalUrl = createCanonicalUrl(`/edu/quizzes/${articleId}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: quizTitle,
    description: quizDescription,
    url: canonicalUrl,
    learningResourceType: "Quiz",
    educationalLevel: level ? `Level ${level}` : undefined,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };

  return (
    <main className="relative min-h-[calc(100dvh-74px)] bg-(--cs-surface-base) py-8 text-(--cs-text-strong) md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <div className="cs-page-shell">
        <Link
          aria-label="아티클로 돌아가기"
          className="mb-5 inline-flex min-h-10 items-center gap-1 rounded-lg border border-(--cs-border-strong) bg-(--cs-surface-raised) pr-4 pl-2 text-sm font-semibold text-(--cs-brand-800) shadow-(--cs-shadow-sm) transition hover:bg-(--cs-brand-50)"
          href={articleHref}
        >
          <IconChevronLeft aria-hidden="true" className="size-5" stroke={2} />
          아티클로 돌아가기
        </Link>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <header className="rounded-2xl border border-(--cs-brand-300) bg-(--cs-surface-tint) px-6 py-7 md:px-9">
            <p className="cs-section-label">
              Level {label.level} · Knowledge check
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-(--cs-text-strong) md:text-4xl">
              {label.title}
            </h1>
            <p className="mt-2 text-base text-(--cs-text-muted)">
              배운 내용을 떠올리며 한 문제씩 차분히 풀어보세요.
            </p>
          </header>

          <QuizContainer
            articleId={articleId}
            initialQuizzes={initialQuizzes}
            userId={currentUserId}
          />
        </div>
      </div>
    </main>
  );
}
