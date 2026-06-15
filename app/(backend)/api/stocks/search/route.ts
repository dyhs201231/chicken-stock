import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

const DEFAULT_SEARCH_LIMIT = 6;
const MAX_SEARCH_LIMIT = 20;
const SEARCH_PREFETCH_MULTIPLIER = 4;

function parseSearchLimit(value: string | null) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    return DEFAULT_SEARCH_LIMIT;
  }

  return Math.min(numberValue, MAX_SEARCH_LIMIT);
}

function getLogoLabel(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getSearchScore(
  stock: {
    name: string;
    ticker: string;
  },
  query: string,
) {
  const normalizedQuery = normalize(query);
  const normalizedName = normalize(stock.name);
  const normalizedTicker = normalize(stock.ticker);

  if (normalizedTicker === normalizedQuery) {
    return 0;
  }

  if (normalizedName === normalizedQuery) {
    return 1;
  }

  if (normalizedTicker.startsWith(normalizedQuery)) {
    return 2;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 3;
  }

  if (normalizedTicker.includes(normalizedQuery)) {
    return 4;
  }

  return 5;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q")?.trim() ?? "";
    const limit = parseSearchLimit(searchParams.get("limit"));

    if (!query) {
      return NextResponse.json({
        ok: true,
        data: {
          stocks: [],
        },
      });
    }

    const stocks = await prisma.stock.findMany({
      where: {
        marketStatus: "LISTED",
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            ticker: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        ticker: true,
        name: true,
        imageUrl: true,
        countryCode: true,
      },
      orderBy: {
        name: "asc",
      },
      take: Math.min(limit * SEARCH_PREFETCH_MULTIPLIER, MAX_SEARCH_LIMIT),
    });

    const data = stocks
      .toSorted((a, b) => {
        const scoreDiff = getSearchScore(a, query) - getSearchScore(b, query);

        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        return a.name.localeCompare(b.name, "ko");
      })
      .slice(0, limit)
      .map((stock) => ({
        id: stock.id,
        ticker: stock.ticker,
        name: stock.name,
        market: stock.countryCode === "KR" ? "domestic" : "global",
        logoLabel: getLogoLabel(stock.name),
        logoUrl: stock.imageUrl || undefined,
      }));

    return NextResponse.json({
      ok: true,
      data: {
        stocks: data,
      },
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "STOCK_SEARCH_FAILED"
        : error instanceof Error
          ? error.message
          : "STOCK_SEARCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
