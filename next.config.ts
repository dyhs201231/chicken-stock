import type { NextConfig } from "next";

const agentTraceExcludes = [
  "./AGENTS.md",
  "./CLAUDE.md",
  "./.git/**/*",
  "./adk-worker/**/*",
  "./next.config.ts",
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./app/(backend)/generated/prisma/**/*",
      "./node_modules/prisma/libquery_engine-rhel-openssl-3.0.x.so.node",
    ],
  },
  outputFileTracingExcludes: {
    "/*": agentTraceExcludes,
    "/instrumentation": agentTraceExcludes,
    "/api/internal/agents/run-trade": agentTraceExcludes,
    "/api/internal/agents/scheduler": agentTraceExcludes,
  },
};

export default nextConfig;
