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
    <main className="min-h-[calc(100dvh-74px)] bg-[#f8f8f9] px-4 py-5 md:px-8 md:py-12">
      <section className="mx-auto flex min-h-[calc(100dvh-138px)] max-w-3xl flex-col items-center justify-center rounded-2xl bg-white p-4 text-center md:min-h-[calc(100dvh-170px)] md:p-8">
        <h1 className="text-2xl font-bold tracking-normal text-zinc-950 md:text-3xl">
          {title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-600 md:mt-4 md:text-base md:leading-7">
          {message}
        </p>

        <Link
          href="/edu"
          className="mt-6 rounded-full bg-[#72327d] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5f286b] focus-visible:ring-2 focus-visible:ring-[#72327d] focus-visible:ring-offset-2 focus-visible:outline-none md:mt-8 md:px-6 md:py-3 md:text-base"
        >
          학습 목록으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
