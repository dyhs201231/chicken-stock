import { createHmac, timingSafeEqual } from "node:crypto";

const EXCHANGE_RATE_QUOTE_CONTEXT = "exchange-rate-quote:v1";
const EXCHANGE_RATE_QUOTE_LIFETIME_MS = 30_000;

export type ExchangeRateQuote = {
  expiresAt: string;
  observedAt: string;
  rate: number;
  token: string;
};

type ExchangeRateQuotePayload = {
  expiresAt: string;
  observedAt: string;
  rate: number;
  v: 1;
};

export class ExchangeRateQuoteError extends Error {
  readonly code:
    | "EXCHANGE_RATE_QUOTE_EXPIRED"
    | "EXCHANGE_RATE_QUOTE_INVALID";

  constructor(
    code:
      | "EXCHANGE_RATE_QUOTE_EXPIRED"
      | "EXCHANGE_RATE_QUOTE_INVALID",
  ) {
    super(code);
    this.code = code;
    this.name = "ExchangeRateQuoteError";
  }
}

function getSecret() {
  const secret = process.env.AUTH_JWT_SECRET;

  if (!secret) {
    throw new Error("AUTH_JWT_SECRET 환경변수가 필요합니다.");
  }

  return secret;
}

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isValidDate(value: Date) {
  return Number.isFinite(value.getTime());
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSecret())
    .update(`${EXCHANGE_RATE_QUOTE_CONTEXT}.${encodedPayload}`)
    .digest("base64url");
}

function invalidQuote(): never {
  throw new ExchangeRateQuoteError("EXCHANGE_RATE_QUOTE_INVALID");
}

function parsePayload(encodedPayload: string): ExchangeRateQuotePayload {
  let value: unknown;

  try {
    value = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    return invalidQuote();
  }

  if (
    !value ||
    typeof value !== "object" ||
    (value as { v?: unknown }).v !== 1 ||
    !isValidRate((value as { rate?: unknown }).rate) ||
    typeof (value as { observedAt?: unknown }).observedAt !== "string" ||
    typeof (value as { expiresAt?: unknown }).expiresAt !== "string"
  ) {
    return invalidQuote();
  }

  const payload = value as ExchangeRateQuotePayload;
  const observedAt = new Date(payload.observedAt);
  const expiresAt = new Date(payload.expiresAt);

  if (!isValidDate(observedAt) || !isValidDate(expiresAt)) {
    return invalidQuote();
  }

  return payload;
}

export function createExchangeRateQuote({
  now = new Date(),
  observedAt,
  rate,
}: {
  now?: Date;
  observedAt: Date;
  rate: number;
}): ExchangeRateQuote {
  if (!isValidRate(rate) || !isValidDate(now) || !isValidDate(observedAt)) {
    return invalidQuote();
  }

  const payload: ExchangeRateQuotePayload = {
    expiresAt: new Date(
      now.getTime() + EXCHANGE_RATE_QUOTE_LIFETIME_MS,
    ).toISOString(),
    observedAt: observedAt.toISOString(),
    rate,
    v: 1,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  return {
    expiresAt: payload.expiresAt,
    observedAt: payload.observedAt,
    rate: payload.rate,
    token: `${encodedPayload}.${sign(encodedPayload)}`,
  };
}

export function verifyExchangeRateQuote(
  token: string,
  now = new Date(),
): { observedAt: Date; rate: number } {
  if (!isValidDate(now)) {
    return invalidQuote();
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return invalidQuote();
  }

  const [encodedPayload, signature] = parts;
  const actualSignature = Buffer.from(signature, "base64url");
  const expectedSignature = Buffer.from(sign(encodedPayload), "base64url");

  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return invalidQuote();
  }

  const payload = parsePayload(encodedPayload);
  const expiresAt = new Date(payload.expiresAt);

  if (expiresAt.getTime() <= now.getTime()) {
    throw new ExchangeRateQuoteError("EXCHANGE_RATE_QUOTE_EXPIRED");
  }

  return {
    observedAt: new Date(payload.observedAt),
    rate: payload.rate,
  };
}
