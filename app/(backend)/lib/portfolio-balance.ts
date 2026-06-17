import { Prisma } from "@/app/(backend)/generated/prisma/client";

type DecimalValue = Prisma.Decimal | { toString: () => string };

export function getTotalAvailableOrderAmountKrw(
  krwBalance: DecimalValue,
  usdBalance: DecimalValue,
  usdKrwExchangeRate: number,
) {
  const exchangeRate = new Prisma.Decimal(usdKrwExchangeRate);

  return new Prisma.Decimal(krwBalance.toString())
    .add(new Prisma.Decimal(usdBalance.toString()).mul(exchangeRate))
    .toDecimalPlaces(2);
}
