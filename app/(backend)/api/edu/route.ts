import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
  try {
    const educationSummaries = await prisma.educationSummary.findMany({
      orderBy: { stage: "asc" },
      select: {
        summary: true,
        articles: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: educationSummaries,
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "EDUCATION_CONTENT_FETCH_FAILED"
        : error instanceof Error
        ? error.message
        : "EDUCATION_CONTENT_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
