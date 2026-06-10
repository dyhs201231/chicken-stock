import type { NextConfig } from "next";

const agentTraceExcludes = [
  "./AGENTS.md",
  "./CLAUDE.md",
  "./.git/**/*",
  "./.next/**/*",
  "./adk-worker/**/*",
  "./next.config.ts",
];

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/api/internal/agents/run-trade": agentTraceExcludes,
    "/api/internal/agents/scheduler": agentTraceExcludes,
  },
};

export default nextConfig;
