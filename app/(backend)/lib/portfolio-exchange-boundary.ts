import { verifyExchangeRateQuote } from "./exchange-rate-quote.ts";

export async function runWithVerifiedExchangeRateQuote<T>({
  now,
  quoteToken,
  runTransaction,
}: {
  now?: Date;
  quoteToken: string;
  runTransaction: (rate: number) => Promise<T>;
}) {
  const { rate } = verifyExchangeRateQuote(quoteToken, now);
  const value = await runTransaction(rate);

  return { rate, value };
}
