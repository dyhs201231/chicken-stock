import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";
import { getEducationArticle } from "@/app/(frontend)/apis/edu/queries";
import QuizContainer from "@/app/(frontend)/components/quizzes/quiz-container";
import { getRequestOrigin } from "../../../../lib/server/request";
import { isPositiveIntegerString } from "../../../../utils/number";

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
  const articleId = Number.isNaN(parsedArticleId) ? 1 : parsedArticleId;
  const levelParam =
    typeof level === "string" && isPositiveIntegerString(level) ? level : null;
  const article =
    isPositiveIntegerString(quizId) && levelParam
      ? await getEducationArticle(quizId, levelParam, await getRequestOrigin())
      : null;

  return {
    articleHref: levelParam
      ? {
          pathname: `/edu/articles/${articleId}`,
          query: { level: levelParam },
        }
      : `/edu/articles/${articleId}`,
    articleId,
    label: {
      level: article?.educationSummary.stage ?? levelParam ?? "-",
      order: article?.sortOrder ?? articleId,
      title: article?.title ?? "학습 주제",
    },
  };
}

export default async function QuizPage({
  params,
  searchParams,
}: QuizPageProps) {
  const { quizId } = await params;
  const { level } = await searchParams;
  const { articleHref, articleId, label } = await getQuizArticleContext(
    quizId,
    level,
  );

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
          Level {label.level} | {label.order}. {label.title}
        </p>

        <QuizContainer articleId={articleId} />

        <div className="mt-8 flex w-full items-center justify-end px-14 text-2xl">
          <button
            type="button"
            className="text-zinc-500 transition hover:text-black"
          >
            확인
          </button>
        </div>
      </div>
    </main>
  );
}
