const SCHEDULER_TARGETS = [
  {
    expectedSchedule: "*/10 * * * *",
    freshnessMinutes: 20,
    httpResponseMarker: '"maxExecutableIntents"',
    jobName: "chicken-stock-run-agent-trade",
  },
  {
    expectedSchedule: "*/30 * * * *",
    freshnessMinutes: 45,
    httpResponseMarker: '"countryCode"',
    jobName: "chicken-stock-ensure-daily-candles",
  },
  {
    expectedSchedule: "*/10 * * * *",
    freshnessMinutes: 20,
    httpResponseMarker: '"marketOpenCountry"',
    jobName: "chicken-stock-match-pending",
  },
] as const;

type SchedulerJob = {
  active: boolean;
  jobName: string;
  schedule: string;
};

type SchedulerRun = {
  jobName: string;
  startedAt: Date;
  status: string;
};

type SchedulerHttpResponse = {
  content: string;
  createdAt: Date;
  errorMessage: string | null;
  statusCode: number;
  timedOut: boolean;
};

export type SchedulerHealthInput = {
  checkedAt: Date;
  httpResponses: SchedulerHttpResponse[];
  jobs: SchedulerJob[];
  runs: SchedulerRun[];
};

type SchedulerHealthIssueCode =
  | "FAILED_RUN"
  | "HTTP_ERROR"
  | "INACTIVE_JOB"
  | "MISSING_HTTP_RESPONSE"
  | "MISSING_JOB"
  | "SCHEDULE_MISMATCH"
  | "STALE_RUN";

type SchedulerHealthIssue = {
  code: SchedulerHealthIssueCode;
  jobName: string;
  message: string;
};

type SchedulerHealthJobObservation = {
  active: boolean | null;
  httpResponse: {
    createdAt: string | null;
    statusCode: number | null;
    timedOut: boolean | null;
  };
  jobName: string;
  run: {
    startedAt: string | null;
    status: string | null;
  };
  schedule: string | null;
};

export type SchedulerHealthResult = {
  checkedAt: string;
  healthy: boolean;
  issues: SchedulerHealthIssue[];
  jobs: SchedulerHealthJobObservation[];
};

type SchedulerJobRow = {
  active: boolean;
  jobid: number;
  jobname: string;
  schedule: string;
};

type SchedulerRunRow = {
  jobName: string;
  startedAt: Date;
  status: string;
};

type SchedulerHttpResponseRow = {
  content: unknown;
  createdAt: Date;
  errorMessage: string | null;
  statusCode: number;
  timedOut: boolean;
};

function isFresh(timestamp: Date, checkedAt: Date, freshnessMinutes: number) {
  return timestamp.getTime() >= checkedAt.getTime() - freshnessMinutes * 60_000;
}

function toTimestamp(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

function getSafeResponseContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  return JSON.stringify(content) ?? "";
}

function getLatestMatchingHttpResponse(
  responses: SchedulerHttpResponse[],
  marker: string,
  runStartedAt: Date | undefined,
) {
  if (!runStartedAt) {
    return null;
  }

  return responses.reduce<SchedulerHttpResponse | null>((latest, response) => {
    if (
      !response.content.includes(marker) ||
      !response.content.includes('"source":"scheduler"') ||
      response.createdAt.getTime() < runStartedAt.getTime()
    ) {
      return latest;
    }

    if (!latest || response.createdAt.getTime() > latest.createdAt.getTime()) {
      return response;
    }

    return latest;
  }, null);
}

export function evaluateSchedulerHealth(
  input: SchedulerHealthInput,
): SchedulerHealthResult {
  const issues: SchedulerHealthIssue[] = [];
  const jobs = SCHEDULER_TARGETS.map((target) => {
    const job = input.jobs.find(
      (candidate) => candidate.jobName === target.jobName,
    );
    const run = input.runs.find(
      (candidate) => candidate.jobName === target.jobName,
    );
    const httpResponse = getLatestMatchingHttpResponse(
      input.httpResponses,
      target.httpResponseMarker,
      run?.startedAt,
    );

    if (!job) {
      issues.push({
        code: "MISSING_JOB",
        jobName: target.jobName,
        message: "Scheduler job is not configured.",
      });
    } else {
      if (!job.active) {
        issues.push({
          code: "INACTIVE_JOB",
          jobName: target.jobName,
          message: "Scheduler job is inactive.",
        });
      }

      if (job.schedule !== target.expectedSchedule) {
        issues.push({
          code: "SCHEDULE_MISMATCH",
          jobName: target.jobName,
          message:
            "Scheduler job schedule does not match the approved schedule.",
        });
      }

      if (run && run.status !== "succeeded") {
        issues.push({
          code: "FAILED_RUN",
          jobName: target.jobName,
          message: "Latest cron run did not succeed.",
        });
      }

      if (
        !run ||
        !isFresh(run.startedAt, input.checkedAt, target.freshnessMinutes)
      ) {
        issues.push({
          code: "STALE_RUN",
          jobName: target.jobName,
          message: "Latest cron run is outside its freshness window.",
        });
      }

      if (
        !httpResponse ||
        !isFresh(
          httpResponse.createdAt,
          input.checkedAt,
          target.freshnessMinutes,
        )
      ) {
        issues.push({
          code: "MISSING_HTTP_RESPONSE",
          jobName: target.jobName,
          message: "No fresh HTTP response was found for the scheduler job.",
        });
      }

      const hasHttpError =
        httpResponse !== null &&
        (httpResponse.statusCode !== 202 ||
          httpResponse.timedOut ||
          httpResponse.errorMessage !== null);

      if (hasHttpError) {
        issues.push({
          code: "HTTP_ERROR",
          jobName: target.jobName,
          message: "Latest HTTP response did not succeed.",
        });
      }
    }

    return {
      active: job?.active ?? null,
      httpResponse: {
        createdAt: toTimestamp(httpResponse?.createdAt),
        statusCode: httpResponse?.statusCode ?? null,
        timedOut: httpResponse?.timedOut ?? null,
      },
      jobName: target.jobName,
      run: {
        startedAt: toTimestamp(run?.startedAt),
        status: run?.status ?? null,
      },
      schedule: job?.schedule ?? null,
    };
  });

  return {
    checkedAt: input.checkedAt.toISOString(),
    healthy: issues.length === 0,
    issues,
    jobs,
  };
}

export async function getSchedulerHealth(now = new Date()) {
  const [{ prisma }, { Prisma }] = await Promise.all([
    import("./prisma.ts"),
    import("../generated/prisma/client.ts"),
  ]);
  const jobNames = SCHEDULER_TARGETS.map((target) => target.jobName);
  const responseWindowStart = new Date(now.getTime() - 45 * 60_000);

  const [jobs, runs, httpResponses] = await Promise.all([
    prisma.$queryRaw<SchedulerJobRow[]>(Prisma.sql`
      SELECT jobid, jobname, schedule, active
      FROM cron.job
      WHERE jobname IN (${Prisma.join(jobNames)})
    `),
    prisma.$queryRaw<SchedulerRunRow[]>(Prisma.sql`
      SELECT DISTINCT ON (details.jobid)
        jobs.jobname AS "jobName",
        details.status,
        details.start_time AS "startedAt"
      FROM cron.job_run_details details
      JOIN cron.job jobs ON jobs.jobid = details.jobid
      WHERE jobs.jobname IN (${Prisma.join(jobNames)})
      ORDER BY details.jobid, details.start_time DESC
    `),
    prisma.$queryRaw<SchedulerHttpResponseRow[]>(Prisma.sql`
      SELECT
        status_code AS "statusCode",
        timed_out AS "timedOut",
        error_msg AS "errorMessage",
        created AS "createdAt",
        content
      FROM net._http_response
      WHERE created >= ${responseWindowStart}
      ORDER BY created DESC
    `),
  ]);

  return evaluateSchedulerHealth({
    checkedAt: now,
    httpResponses: httpResponses.map((response) => ({
      ...response,
      content: getSafeResponseContent(response.content),
    })),
    jobs: jobs.map((job) => ({
      active: job.active,
      jobName: job.jobname,
      schedule: job.schedule,
    })),
    runs,
  });
}
