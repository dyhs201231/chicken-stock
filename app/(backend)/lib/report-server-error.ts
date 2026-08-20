import * as Sentry from "@sentry/node";

export type ServerErrorContext = Readonly<{
  component: string;
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
