import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

const SAFE_BREADCRUMB_DATA_KEYS = new Set([
  "from",
  "method",
  "status_code",
  "to",
  "url",
]);

function stripUrlDetails(value: string) {
  try {
    const url = new URL(value, "https://sentry.invalid");

    return url.origin === "https://sentry.invalid"
      ? url.pathname
      : `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/, 1)[0] ?? value;
  }
}

function sanitizeHeaders(headers: Record<string, string> | undefined) {
  if (!headers) {
    return undefined;
  }

  const safeHeaders = Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) => !["authorization", "cookie"].includes(name.toLowerCase()),
    ),
  );

  return Object.keys(safeHeaders).length > 0 ? safeHeaders : undefined;
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  if (!event.request) {
    return { ...event, extra: undefined, user: undefined };
  }

  const safeRequest = { ...event.request };
  const safeHeaders = sanitizeHeaders(safeRequest.headers);

  delete safeRequest.cookies;
  delete safeRequest.data;
  delete safeRequest.env;
  delete safeRequest.headers;
  delete safeRequest.query_string;

  return {
    ...event,
    extra: undefined,
    request: {
      ...safeRequest,
      ...(safeHeaders ? { headers: safeHeaders } : {}),
      ...(safeRequest.url ? { url: stripUrlDetails(safeRequest.url) } : {}),
    },
    user: undefined,
  };
}

export function sanitizeSentryBreadcrumb(
  breadcrumb: Breadcrumb,
): Breadcrumb | null {
  if (breadcrumb.category === "console") {
    return null;
  }

  if (!breadcrumb.data) {
    return { ...breadcrumb };
  }

  const safeData = Object.fromEntries(
    Object.entries(breadcrumb.data)
      .filter(([key]) => SAFE_BREADCRUMB_DATA_KEYS.has(key))
      .map(([key, value]) => [
        key,
        typeof value === "string" && ["from", "to", "url"].includes(key)
          ? stripUrlDetails(value)
          : value,
      ]),
  );

  const safeBreadcrumb = { ...breadcrumb };
  delete safeBreadcrumb.data;
  delete safeBreadcrumb.message;

  return {
    ...safeBreadcrumb,
    ...(Object.keys(safeData).length > 0 ? { data: safeData } : {}),
  };
}
