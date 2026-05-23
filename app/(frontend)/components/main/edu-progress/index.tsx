import Image from "next/image";

// TODO: 추후 실제 데이터로 변경 예정
const DUMMY_USER_LEVEL = 1;
const DUMMY_PROGRESS_RATE = 55;

function getCharacterImages(level: number) {
  if (level === 1) {
    return {
      nest: "/images/main/nest.svg",
      egg: "/images/main/egg.svg",
    };
  }

  return {
    nest: "/images/main/nest.svg",
    egg: "/images/main/egg.svg",
  };
}

export default function EduProgress() {
  const characterImages = getCharacterImages(DUMMY_USER_LEVEL);

  return (
    <section className="w-full">
      <h2 className="mb-5 text-2xl font-semibold tracking-normal text-zinc-950">
        학습 현황
      </h2>

      <div className="relative aspect-[2.5] overflow-hidden rounded-2xl">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-no-repeat brightness-95 saturate-115"
          style={{
            backgroundImage: "url('/images/main/edu-progress.png')",
            backgroundPosition: "center 35%",
            backgroundSize: "100% 200%",
          }}
        />

        <div className="absolute inset-x-0 bottom-8 flex justify-center md:bottom-12">
          <div className="relative h-44 w-56 md:h-60 md:w-72">
            <Image
              src={characterImages.nest}
              alt=""
              width={172}
              height={110}
              className="absolute bottom-0 left-1/2 w-44 -translate-x-1/2 md:w-56"
              unoptimized
            />

            <Image
              src={characterImages.egg}
              alt={`Level ${DUMMY_USER_LEVEL} 학습 캐릭터`}
              width={119}
              height={145}
              className="absolute bottom-12 left-1/2 w-28 -translate-x-1/2 md:bottom-16 md:w-40"
              unoptimized
            />
          </div>
        </div>

        <div className="absolute top-[13%] left-[60%] h-28 w-36 md:h-32 md:w-44">
          <Image
            src="/images/main/speech_bubble.png"
            alt=""
            fill
            sizes="176px"
            className="object-contain"
            unoptimized
          />

          <p className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-base font-semibold whitespace-nowrap text-zinc-950 md:text-base">
            진행중 {DUMMY_PROGRESS_RATE}%
          </p>
        </div>
      </div>
    </section>
  );
}
