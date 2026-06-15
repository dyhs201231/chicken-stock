import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";
import { getEducationArticle } from "@/app/(frontend)/apis/edu/queries";
import type { QuizResponse } from "@/app/(frontend)/apis/edu/quizzes/api";
import { getCurrentUser } from "../../../../lib/auth-check";
import { getRequestOrigin } from "../../../../lib/server/request";
import { isPositiveIntegerString } from "../../../../utils/number";
import QuizContainer from "@/app/(frontend)/components/edu/quizzes/quiz-container";
import type { QuizContentData } from "@/app/(frontend)/components/edu/quizzes/quiz-content";

type QuizPageProps = {
  params: Promise<{
    quizId: string;
  }>;
  searchParams: Promise<{
    level?: string;
  }>;
};

async function getQuizArticleContext(quizId: string, level?: string) {
  const parsedArticleId = Number(quizId);
  let articleId = parsedArticleId;
  let levelParam: string | null = null;
  let article: Awaited<ReturnType<typeof getEducationArticle>> | null = null;

  if (Number.isNaN(parsedArticleId)) {
    articleId = 1;
  }

  if (typeof level === "string" && isPositiveIntegerString(level)) {
    levelParam = level;
  }

  if (isPositiveIntegerString(quizId) && levelParam) {
    article = await getEducationArticle(
      quizId,
      levelParam,
      await getRequestOrigin(),
    );
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

async function getInitialQuizzes(articleId: number) {
  if (articleId <= 0) {
    return [];
  }

  try {
    const url = new URL("/api/quizzes", await getRequestOrigin());
    url.searchParams.set("articleId", String(articleId));

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const result = (await response.json()) as QuizResponse;

    if (!result.ok) {
      return [];
    }

    return result.data.quizzes;
  } catch {
    return [];
  }
}

export default async function QuizPage({
  params,
  searchParams,
}: QuizPageProps) {
  const { quizId } = await params;
  const { level } = await searchParams;
  const currentUser = await getCurrentUser();
  const currentUserId = currentUser ? String(currentUser.id) : undefined;
  const { articleHref, articleId, label } = await getQuizArticleContext(
    quizId,
    level,
  );
  const initialQuizzes: QuizContentData[] = await getInitialQuizzes(articleId);

  return (
    <main className="relative min-h-screen bg-white px-16 py-16 text-black">
      <Link
        aria-label="뒤로가기"
        className="absolute top-20 left-6 flex size-16 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:outline-none md:top-24 md:left-20"
        href={articleHref}
      >
        <IconChevronLeft aria-hidden="true" className="size-16" stroke={1.8} />
      </Link>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-16">
        <p className="w-fit bg-amber-300 px-2 py-1 text-left text-xl font-bold text-zinc-950">
          Level {label.level} | {label.id}. {label.title}
        </p>

        <QuizContainer
          articleId={articleId}
          initialQuizzes={initialQuizzes}
          userId={currentUserId}
        />
      </div>
    </main>
  );
}
