import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const agentTraceExcludes = [
  "./AGENTS.md",
  "./CLAUDE.md",
  "./.git/**/*",
  "./next.config.ts",
];
const nonAdkTraceExcludes = [...agentTraceExcludes, "./adk-worker/**/*"];
const runTradeTraceExcludes = [
  ...agentTraceExcludes,
  "./adk-worker/.env",
  "./adk-worker/.venv/**/*",
  "./adk-worker/**/__pycache__/**/*",
  "./adk-worker/**/*.pyc",
];
const prismaTraceIncludes = [
  "./app/(backend)/generated/prisma/**/*",
  "./node_modules/prisma/libquery_engine-rhel-openssl-3.0.x.so.node",
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": prismaTraceIncludes,
    "/api/**/*": prismaTraceIncludes,
    "/api/internal/agents/run-trade": [
      "./adk-worker/main.py",
      "./adk-worker/adk_worker/__init__.py",
      "./adk-worker/adk_worker/agents/__init__.py",
      "./adk-worker/adk_worker/agents/base.py",
      "./adk-worker/adk_worker/agents/growth_agent.py",
      "./adk-worker/adk_worker/agents/momentum_agent.py",
      "./adk-worker/adk_worker/agents/test_agent.py",
      "./adk-worker/adk_worker/agents/value_agent.py",
      "./adk-worker/adk_worker/config.py",
      "./adk-worker/adk_worker/runner.py",
      "./adk-worker/adk_worker/schema.py",
      "./adk-worker/.python_packages/**/*",
      "./adk-worker/requirements.txt",
      ...prismaTraceIncludes,
    ],
  },
  outputFileTracingExcludes: {
    "/*": agentTraceExcludes,
    "/instrumentation": agentTraceExcludes,
    "/api/internal/agents/run-trade": runTradeTraceExcludes,
    "/api/internal/agents/scheduler": nonAdkTraceExcludes,
  },
};

const shouldUploadSentrySourceMaps = Boolean(
  process.env.VERCEL_ENV === "production" &&
  process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true" &&
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT,
);

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
    disable: !shouldUploadSentrySourceMaps,
  },
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
  },
});
