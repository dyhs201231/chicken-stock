import * as Sentry from "@sentry/nextjs";
import {
  sanitizeSentryBreadcrumb,
  sanitizeSentryEvent,
} from "./sentry-sanitization";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  beforeBreadcrumb: sanitizeSentryBreadcrumb,
  beforeSend: sanitizeSentryEvent,
  dataCollection: {
    cookies: false,
    databaseQueryData: false,
    genAI: { inputs: false, outputs: false },
    graphQL: { document: false, variables: false },
    httpBodies: [],
    httpHeaders: { request: false, response: false },
    stackFrameVariables: false,
    urlQueryParams: false,
    userInfo: false,
  },
  dsn,
  enableLogs: false,
  enabled: process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true" && Boolean(dsn),
  environment: "production",
  sampleRate: 1,
  sendDefaultPii: false,
  tracesSampleRate: 0.05,
});
