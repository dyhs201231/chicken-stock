import Image from "next/image";
import type { Metadata } from "next";
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

    if (block.type === "table") {
      return (
        totalLength +
        [...block.headers, ...block.rows.flat()].reduce(
          (tableTextLength, cell) =>
            tableTextLength + cell.replace(/\s/g, "").length,
          0,
        )
      );
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

function getHeadingClassName(level: number, isFirstBlock: boolean) {
  if (level === 1) {
    return "text-3xl leading-tight font-bold text-zinc-950 md:text-4xl";
  }

  if (level === 2) {
    return `${isFirstBlock ? "" : "pt-4 md:pt-6 "}text-2xl leading-tight font-bold text-zinc-950 md:text-3xl`;
  }

  return `${isFirstBlock ? "" : "pt-2 md:pt-3 "}text-xl leading-tight font-semibold text-zinc-950 md:text-2xl`;
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
    <main className="min-h-[calc(100dvh-74px)] bg-[#f8f8f9] px-4 pt-5 pb-6 text-zinc-950 md:px-8 md:pt-12 md:pb-12 lg:pb-16">
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

      <div className="mx-auto max-w-4xl">
        <article className="rounded-2xl bg-white p-4 md:p-8 lg:p-10">
          <h1 className="text-center text-3xl leading-tight font-bold tracking-normal md:text-5xl">
            {article.title}
          </h1>

          <div className="mt-2 text-center text-sm font-medium text-zinc-500 md:mt-4 md:text-lg">
            예상 읽기 시간 : {estimatedReadingMinutes}분
          </div>

          {article.imageUrl && (
            <div className="relative mx-auto mt-8 h-56 w-full max-w-md overflow-hidden rounded-xl bg-zinc-100 md:mt-14 md:h-72">
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                unoptimized
              />
            </div>
          )}

          {visibleContentBlocks.length > 0 && (
            <div
              id={ARTICLE_PROGRESS_TARGET_ID}
              className={`${article.imageUrl ? "mt-6 md:mt-10" : "mt-5 md:mt-8"} mx-auto max-w-4xl space-y-2 text-zinc-950 md:space-y-4`}
            >
              {visibleContentBlocks.map((block, index) => {
                if (block.type === "heading") {
                  const headingClassName = getHeadingClassName(
                    block.level,
                    index === 0,
                  );

                  const HeadingTag = `h${block.level}` as const;

                  return (
                    <HeadingTag
                      key={`${block.text}-${index}`}
                      className={headingClassName}
                    >
                      {block.text}
                    </HeadingTag>
                  );
                }

                if (block.type === "list") {
                  return (
                    <ul
                      key={`list-${index}`}
                      className="list-disc space-y-1.5 pl-5 text-base leading-7 md:space-y-2 md:pl-8 md:text-xl md:leading-9"
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
                      className="border-l-4 border-zinc-300 px-3 py-1.5 text-base leading-7 font-medium text-zinc-950 md:px-6 md:py-2 md:text-xl md:leading-9"
                    >
                      {block.text}
                    </blockquote>
                  );
                }

                if (block.type === "divider") {
                  return (
                    <hr key={`divider-${index}`} className="border-zinc-300" />
                  );
                }

                if (block.type === "table") {
                  return (
                    <div
                      key={`table-${index}`}
                      className="my-1 overflow-x-auto rounded-xl bg-zinc-50 md:my-2"
                    >
                      <table className="w-full min-w-112 border-collapse text-left text-sm leading-5 md:min-w-128 md:text-lg md:leading-7">
                        <thead className="bg-zinc-100 text-zinc-950">
                          <tr>
                            {block.headers.map((header, headerIndex) => (
                              <th
                                key={`${header}-${headerIndex}`}
                                scope="col"
                                className="px-3 py-2 font-semibold md:px-5 md:py-3"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {block.rows.map((row, rowIndex) => (
                            <tr
                              key={`row-${rowIndex}`}
                              className="border-t border-zinc-200"
                            >
                              {row.map((cell, cellIndex) => (
                                <td
                                  key={`${cell}-${cellIndex}`}
                                  className={`px-3 py-2 align-top md:px-5 md:py-3 ${
                                    cellIndex === 0
                                      ? "font-medium text-zinc-950"
                                      : "text-zinc-700"
                                  }`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                return (
                  <p
                    key={`${block.text}-${index}`}
                    className="text-base leading-7 md:text-xl md:leading-9"
                  >
                    {block.text}
                  </p>
                );
              })}
            </div>
          )}

          {visibleContentBlocks.length === 0 && (
            <p className="mt-5 rounded-lg bg-white px-4 py-4 text-center text-sm text-zinc-500 shadow-sm md:mt-8 md:px-5 md:py-6 md:text-base">
              아직 본문이 준비되지 않았어요.
            </p>
          )}

          <div className="mt-10 flex justify-center md:mt-16">
            <QuizStartButton
              href={quizHref}
              isCompleted={isQuizCompleted}
              isLoggedIn={Boolean(currentUserIdParam)}
            />
          </div>
        </article>
      </div>
    </main>
  );
}
