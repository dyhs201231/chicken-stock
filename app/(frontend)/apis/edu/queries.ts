import { useQuery } from "@tanstack/react-query";

export type EducationSummaryArticle = {
  id: number;
  title: string;
};

export type EducationSummary = {
  stage: number;
  title: string;
  summary: string[];
  articles: EducationSummaryArticle[];
};

type EducationSummariesResponse =
  | {
      ok: true;
      data: EducationSummary[];
    }
  | {
      ok: false;
      error: string;
    };

export const educationQueryKeys = {
  summaries: ["educationSummaries"] as const,
};

export async function fetchEducationSummaries() {
  const response = await fetch("/api/edu");
  const result = (await response.json()) as EducationSummariesResponse;

  if (!response.ok || !result.ok) {
    throw new Error(
      result.ok ? "EDUCATION_CONTENT_FETCH_FAILED" : result.error,
    );
  }

  return result.data;
}

export function useEducationSummariesQuery() {
  return useQuery({
    queryKey: educationQueryKeys.summaries,
    queryFn: fetchEducationSummaries,
  });
}
