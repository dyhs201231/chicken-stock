import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { IconChevronLeft } from "@tabler/icons-react";
import { getCachedEducationArticle } from "@/app/(backend)/lib/education";
import { getArticleQuizProgress } from "@/app/(backend)/lib/quizzes";
import { getCurrentUser } from "../../../../lib/auth-check";
import { parseArticleContent } from "../../../../utils/edu/article-content";
import { isPositiveIntegerString } from "../../../../utils/number";
import ArticleProgressTracker from "../../../../components/edu/article-progress-tracker";
import ArticleMessage from "../../../../components/edu/article-message";
import QuizStartButton from "./quiz-start-button";
import {
  createArticleDescription,
  createCanonicalUrl,
  createPageMetadata,
  getArticleSeoData,
  SITE_NAME,
} from "../../seo";

type ArticlePageProps = {
  params: Promise<{
    articlesId: string;
  }>;
  searchParams: Promise<{
    level?: string;
  }>;
};

const READING_CHARACTERS_PER_MINUTE = 400;
const ARTICLE_PROGRESS_TARGET_ID = "article-progress-content";

export async function generateMetadata({
  params,
  searchParams,
}: ArticlePageProps): Promise<Metadata> {
  const { articlesId } = await params;
  const { level } = await searchParams;
  const seoData = await getArticleSeoData(articlesId, level);

  if (!seoData) {
    return createPageMetadata({
      title: "학습 글 | 주식 투자 학습 | Chicken Stock",
      description: "Chicken Stock에서 주식 투자 학습 콘텐츠를 확인해보세요.",
      url: createCanonicalUrl(`/edu/articles/${articlesId}`),
      ogType: "article",
    });
  }

  const title = `${seoData.article.title} - Level ${seoData.level} 주식 투자 학습 | Chicken Stock`;
  const description = createArticleDescription(
    seoData.article.title,
    seoData.article.content,
  );
  const url = createCanonicalUrl(
    `/edu/articles/${seoData.article.id}`,
    new URLSearchParams({ level: seoData.level }),
  );

  return createPageMetadata({
    title,
    description,
    url,
    ogType: "article",
  });
}

function getVisibleContentBlocks(
  contentBlocks: ReturnType<typeof parseArticleContent>,
) {
  if (contentBlocks[0]?.type === "heading" && contentBlocks[0].level === 1) {
    return contentBlocks.slice(1);
  }

  return contentBlocks;
}

function getContentTextLength(
  contentBlocks: ReturnType<typeof parseArticleContent>,
) {
  return contentBlocks.reduce((totalLength, block) => {
    if (block.type === "list") {
      return (
        totalLength +
        block.items.reduce(
          (listTextLength, item) =>
            listTextLength + item.replace(/\s/g, "").length,
          0,
        )
      );
    }

    if (block.type === "divider") {
      return totalLength;
    }

    return totalLength + block.text.replace(/\s/g, "").length;
  }, 0);
}

function calculateEstimatedReadingMinutes(
  contentBlocks: ReturnType<typeof parseArticleContent>,
) {
  const contentTextLength = getContentTextLength(contentBlocks);

  return Math.max(
    1,
    Math.round(contentTextLength / READING_CHARACTERS_PER_MINUTE),
  );
}

function getHeadingClassName(level: number) {
  if (level === 1) {
    return "text-3xl leading-tight font-bold tracking-[-0.025em] text-(--cs-text-strong)";
  }

  if (level === 2) {
    return "pt-5 text-2xl leading-tight font-bold tracking-[-0.02em] text-(--cs-text-strong) md:text-3xl";
  }

  return "pt-2 text-xl leading-tight font-semibold text-(--cs-text-strong) md:text-2xl";
}

export default async function ArticlePage({
  params,
  searchParams,
}: ArticlePageProps) {
  const { articlesId } = await params;
  const { level } = await searchParams;
  const currentUser = await getCurrentUser();
  const currentUserIdParam = currentUser ? String(currentUser.id) : null;

  if (!isPositiveIntegerString(articlesId) || !isPositiveIntegerString(level)) {
    return (
      <ArticleMessage
        title="학습 글을 찾을 수 없어요"
        message="선택한 학습 단계나 글 정보가 올바르지 않아요."
      />
    );
  }

  const articleLevel = level ?? "";
  const article = await getCachedEducationArticle(
    Number(articlesId),
    Number(articleLevel),
  );

  if (!article) {
    return (
      <ArticleMessage
        title="학습 글을 불러오지 못했어요"
        message="선택한 학습 글이 없거나 일시적으로 조회할 수 없어요."
      />
    );
  }

  const contentBlocks = parseArticleContent(article.content);
  const visibleContentBlocks = getVisibleContentBlocks(contentBlocks);
  const estimatedReadingMinutes =
    calculateEstimatedReadingMinutes(visibleContentBlocks);
  let quizProgress: Awaited<ReturnType<typeof getArticleQuizProgress>> | null =
    null;

  if (currentUser) {
    quizProgress = await getArticleQuizProgress(
      Number(articlesId),
      currentUser.id,
    );
  }

  const isQuizCompleted = quizProgress?.isCorrect === true;
  const quizHref = `/edu/quizzes/${articlesId}?level=${articleLevel}`;
  const articleListLinkQuery = {
    openLevel: String(article.educationSummary.stage),
  };

  const seoTitle = `${article.title} - Level ${articleLevel} 주식 투자 학습 | Chicken Stock`;
  const seoDescription = createArticleDescription(
    article.title,
    article.content,
  );
  const canonicalUrl = createCanonicalUrl(
    `/edu/articles/${article.id}`,
    new URLSearchParams({ level: articleLevel }),
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    name: seoTitle,
    description: seoDescription,
    url: canonicalUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    educationalLevel: `Level ${articleLevel}`,
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

      <ArticleProgressTracker
        articleId={articlesId}
        targetId={ARTICLE_PROGRESS_TARGET_ID}
        userId={currentUserIdParam}
      />

      <div className="cs-page-shell">
        <Link
          href={{
            pathname: "/edu",
            query: articleListLinkQuery,
          }}
          aria-label="학습 목록으로 돌아가기"
          className="mb-5 inline-flex min-h-10 items-center gap-1 rounded-lg border border-(--cs-border-strong) bg-(--cs-surface-raised) pr-4 pl-2 text-sm font-semibold text-(--cs-brand-800) shadow-(--cs-shadow-sm) transition hover:bg-(--cs-brand-50)"
        >
          <IconChevronLeft aria-hidden="true" className="size-5" stroke={2} />
          학습 목록
        </Link>

        <article className="mx-auto max-w-5xl">
          <header className="cs-surface-card overflow-hidden p-6 md:p-10">
            <p className="cs-section-label mb-3">
              Level {articleLevel} · Article {article.id}
            </p>
            <h1 className="max-w-3xl text-4xl leading-tight font-bold tracking-[-0.04em] md:text-5xl">
              {article.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-(--cs-text-muted)">
              <span className="rounded-full bg-(--cs-brand-100) px-3 py-1.5 text-(--cs-brand-800)">
                예상 읽기 {estimatedReadingMinutes}분
              </span>
              <span>천천히 읽고 핵심 개념을 익혀보세요.</span>
            </div>

            {article.imageUrl && (
              <div className="relative mt-8 h-64 w-full overflow-hidden rounded-xl bg-(--cs-surface-tint) md:h-96">
                <Image
                  src={article.imageUrl}
                  alt={article.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 960px"
                  unoptimized
                />
              </div>
            )}
          </header>

          {visibleContentBlocks.length > 0 && (
            <div
              id={ARTICLE_PROGRESS_TARGET_ID}
              className="cs-surface-card mx-auto mt-6 max-w-5xl space-y-7 px-6 py-9 text-(--cs-text-default) md:px-14 md:py-12"
            >
              {visibleContentBlocks.map((block, index) => {
                if (block.type === "heading") {
                  const headingLevel = Math.max(2, block.level);
                  const headingClassName = getHeadingClassName(headingLevel);

                  if (headingLevel === 2) {
                    return (
                      <h2
                        key={`${block.text}-${index}`}
                        className={headingClassName}
                      >
                        {block.text}
                      </h2>
                    );
                  }

                  return (
                    <h3
                      key={`${block.text}-${index}`}
                      className={headingClassName}
                    >
                      {block.text}
                    </h3>
                  );
                }

                if (block.type === "list") {
                  return (
                    <ul
                      key={`list-${index}`}
                      className="list-disc space-y-2 pl-6 text-lg leading-8 marker:text-(--cs-brand-600) md:text-xl md:leading-9"
                    >
                      {block.items.map((item, itemIndex) => (
                        <li key={`${item}-${itemIndex}`}>{item}</li>
                      ))}
                    </ul>
                  );
                }

                if (block.type === "quote") {
                  return (
                    <blockquote
                      key={`${block.text}-${index}`}
                      className="rounded-r-xl border-l-4 border-(--cs-brand-500) bg-(--cs-brand-50) px-5 py-4 text-lg leading-8 font-medium text-(--cs-text-strong) md:text-xl md:leading-9"
                    >
                      {block.text}
                    </blockquote>
                  );
                }

                if (block.type === "divider") {
                  return (
                    <hr
                      key={`divider-${index}`}
                      className="border-(--cs-border-subtle)"
                    />
                  );
                }

                return (
                  <p
                    key={`${block.text}-${index}`}
                    className="text-lg leading-8 md:text-xl md:leading-9"
                  >
                    {block.text}
                  </p>
                );
              })}
            </div>
          )}

          {visibleContentBlocks.length === 0 && (
            <p className="mt-6 rounded-xl border border-(--cs-border-subtle) bg-(--cs-surface-raised) px-5 py-10 text-center text-base text-(--cs-text-muted) shadow-(--cs-shadow-sm)">
              아직 본문이 준비되지 않았어요.
            </p>
          )}

          <footer className="mt-6 flex flex-col items-center rounded-2xl border border-(--cs-brand-300) bg-(--cs-surface-tint) px-6 py-8 text-center">
            <p className="cs-section-label">Knowledge check</p>
            <h2 className="mt-2 text-2xl font-bold text-(--cs-text-strong)">
              읽은 내용을 퀴즈로 확인해보세요.
            </h2>
            <div className="mt-5">
              <QuizStartButton
                href={quizHref}
                isCompleted={isQuizCompleted}
                isLoggedIn={Boolean(currentUserIdParam)}
              />
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}
