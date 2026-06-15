import Image from "next/image";

export default function EduPageFallback() {
  return (
    <main className="relative min-h-[calc(100dvh-74px)] overflow-hidden px-5">
      <Image
        src="/images/edu/edu-background.webp"
        alt=""
        aria-hidden="true"
        fill
        className="object-cover object-center"
        priority
        sizes="100vw"
      />

      <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-74px)] w-full max-w-7xl flex-col items-center gap-8 pt-16 pb-12 md:block md:min-h-237.5 md:pt-32">
        <p className="mt-3 rounded-lg bg-white/90 px-5 py-4 text-center text-base font-medium text-zinc-700 shadow-sm">
          학습 데이터를 불러오고 있어요.
        </p>
      </section>
    </main>
  );
}
