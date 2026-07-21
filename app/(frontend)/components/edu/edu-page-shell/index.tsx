import type { ReactNode } from "react";
import Image from "next/image";

type EduPageShellProps = {
  children: ReactNode;
};

export default function EduPageShell({ children }: EduPageShellProps) {
  return (
    <main className="relative min-h-[calc(100dvh-74px)] overflow-hidden bg-(--cs-surface-base) py-10 text-(--cs-text-strong) md:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[680px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_62%,transparent_100%)]"
      >
        <Image
          src="/images/edu/edu-background.webp"
          alt=""
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-[-8rem] size-80 rounded-full border-[42px] border-white/20 md:size-112"
      />

      <section className="cs-page-shell relative z-10">
        <div className="max-w-3xl">
          <p className="cs-section-label">Learning journey</p>
          <h1 className="mt-3 text-4xl leading-tight font-bold tracking-[-0.04em] md:text-6xl">
            투자 공부를
            <br className="hidden sm:block" /> 단계별로 시작해보세요
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-(--cs-text-muted) md:text-xl">
            기초 개념부터 차근차근 익히고, 퀴즈로 이해도를 확인해보세요.
          </p>
        </div>

        <div className="mt-10 w-full md:mt-14">{children}</div>
      </section>
    </main>
  );
}
