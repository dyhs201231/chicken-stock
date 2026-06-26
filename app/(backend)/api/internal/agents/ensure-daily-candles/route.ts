import { after, NextRequest, NextResponse } from "next/server";
import { ensureListedDailyCandles } from "@/app/(backend)/lib/stock-daily-candles";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_LOOKBACK_DAYS = 7;
const MAX_LOOKBACK_DAYS = 30;

function isAuthorized(request: NextRequest) {
  const tokens = [
    process.env.AGENT_INTERNAL_TOKEN,
    process.env.CRON_SECRET,
  ].filter((token): token is string => Boolean(token));

  if (tokens.length === 0) {
    return true;
  }

  const authorization = request.headers.get("authorization");

  return tokens.some((token) => authorization === `Bearer ${token}`);
}

function parseLookbackDays(value: string | null) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_LOOKBACK_DAYS;
  }

  return Math.min(parsed, MAX_LOOKBACK_DAYS);
}

function parseCountryCode(value: string | null): "KR" | "US" | undefined {
  return value === "KR" || value === "US" ? value : undefined;
}

async function handleEnsureDailyCandlesRequest(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        ok: false,
      },
      { status: 401 },
    );
  }

  const source = request.nextUrl.searchParams.get("source");
  const options = {
    countryCode: parseCountryCode(request.nextUrl.searchParams.get("country")),
    lookbackDays: parseLookbackDays(
      request.nextUrl.searchParams.get("lookbackDays"),
    ),
  };

  if (source === "scheduler") {
    after(async () => {
      try {
        const result = await ensureListedDailyCandles(options);

        console.info("Scheduled daily candle maintenance finished", result);
      } catch (error) {
        console.error("Scheduled daily candle maintenance failed", error);
      }
    });

    return NextResponse.json(
      {
        data: {
          accepted: true,
          countryCode: options.countryCode ?? null,
          lookbackDays: options.lookbackDays,
          source,
        },
        ok: true,
      },
      { status: 202 },
    );
  }

  try {
    const result = await ensureListedDailyCandles(options);

    return NextResponse.json({
      data: result,
      ok: true,
    });
  } catch (error) {
    console.error("Daily candle maintenance API failed", error);

    return NextResponse.json(
      {
        error: "Daily candle maintenance failed",
        ok: false,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleEnsureDailyCandlesRequest(request);
}

export async function POST(request: NextRequest) {
  return handleEnsureDailyCandlesRequest(request);
}
