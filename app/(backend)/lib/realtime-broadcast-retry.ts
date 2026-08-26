export type RealtimeBroadcastResult =
  | "aborted"
  | "error"
  | "ok"
  | "unknown";

export type RealtimeBroadcastDurationBucket =
  | "under_1s"
  | "1s_to_5s"
  | "5s_to_10s"
  | "10s_or_more";

type SendRealtimeBroadcastWithRetryOptions = {
  now?: () => number;
  sleep?: (delayMs: number) => Promise<void>;
};

type RealtimeBroadcastSuccess = {
  attempts: number;
  elapsedMs: number;
  result: "ok";
};

type RealtimeBroadcastFailure = {
  attempts: number;
  elapsedMs: number;
  error: unknown;
  result: Exclude<RealtimeBroadcastResult, "ok">;
};

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 250;

function defaultSleep(delayMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

function classifyRealtimeBroadcastFailure(
  error: unknown,
): Exclude<RealtimeBroadcastResult, "ok"> {
  if (error instanceof Error) {
    return error.name === "AbortError" ? "aborted" : "error";
  }

  return "unknown";
}

export function getRealtimeBroadcastDurationBucket(
  elapsedMs: number,
): RealtimeBroadcastDurationBucket {
  if (elapsedMs < 1_000) {
    return "under_1s";
  }

  if (elapsedMs < 5_000) {
    return "1s_to_5s";
  }

  if (elapsedMs < 10_000) {
    return "5s_to_10s";
  }

  return "10s_or_more";
}

export async function sendRealtimeBroadcastWithRetry(
  send: () => Promise<unknown>,
  {
    now = Date.now,
    sleep = defaultSleep,
  }: SendRealtimeBroadcastWithRetryOptions = {},
): Promise<RealtimeBroadcastFailure | RealtimeBroadcastSuccess> {
  const startedAt = now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await send();

      return {
        attempts: attempt,
        elapsedMs: Math.max(now() - startedAt, 0),
        result: "ok",
      };
    } catch (error) {
      lastError = error;
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS);
    }
  }

  return {
    attempts: MAX_ATTEMPTS,
    elapsedMs: Math.max(now() - startedAt, 0),
    error: lastError,
    result: classifyRealtimeBroadcastFailure(lastError),
  };
}
