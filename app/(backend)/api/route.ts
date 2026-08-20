import { NextResponse } from "next/server";
import { prisma } from "../lib/prisma";
import { reportServerError } from "../lib/report-server-error";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      select: { id: true },
    });

    return NextResponse.json({
      ok: Boolean(user?.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    reportServerError(error, {
      component: "api-health",
      kind: "handled-5xx",
      operation: "check-database",
    });
    const message =
      process.env.NODE_ENV === "production"
        ? "DB_UNHEALTHY"
        : error instanceof Error
        ? error.message
        : "DB_UNHEALTHY";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
