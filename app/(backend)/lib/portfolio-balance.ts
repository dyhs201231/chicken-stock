import { Prisma } from "@/app/(backend)/generated/prisma/client";

export const EXCHANGE_RATE = 1500;

type DecimalValue = Prisma.Decimal | { toString: () => string };

export function getTotalAvailableOrderAmountKrw(
  krwBalance: DecimalValue,
  usdBalance: DecimalValue,
) {
  const exchangeRate = new Prisma.Decimal(EXCHANGE_RATE);

  return new Prisma.Decimal(krwBalance.toString())
    .add(new Prisma.Decimal(usdBalance.toString()).mul(exchangeRate))
    .toDecimalPlaces(2);
}
