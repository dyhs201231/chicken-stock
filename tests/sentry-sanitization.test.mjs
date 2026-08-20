import assert from "node:assert/strict";
import test from "node:test";

import {
  sanitizeSentryBreadcrumb,
  sanitizeSentryEvent,
} from "../sentry-sanitization.ts";

test("sanitizeSentryEvent removes user and request-sensitive data", () => {
  const event = {
    extra: {
      order: { quantity: 10 },
    },
    request: {
      cookies: { accessToken: "secret" },
      data: { orderQuantity: 10 },
      headers: {
        authorization: "Bearer secret",
        cookie: "accessToken=secret",
        "user-agent": "test-browser",
      },
      query_string: "email=user@example.com",
      url: "https://www.chicken-stock.com/portfolio?email=user@example.com#order",
    },
    user: {
      email: "user@example.com",
      id: "123",
      ip_address: "127.0.0.1",
    },
  };

  const sanitized = sanitizeSentryEvent(event);

  assert.equal(sanitized.user, undefined);
  assert.equal(sanitized.extra, undefined);
  assert.deepEqual(sanitized.request, {
    headers: { "user-agent": "test-browser" },
    url: "https://www.chicken-stock.com/portfolio",
  });
  assert.notEqual(sanitized, event);
});

test("sanitizeSentryBreadcrumb drops console breadcrumbs", () => {
  const sanitized = sanitizeSentryBreadcrumb({
    category: "console",
    level: "error",
    message: "Authorization: Bearer secret",
  });

  assert.equal(sanitized, null);
});

test("sanitizeSentryBreadcrumb keeps navigation context without query data", () => {
  const breadcrumb = {
    category: "navigation",
    data: {
      from: "/portfolio?account=123",
      to: "https://www.chicken-stock.com/stock/1?token=secret#order",
    },
  };

  const sanitized = sanitizeSentryBreadcrumb(breadcrumb);

  assert.deepEqual(sanitized, {
    category: "navigation",
    data: {
      from: "/portfolio",
      to: "https://www.chicken-stock.com/stock/1",
    },
  });
  assert.notEqual(sanitized, breadcrumb);
});

test("sanitizeSentryBreadcrumb removes unapproved breadcrumb data", () => {
  const sanitized = sanitizeSentryBreadcrumb({
    category: "http",
    data: {
      request_body: { orderQuantity: 10 },
      response_body: { accessToken: "secret" },
    },
    message: "POST /orders?accessToken=secret",
  });

  assert.deepEqual(sanitized, { category: "http" });
});
