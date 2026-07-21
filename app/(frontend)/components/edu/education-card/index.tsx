"use client";

import { useId, useState } from "react";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { twMerge } from "tailwind-merge";
import { IconInfoCircle } from "@tabler/icons-react";
import ArticleProgressIcon from "../article-progress-icon";
import Modal from "../../ui/modal";

export type EducationListItem = {
  id?: string;
  level?: string;
  title: string;
  description?: string;
  progressRate?: number;
  isCompleted?: boolean;
};

export type EducationCardData = {
  summary: string[];
  list: EducationListItem[];
};

export type EducationCardProps = {
  level: string;
  title: string;
  image: string | StaticImageData;
  data: EducationCardData;
  className?: string;
  autoOpenList?: boolean;
  priority?: boolean;
};

type OpenPanel = "summary" | "list" | "closed" | null;

function getListItemKey(item: EducationListItem, index: number) {
  return item.id ?? `${item.title}-${index}`;
}

function getVisiblePanel(openPanel: OpenPanel, autoOpenList: boolean) {
  if (openPanel === null && autoOpenList) {
    return "list";
  }

  return openPanel;
}

export default function EducationCard({
  level,
  title,
  image,
  data,
  className,
  autoOpenList = false,
  priority = false,
}: EducationCardProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const modalTitleId = useId();
  const modalDescriptionId = useId();
  const hasSummary = data.summary.some((item) => item.trim().length > 0);
  const hasList = data.list.length > 0;
  const visiblePanel = getVisiblePanel(openPanel, autoOpenList);
  const isSummaryPanelVisible = visiblePanel === "summary";
  const isListPanelVisible = visiblePanel === "list";

  const handleModalOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setOpenPanel(visiblePanel);
      return;
    }

    setOpenPanel("closed");
  };

  return (
    <>
      <article
        className={twMerge(
          "cs-surface-card group relative z-0 flex min-h-[420px] w-full max-w-none flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1",
          className,
        )}
      >
        <div className="relative h-56 overflow-hidden bg-(--cs-brand-50)">
          <Image
            src={image}
            alt=""
            aria-hidden="true"
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
            priority={priority}
            sizes="(max-width: 1024px) 100vw, 420px"
          />
          <span className="absolute top-4 left-4 rounded-full border border-(--cs-brand-200) bg-(--cs-surface-raised)/90 px-3 py-1 text-xs font-bold tracking-[0.08em] text-(--cs-brand-800) uppercase backdrop-blur-sm">
            Level {level}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-(--cs-text-muted)">
                {data.list.length}개 학습 콘텐츠
              </p>
              <h2 className="mt-1 text-2xl leading-tight font-bold tracking-[-0.025em] text-(--cs-text-strong)">
                {title}
              </h2>
            </div>

            <button
              type="button"
              aria-label={`${title} 요약 보기`}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-(--cs-brand-50) text-(--cs-brand-700) transition-colors hover:bg-(--cs-brand-100) focus-visible:ring-2 focus-visible:ring-(--cs-brand-500) focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={() => setOpenPanel("summary")}
            >
              <IconInfoCircle
                aria-hidden="true"
                className="size-6"
                stroke={1.8}
              />
            </button>
          </div>

          <button
            type="button"
            className="mt-auto inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg bg-(--cs-brand-700) px-5 text-base font-semibold text-white shadow-(--cs-shadow-sm) transition-colors hover:bg-(--cs-brand-800)"
            onClick={() => setOpenPanel("list")}
          >
            학습 시작
          </button>
        </div>
      </article>

      <Modal.Root
        isOpen={isSummaryPanelVisible || isListPanelVisible}
        setIsOpen={handleModalOpenChange}
      >
        <Modal.Overlay>
          <Modal.Content
            aria-describedby={modalDescriptionId}
            aria-labelledby={modalTitleId}
            closeButtonLabel="학습 안내 닫기"
            className="w-[min(100%,600px)] rounded-2xl p-6 pr-14 md:p-8 md:pr-16"
          >
            {isSummaryPanelVisible && (
              <section>
                <p className="cs-section-label">Level {level}</p>
                <h3
                  id={modalTitleId}
                  className="mt-2 text-2xl font-bold tracking-[-0.025em]"
                >
                  이런 내용을 배워요
                </h3>
                <p
                  id={modalDescriptionId}
                  className="mt-2 text-sm text-(--cs-text-muted)"
                >
                  학습을 시작하기 전에 핵심 내용을 미리 확인해보세요.
                </p>

                {hasSummary && (
                  <ul className="mt-6 space-y-3 text-base leading-7 text-(--cs-text-default)">
                    {data.summary.map((item, index) => (
                      <li
                        key={`${item}-${index}`}
                        className="flex gap-3 rounded-xl bg-(--cs-surface-tint) px-4 py-3"
                      >
                        <span className="font-bold text-(--cs-brand-700)">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {!hasSummary && (
                  <p className="mt-5 rounded-lg bg-(--cs-surface-tint) px-4 py-5 text-center text-sm text-(--cs-text-muted)">
                    아직 요약이 준비되지 않았어요.
                  </p>
                )}
              </section>
            )}

            {isListPanelVisible && (
              <section>
                <p className="cs-section-label">Learning path</p>
                <h3
                  id={modalTitleId}
                  className="mt-2 text-2xl font-bold tracking-[-0.025em]"
                >
                  Level {level} 목록
                </h3>
                <p
                  id={modalDescriptionId}
                  className="mt-2 text-sm text-(--cs-text-muted)"
                >
                  순서대로 읽으며 투자 개념을 차근차근 익혀보세요.
                </p>

                {hasList && (
                  <ol className="mt-6 grid gap-2">
                    {data.list.map((item, index) => (
                      <li
                        key={getListItemKey(item, index)}
                        className="overflow-hidden rounded-xl border border-(--cs-border-subtle) bg-(--cs-surface-base) transition-colors hover:border-(--cs-brand-300) hover:bg-(--cs-brand-50)"
                      >
                        {item.id ? (
                          <Link
                            href={{
                              pathname: `/edu/articles/${item.id}`,
                              query: { level: item.level ?? level },
                            }}
                            className="flex min-h-14 w-full items-center gap-3 px-4 py-3"
                          >
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--cs-brand-100) text-sm font-bold text-(--cs-brand-800)">
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1 text-base leading-6 font-semibold text-(--cs-text-strong)">
                              <span className="line-clamp-2">{item.title}</span>
                            </span>
                            <ArticleProgressIcon
                              progressRate={item.progressRate}
                              isCompleted={item.isCompleted}
                            />
                          </Link>
                        ) : (
                          <div className="flex min-h-14 items-center gap-3 px-4 py-3">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--cs-brand-100) text-sm font-bold text-(--cs-brand-800)">
                              {index + 1}
                            </span>
                            <span className="text-base leading-6 font-semibold text-(--cs-text-strong)">
                              {item.title}
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}

                {!hasList && (
                  <p className="mt-5 rounded-lg bg-(--cs-surface-tint) px-4 py-5 text-center text-sm text-(--cs-text-muted)">
                    아직 학습 목록이 준비되지 않았어요.
                  </p>
                )}
              </section>
            )}
          </Modal.Content>
        </Modal.Overlay>
      </Modal.Root>
    </>
  );
}
