export type MarketApiFaultMode =
  | "none"
  | "delay"
  | "http-500"
  | "invalid-json"
  | "missing-fields"
  | "timeout";

type Environment = Record<string, string | undefined>;

type CreateFaultAwareFetchOptions = {
  env?: Environment;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

const FAULT_MODES = new Set<MarketApiFaultMode>([
  "none",
  "delay",
  "http-500",
  "invalid-json",
  "missing-fields",
  "timeout",
]);

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function waitForDelay(
  ms: number,
  signal: AbortSignal | null | undefined,
  sleep: (ms: number) => Promise<void>,
) {
  if (!signal) {
    await sleep(ms);
    return;
  }

  if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  let abortRequest: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    abortRequest = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", abortRequest, { once: true });
  });

  try {
    await Promise.race([sleep(ms), aborted]);
  } finally {
    if (abortRequest) {
      signal.removeEventListener("abort", abortRequest);
    }
  }
}

function getDelayMs(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return 5_000;
  }

  return Math.min(parsed, 30_000);
}

export function resolveFaultMode(env: Environment): MarketApiFaultMode {
  if (
    env.NODE_ENV === "production" ||
    env.MARKET_API_FAULT_ENABLED !== "1"
  ) {
    return "none";
  }

  const mode = env.MARKET_API_FAULT_MODE as MarketApiFaultMode | undefined;

  return mode && FAULT_MODES.has(mode) ? mode : "none";
}

export function createFaultAwareFetch({
  env = process.env,
  fetchImpl = fetch,
  sleep = defaultSleep,
}: CreateFaultAwareFetchOptions = {}): typeof fetch {
  const mode = resolveFaultMode(env);

  return async (input, init) => {
    if (mode === "none") {
      return fetchImpl(input, init);
    }

    if (mode === "delay") {
      await waitForDelay(getDelayMs(env.MARKET_API_DELAY_MS), init?.signal, sleep);
      return fetchImpl(input, init);
    }

    if (mode === "http-500") {
      return new Response(JSON.stringify({ error: "injected-market-api-fault" }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (mode === "invalid-json") {
      return new Response("{", {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (mode === "missing-fields") {
      return new Response(JSON.stringify({ chart: { result: [{}] } }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Promise<Response>((_resolve, reject) => {
      const rejectAsAborted = () => {
        reject(new DOMException("Aborted", "AbortError"));
      };

      if (init?.signal?.aborted) {
        rejectAsAborted();
        return;
      }

      init?.signal?.addEventListener("abort", rejectAsAborted, { once: true });
    });
  };
}
