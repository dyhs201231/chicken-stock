import "server-only";

import { unstable_cache } from "next/cache";
import type {
  EducationArticle,
  EducationSummary,
} from "@/app/(frontend)/apis/edu/api";
import { prisma } from "./prisma";

const EDUCATION_CONTENT_REVALIDATE_SECONDS = 60 * 10;

function withArticleDefaults(
  summaries: Array<{
    articles: Array<{
      id: number;
      sortOrder: number;
      title: string;
    }>;
    id: number;
    stage: number;
    summary: string[];
    title: string;
  }>,
): EducationSummary[] {
  return summaries.map((summary) => ({
    ...summary,
    articles: summary.articles.map((article) => ({
      ...article,
      progressRate: 0,
      isCompleted: false,
    })),
  }));
}

export const getCachedEducationSummaries = unstable_cache(
  async () => {
    const educationSummaries = await prisma.educationSummary.findMany({
      orderBy: { stage: "asc" },
      select: {
        id: true,
        title: true,
        stage: true,
        summary: true,
        articles: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            sortOrder: true,
          },
        },
      },
    });

    return withArticleDefaults(educationSummaries);
  },
  ["education-summaries"],
  {
    revalidate: EDUCATION_CONTENT_REVALIDATE_SECONDS,
  },
);

export const getCachedEducationArticle = unstable_cache(
  async (articleId: number, level: number): Promise<EducationArticle | null> => {
    return prisma.article.findFirst({
      where: {
        id: articleId,
        educationSummary: {
          stage: level,
        },
      },
      select: {
        id: true,
        educationSummaryId: true,
        title: true,
        content: true,
        imageUrl: true,
        sortOrder: true,
        educationSummary: {
          select: {
            stage: true,
            title: true,
          },
        },
      },
    });
  },
  ["education-article"],
  {
    revalidate: EDUCATION_CONTENT_REVALIDATE_SECONDS,
  },
);
