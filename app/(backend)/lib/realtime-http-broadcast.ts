import { sendRealtimeBroadcastWithRetry } from "./realtime-broadcast-retry.ts";

type BroadcastPayload = Record<string, unknown>;

type RealtimeHttpSendResponse =
  | { success: true }
  | { error: string; status: number; success: false };

type RealtimeHttpBroadcastChannel = {
  httpSend: (
    event: string,
    payload: BroadcastPayload,
    options: { timeout: number },
  ) => Promise<RealtimeHttpSendResponse>;
};

type SendRealtimeHttpBroadcastOptions = {
  channel: RealtimeHttpBroadcastChannel;
  event: string;
  now?: () => number;
  payload: BroadcastPayload;
  removeChannel: () => Promise<string>;
  sleep?: (delayMs: number) => Promise<void>;
};

const HTTP_SEND_TIMEOUT_MS = 10_000;

export async function sendRealtimeHttpBroadcast({
  channel,
  event,
  now,
  payload,
  removeChannel,
  sleep,
}: SendRealtimeHttpBroadcastOptions) {
  const delivery = await sendRealtimeBroadcastWithRetry(
    async () => {
      const response = await channel.httpSend(event, payload, {
        timeout: HTTP_SEND_TIMEOUT_MS,
      });

      if (!response.success) {
        throw new Error(
          `Supabase Realtime HTTP ${response.status}: ${response.error}`,
        );
      }
    },
    { now, sleep },
  );
  let cleanupError: unknown = null;

  try {
    const cleanupResult = await removeChannel();

    if (cleanupResult !== "ok") {
      cleanupError = new Error(
        `Supabase Realtime channel cleanup returned ${cleanupResult}`,
      );
    }
  } catch (error) {
    cleanupError = error;
  }

  return { cleanupError, delivery };
}
