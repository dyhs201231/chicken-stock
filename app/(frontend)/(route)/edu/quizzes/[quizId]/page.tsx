import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";
import QuizContainer from "@/app/(frontend)/components/quizzes/quiz-container";

type QuizPageProps = {
  params: Promise<{
    quizId: string;
  }>;
};

export default async function QuizPage({ params }: QuizPageProps) {
  const { quizId } = await params;
  const parsedQuizId = Number(quizId);
  const currentArticleId = Number.isNaN(parsedQuizId) ? 1 : parsedQuizId;

  return (
    <main className="relative min-h-screen bg-white px-16 py-16 text-black">
      <Link
        aria-label="뒤로가기"
        className="absolute top-28 left-16 flex size-14 items-center justify-center text-zinc-500 transition hover:text-zinc-800"
        href="/edu"
      >
        <IconChevronLeft aria-hidden="true" size={64} stroke={2.5} />
      </Link>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <QuizContainer articleId={currentArticleId} />

        <div className="mt-8 flex w-full items-center justify-between px-14 text-2xl">
          <button
            type="button"
            className="text-black transition hover:text-zinc-600"
          >
            건너뛰기
          </button>

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
