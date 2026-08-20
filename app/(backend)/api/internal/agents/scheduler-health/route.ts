import { NextRequest, NextResponse } from "next/server.js";

import { getSchedulerHealth } from "../../../../lib/scheduler-health.ts";
import { reportServerError } from "../../../../lib/report-server-error.ts";

export const runtime = "nodejs";

export function isAuthorized(
  request: NextRequest,
  nodeEnv = process.env.NODE_ENV,
  tokens = [process.env.AGENT_INTERNAL_TOKEN, process.env.CRON_SECRET].filter(
    (token): token is string => Boolean(token),
  ),
) {
  if (tokens.length === 0) {
    return nodeEnv !== "production";
  }

  const authorization = request.headers.get("authorization");

  return tokens.some((token) => authorization === `Bearer ${token}`);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        ok: false,
      },
      { status: 401 },
    );
  }

  try {
    const health = await getSchedulerHealth();

    if (!health.healthy) {
      console.error("Scheduler watchdog detected unhealthy state", {
        checkedAt: health.checkedAt,
        issues: health.issues,
      });
    }

    return NextResponse.json(
      { data: health, ok: health.healthy },
      { status: health.healthy ? 200 : 503 },
    );
  } catch (error) {
    reportServerError(error, {
      component: "scheduler-health-api",
      kind: "handled-5xx",
      operation: "check-health",
    });
    console.error("Scheduler watchdog failed", error);

    return NextResponse.json(
      {
        error: "Scheduler watchdog failed",
        ok: false,
      },
      { status: 503 },
    );
  }
}
