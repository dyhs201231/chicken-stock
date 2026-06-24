import {
  getAgentTradeJobState,
  runAgentTradeJob,
} from "@/app/(backend)/lib/agent-trade-runner";

type AgentTradeSchedulerState = {
  intervalMinutes: number;
  startedAt: Date;
  timer: ReturnType<typeof setInterval>;
};

const globalForAgentTradeScheduler = globalThis as unknown as {
  agentTradeSchedulerState?: AgentTradeSchedulerState;
};

function getIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function isIntervalFallbackEnabled() {
  return process.env.AGENT_TRADE_INTERVAL_FALLBACK_ENABLED === "true";
}

const SCHEDULER_MAX_EXECUTABLE_INTENTS = getIntegerEnv(
  "AGENT_SCHEDULER_MAX_EXECUTABLE_INTENTS",
  3,
);
const SCHEDULER_STOCK_LIMIT = getIntegerEnv("AGENT_SCHEDULER_STOCK_LIMIT", 30);
const SCHEDULER_TARGET_PATH =
  `/api/internal/agents/run-trade?source=scheduler` +
  `&limit=${SCHEDULER_MAX_EXECUTABLE_INTENTS}` +
  `&stockLimit=${SCHEDULER_STOCK_LIMIT}`;

async function runScheduledAgentTrade() {
  try {
    const job = await runAgentTradeJob({
      includeAdk: true,
      maxExecutableIntents: SCHEDULER_MAX_EXECUTABLE_INTENTS,
      openMarketsOnly: true,
      recordSkippedIntents: false,
      source: "scheduler",
      stockLimit: SCHEDULER_STOCK_LIMIT,
    });

    if (job.status === "SKIPPED") {
      console.info("Agent trade scheduler skipped run", {
        currentSource: job.currentSource,
        currentStartedAt: job.currentStartedAt?.toISOString(),
        reason: job.reason,
      });
      return;
    }

    console.info("Agent trade scheduler completed run", job.result);
  } catch (error) {
    console.error("Agent trade scheduler failed run", error);
  }
}

export function startAgentTradeScheduler() {
  if (!isIntervalFallbackEnabled()) {
    console.info("Agent trade interval fallback is disabled; use external scheduler", {
      targetPath: SCHEDULER_TARGET_PATH,
    });
    return;
  }

  if (globalForAgentTradeScheduler.agentTradeSchedulerState) {
    return;
  }

  const intervalMinutes = getIntegerEnv("AGENT_TRADE_INTERVAL_MINUTES", 60);
  const intervalMs = intervalMinutes * 60 * 1000;
  const timer = setInterval(() => {
    void runScheduledAgentTrade();
  }, intervalMs);

  timer.unref?.();

  globalForAgentTradeScheduler.agentTradeSchedulerState = {
    intervalMinutes,
    startedAt: new Date(),
    timer,
  };

  console.info("Agent trade scheduler started", {
    intervalMinutes,
    mode: "interval-fallback",
  });
}

export function getAgentTradeSchedulerStatus() {
  const schedulerState = globalForAgentTradeScheduler.agentTradeSchedulerState;

  return {
    externalScheduler: {
      targetPath: SCHEDULER_TARGET_PATH,
    },
    intervalFallback: {
      enabled: isIntervalFallbackEnabled(),
      intervalMinutes: schedulerState?.intervalMinutes ?? null,
      started: Boolean(schedulerState),
      startedAt: schedulerState?.startedAt ?? null,
    },
    job: getAgentTradeJobState(),
    mode: "external-scheduler",
  };
}
