import assert from "node:assert/strict";
import test from "node:test";

import * as Sentry from "@sentry/node";
import { reportServerError } from "../app/(backend)/lib/report-server-error.ts";

function getEnvelopeEvent(envelope) {
  return envelope[1].find(([headers]) => headers.type === "event")[1];
}

test("reportServerError sends one exception with safe context tags", async () => {
  const envelopes = [];

  Sentry.init({
    dsn: "https://public@example.com/1",
    enabled: true,
    tracesSampleRate: 0,
    transport: () => ({
      flush: async () => true,
      send: async (envelope) => {
        envelopes.push(envelope);

        return { headers: {}, statusCode: 200 };
      },
    }),
  });

  reportServerError(new Error("database failed"), {
    component: "portfolio",
    kind: "handled-5xx",
    operation: "load-portfolio",
  });

  assert.equal(await Sentry.flush(2_000), true);
  assert.equal(envelopes.length, 1);

  const event = getEnvelopeEvent(envelopes[0]);

  assert.deepEqual(event.tags, {
    component: "portfolio",
    kind: "handled-5xx",
    operation: "load-portfolio",
  });
  assert.equal(event.exception.values[0].value, "database failed");
  assert.equal(event.extra, undefined);
  assert.equal(event.request, undefined);
  assert.equal(event.user, undefined);
});
