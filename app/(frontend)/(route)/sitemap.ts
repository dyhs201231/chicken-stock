import type { MetadataRoute } from "next";
import { prisma } from "@/app/(backend)/lib/prisma";
import { SITE_URL } from "./edu/seo";

export const dynamic = "force-dynamic";

function createUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, stocks] = await Promise.all([
    prisma.article.findMany({
      orderBy: [{ educationSummary: { stage: "asc" } }, { sortOrder: "asc" }],
      select: {
        id: true,
        updatedAt: true,
        educationSummary: {
          select: {
            stage: true,
          },
        },
      },
    }),
    prisma.stock.findMany({
      orderBy: { ticker: "asc" },
      select: {
        ticker: true,
        updatedAt: true,
      },
    }),
  ]);

  return [
    {
      url: createUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: createUrl("/edu"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...articles.map((article) => ({
      url: createUrl(
        `/edu/articles/${article.id}?level=${article.educationSummary.stage}`,
      ),
      lastModified: article.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...stocks.map((stock) => ({
      url: createUrl(`/stock/${stock.ticker}`),
      lastModified: stock.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
