import * as Sentry from "@sentry/node";

export type ServerErrorContext = Readonly<{
  attempt_count?: string;
  component: string;
  duration_bucket?:
    | "under_1s"
    | "1s_to_5s"
    | "5s_to_10s"
    | "10s_or_more";
  failure_result?: "aborted" | "error" | "timed_out" | "unknown";
  kind: "background" | "handled-5xx";
  operation: string;
}>;

export function reportServerError(
  error: unknown,
  context: ServerErrorContext,
): void {
  Sentry.withScope((scope) => {
    scope.setTags(context);
    Sentry.captureException(error);
  });
}
