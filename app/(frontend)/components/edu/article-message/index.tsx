import Link from "next/link";

type ArticleMessageProps = {
  title: string;
  message: string;
};

export default function ArticleMessage({
  title,
  message,
}: ArticleMessageProps) {
  return (
    <main className="min-h-[calc(100dvh-74px)] bg-(--cs-surface-base) px-5 py-12">
      <section className="cs-surface-card mx-auto flex min-h-[420px] max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="cs-section-label">Learning</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-(--cs-text-strong)">
          {title}
        </h1>

        <p className="mt-4 text-base leading-7 text-(--cs-text-muted)">
          {message}
        </p>

        <Link
          href="/edu"
          className="mt-8 rounded-full bg-(--cs-brand-700) px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-(--cs-brand-800)"
        >
          학습 목록으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
