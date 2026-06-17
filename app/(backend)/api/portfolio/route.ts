import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  verifyAuthToken,
} from "@/app/(backend)/lib/auth";
import { getUsdKrwExchangeRate } from "@/app/(backend)/lib/market-indices";
import { prisma } from "@/app/(backend)/lib/prisma";
import { getTotalAvailableOrderAmountKrw } from "@/app/(backend)/lib/portfolio-balance";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import {
  InvestmentType,
  TransactionType,
  type InvestmentType as InvestmentTypeValue,
} from "@/app/(backend)/generated/prisma/enums";

export const runtime = "nodejs";

const INITIAL_PORTFOLIO_KRW_BALANCE = 100_000;
const investmentTypeValues = new Set<string>(Object.values(InvestmentType));
const AssetType = {
  DOMESTIC_STOCK: "DOMESTIC_STOCK",
  FOREIGN_STOCK: "FOREIGN_STOCK",
} as const;

type AssetType = (typeof AssetType)[keyof typeof AssetType];

type TransactionMonthFilter = {
  gte: Date;
  lt: Date;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInvestmentType(value: unknown): value is InvestmentTypeValue {
  return typeof value === "string" && investmentTypeValues.has(value);
}

function getAuthenticatedUserId(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const payload = verifyAuthToken(accessToken, "access");

    return BigInt(payload.sub);
  } catch {
    return null;
  }
}

async function getCreatePortfolioPayload(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(body) || !isInvestmentType(body.investmentType)) {
    return null;
  }

  return {
    investmentType: body.investmentType,
  };
}

function createAccountNumber(userId: bigint) {
  return `CSTK-${userId.toString().padStart(10, "0")}`;
}

function createPortfolioTransactionId() {
  return randomUUID();
}

function serializeDecimal(value: { toString: () => string }) {
  return value.toString();
}

function serializeDecimalNumber(value: { toString: () => string }) {
  return Number(value.toString());
}

function serializeNullableDecimal(value: { toString: () => string } | null) {
  return value?.toString() ?? null;
}

function serializeDate(value: Date) {
  return value.toISOString();
}

function serializeDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getTransactionMonthFilter(request: NextRequest):
  | {
      ok: true;
      value: TransactionMonthFilter | undefined;
    }
  | {
      ok: false;
    } {
  const incomeYear = request.nextUrl.searchParams.get("incomeYear");
  const incomeMonth = request.nextUrl.searchParams.get("incomeMonth");

  if (!incomeYear && !incomeMonth) {
    return {
      ok: true,
      value: undefined,
    };
  }

  const year = Number(incomeYear);
  const month = Number(incomeMonth);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 1900 ||
    year > 9999 ||
    month < 1 ||
    month > 12
  ) {
    return {
      ok: false,
    };
  }

  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthIndex = month === 12 ? 0 : month;

  return {
    ok: true,
    value: {
      gte: new Date(Date.UTC(year, month - 1, 1)),
      lt: new Date(Date.UTC(nextYear, nextMonthIndex, 1)),
    },
  };
}

function getPortfolioInvestmentAmounts(
  items: Array<{
    assetType: string;
    totalInvested: { toString: () => string };
  }>,
) {
  return items.reduce(
    (amounts, item) => {
      const totalInvested = serializeDecimalNumber(item.totalInvested);

      amounts.totalInvestmentAmount += totalInvested;

      if (item.assetType === AssetType.DOMESTIC_STOCK) {
        amounts.domesticStockAmount += totalInvested;
      }

      if (item.assetType === AssetType.FOREIGN_STOCK) {
        amounts.foreignStockAmount += totalInvested;
      }

      return amounts;
    },
    {
      domesticStockAmount: 0,
      foreignStockAmount: 0,
      totalInvestmentAmount: 0,
    },
  );
}

export async function GET(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json(
      { message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const transactionMonthFilter = getTransactionMonthFilter(request);

  if (!transactionMonthFilter.ok) {
    return NextResponse.json(
      { message: "유효한 수입분석 연월이 필요합니다." },
      { status: 400 },
    );
  }

  const portfolio = await prisma.portfolio.findUnique({
    include: {
      items: {
        orderBy: {
          createdAt: "asc",
        },
      },
      transactions: {
        orderBy: [
          {
            executedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        where: transactionMonthFilter.value
          ? {
              executedAt: transactionMonthFilter.value,
            }
          : undefined,
      },
    },
    where: {
      userId,
    },
  });

  if (!portfolio) {
    return NextResponse.json(null);
  }

  const investmentAmounts = getPortfolioInvestmentAmounts(portfolio.items);
  const usdKrwExchangeRate = await getUsdKrwExchangeRate();

  return NextResponse.json({
    accountNumber: portfolio.accountNumber,
    createdAt: serializeDate(portfolio.createdAt),
    domesticStockAmount: investmentAmounts.domesticStockAmount,
    foreignStockAmount: investmentAmounts.foreignStockAmount,
    id: portfolio.id.toString(),
    items: portfolio.items.map((item) => ({
      assetType: item.assetType,
      averagePrice: serializeDecimal(item.averagePrice),
      companyLogoUrl: item.companyLogoUrl,
      companyName: item.companyName,
      createdAt: serializeDate(item.createdAt),
      currentPrice: serializeDecimal(item.currentPrice),
      fee: serializeDecimal(item.fee),
      portfolioId: item.portfolioId.toString(),
      profit: serializeDecimal(item.profit),
      profitRate: serializeDecimal(item.profitRate),
      quantity: item.quantity,
      saleTax: serializeDecimal(item.saleTax),
      stockId: item.stockId,
      totalInvested: serializeDecimal(item.totalInvested),
      updatedAt: serializeDate(item.updatedAt),
    })),
    krwBalance: serializeDecimalNumber(portfolio.krwBalance),
    totalAvailableOrderAmount: serializeDecimalNumber(
      getTotalAvailableOrderAmountKrw(
        portfolio.krwBalance,
        portfolio.usdBalance,
        usdKrwExchangeRate,
      ),
    ),
    totalBalance: serializeDecimalNumber(portfolio.totalBalance),
    totalInvestmentAmount: investmentAmounts.totalInvestmentAmount,
    transactions: portfolio.transactions.map((transaction) => ({
      companyName: transaction.companyName,
      createdAt: serializeDate(transaction.createdAt),
      executedAt: serializeDateOnly(transaction.executedAt),
      exchangeRate: serializeNullableDecimal(transaction.exchangeRate),
      exchangeType: transaction.exchangeType,
      fee: serializeDecimal(transaction.fee),
      id: transaction.id,
      paidAmount: serializeNullableDecimal(transaction.paidAmount),
      portfolioId: transaction.portfolioId.toString(),
      purchaseAmount: serializeNullableDecimal(transaction.purchaseAmount),
      receivedAmount: serializeNullableDecimal(transaction.receivedAmount),
      realizedProfit: serializeNullableDecimal(transaction.realizedProfit),
      stockId: transaction.stockId,
      totalAmount: serializeDecimal(transaction.totalAmount),
      totalQuantity: transaction.totalQuantity,
      tradeOrderId: transaction.tradeOrderId?.toString() ?? null,
      transactionType: transaction.transactionType,
      updatedAt: serializeDate(transaction.updatedAt),
      withdrawalAt: serializeDateOnly(transaction.withdrawalAt),
    })),
    updatedAt: serializeDate(portfolio.updatedAt),
    usdBalance: serializeDecimalNumber(portfolio.usdBalance),
    userId: portfolio.userId.toString(),
  });
}

export async function POST(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json(
      { message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const payload = await getCreatePortfolioPayload(request);

  if (!payload) {
    return NextResponse.json(
      { message: "유효한 투자 성향이 필요합니다." },
      { status: 400 },
    );
  }

  const portfolio = await prisma.$transaction(async (tx) => {
    const initialKrwBalance = new Prisma.Decimal(INITIAL_PORTFOLIO_KRW_BALANCE);
    const createdAt = new Date();

    await tx.user.update({
      data: {
        investmentType: payload.investmentType,
      },
      where: {
        id: userId,
      },
    });

    return tx.portfolio.upsert({
      create: {
        accountNumber: createAccountNumber(userId),
        krwBalance: initialKrwBalance,
        totalAvailableOrderAmount: initialKrwBalance,
        totalBalance: initialKrwBalance,
        transactions: {
          create: {
            companyName: "원화 충전",
            executedAt: createdAt,
            fee: new Prisma.Decimal(0),
            id: createPortfolioTransactionId(),
            receivedAmount: initialKrwBalance,
            totalAmount: initialKrwBalance,
            totalQuantity: 0,
            transactionType: TransactionType.DEPOSIT,
            withdrawalAt: createdAt,
          },
        },
        userId,
      },
      select: {
        accountNumber: true,
        id: true,
        userId: true,
      },
      update: {},
      where: {
        userId,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    portfolio: {
      accountNumber: portfolio.accountNumber,
      id: portfolio.id.toString(),
      userId: portfolio.userId.toString(),
    },
  });
}
