export type RealtimeBroadcastResult = "ok" | "error" | "timed_out" | "unknown";

type SendRealtimeBroadcastWithRetryOptions = {
  sleep?: (delayMs: number) => Promise<void>;
};

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 250;

function defaultSleep(delayMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

function normalizeRealtimeBroadcastResult(
  response: string,
): RealtimeBroadcastResult {
  if (response === "ok" || response === "error") {
    return response;
  }

  if (response === "timed out") {
    return "timed_out";
  }

  return "unknown";
}

export async function sendRealtimeBroadcastWithRetry(
  send: () => Promise<string>,
  { sleep = defaultSleep }: SendRealtimeBroadcastWithRetryOptions = {},
): Promise<{ attempts: number; result: RealtimeBroadcastResult }> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = normalizeRealtimeBroadcastResult(await send());

    if (result === "ok" || attempt === MAX_ATTEMPTS) {
      return { attempts: attempt, result };
    }

    await sleep(RETRY_DELAY_MS);
  }

  return { attempts: MAX_ATTEMPTS, result: "unknown" };
}
