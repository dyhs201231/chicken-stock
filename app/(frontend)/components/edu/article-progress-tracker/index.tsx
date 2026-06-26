"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { EducationProgressArticle } from "../../../apis/edu/api";
import { educationQueryKeys } from "../../../apis/edu/queries";

type ArticleProgressTrackerProps = {
  articleId: string;
  targetId: string;
  userId?: string | null;
};

function calculateArticleProgressRate(targetId: string) {
  const targetElement = document.getElementById(targetId);

  if (!targetElement) {
    return 0;
  }

  const targetRect = targetElement.getBoundingClientRect();
  const targetTop = targetRect.top + window.scrollY;
  const targetHeight = targetElement.scrollHeight;

  if (targetHeight <= 0) {
    return 0;
  }

  const viewportBottom = window.scrollY + window.innerHeight;
  const readDistance = viewportBottom - targetTop;
  const progressRate = (readDistance / targetHeight) * 100;

  return Math.min(100, Math.max(0, Math.floor(progressRate)));
}

function updateEducationArticleProgress(
  progress: EducationProgressArticle[] | undefined,
  articleId: string,
  progressRate: number,
) {
  const targetArticleId = Number(articleId);

  if (!Number.isInteger(targetArticleId)) {
    return progress;
  }

  const currentProgress = progress ?? [];
  const existingProgress = currentProgress.find(
    (articleProgress) => articleProgress.articleId === targetArticleId,
  );
  const nextProgressRate = Math.max(
    existingProgress?.progressRate ?? 0,
    progressRate,
  );
  const nextArticleProgress = {
    articleId: targetArticleId,
    progressRate: nextProgressRate,
    isCompleted: existingProgress?.isCompleted || nextProgressRate >= 90,
  };

  if (!existingProgress) {
    return [...currentProgress, nextArticleProgress];
  }

  return currentProgress.map((articleProgress) =>
    articleProgress.articleId === targetArticleId
      ? nextArticleProgress
      : articleProgress,
  );
}

export default function ArticleProgressTracker({
  articleId,
  targetId,
  userId,
}: ArticleProgressTrackerProps) {
  const queryClient = useQueryClient();
  const savedProgressRateRef = useRef(0);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const saveProgress = (progressRate: number) => {
      const nextProgressRate = Math.max(
        progressRate,
        savedProgressRateRef.current,
      );
      const progressQueryKey = educationQueryKeys.progress(userId);

      savedProgressRateRef.current = nextProgressRate;
      queryClient.setQueryData<EducationProgressArticle[]>(
        progressQueryKey,
        (progress) =>
          updateEducationArticleProgress(
            progress,
            articleId,
            nextProgressRate,
          ),
      );

      void fetch("/api/edu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          articleId,
          progressRate: nextProgressRate,
        }),
        keepalive: true,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("ARTICLE_PROGRESS_SAVE_FAILED");
          }

          void queryClient.invalidateQueries({ queryKey: progressQueryKey });
        })
        .catch(() => {
          savedProgressRateRef.current = Math.min(
            savedProgressRateRef.current,
            nextProgressRate,
          );
          void queryClient.invalidateQueries({ queryKey: progressQueryKey });
        });
    };

    const scheduleProgressSave = () => {
      const progressRate = calculateArticleProgressRate(targetId);
      const savedProgressRate = savedProgressRateRef.current;
      const shouldSaveProgress =
        progressRate >= 90 || progressRate >= savedProgressRate + 5;

      if (!shouldSaveProgress) {
        return;
      }

      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(() => {
        saveProgress(progressRate);
      }, 500);
    };

    const saveLatestProgress = () => {
      const progressRate = calculateArticleProgressRate(targetId);

      if (progressRate > savedProgressRateRef.current) {
        saveProgress(progressRate);
      }
    };

    window.requestAnimationFrame(scheduleProgressSave);
    window.addEventListener("scroll", scheduleProgressSave, { passive: true });
    window.addEventListener("pagehide", saveLatestProgress);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      saveLatestProgress();
      window.removeEventListener("scroll", scheduleProgressSave);
      window.removeEventListener("pagehide", saveLatestProgress);
    };
  }, [articleId, queryClient, targetId, userId]);

  return null;
}
