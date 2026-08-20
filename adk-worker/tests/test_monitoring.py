from __future__ import annotations

import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import sentry_sdk
from sentry_sdk.transport import Transport

from adk_worker.monitoring import (
    WorkerFailure,
    init_sentry,
    report_batch_failures,
    sanitize_sentry_event,
)
from adk_worker.trade_intents import run_trade_intents_from_payload


class RecordingTransport(Transport):
    def __init__(self, events: list[dict[str, object]]) -> None:
        super().__init__()
        self.events = events

    def capture_envelope(self, envelope) -> None:
        for item in envelope.items:
            event = item.get_event()

            if event is not None:
                self.events.append(event)


class WorkerMonitoringTests(unittest.TestCase):
    def setUp(self) -> None:
        self.events: list[dict[str, object]] = []
        sentry_sdk.init(
            default_integrations=False,
            dsn="https://public@example.com/1",
            transport=RecordingTransport(self.events),
        )

    def tearDown(self) -> None:
        sentry_sdk.flush(timeout=2)
        sentry_sdk.init(dsn=None, default_integrations=False)

    @patch("adk_worker.monitoring.random.random", return_value=0.1)
    def test_batch_failures_are_sampled_at_ten_percent(self, _random) -> None:
        report_batch_failures(
            [WorkerFailure(agent_type="VALUE", error=RuntimeError("failed"))]
        )

        sentry_sdk.flush(timeout=2)

        self.assertEqual(self.events, [])

    @patch("adk_worker.monitoring.random.random", return_value=0.099)
    def test_multiple_failures_send_one_safe_summary(self, _random) -> None:
        report_batch_failures(
            [
                WorkerFailure(agent_type="VALUE", error=RuntimeError("first failure")),
                WorkerFailure(agent_type="GROWTH", error=ValueError("second failure")),
            ]
        )

        sentry_sdk.flush(timeout=2)

        self.assertEqual(len(self.events), 1)
        event = self.events[0]
        self.assertEqual(
            event["tags"],
            {
                "agent_types": "GROWTH,VALUE",
                "component": "adk-worker",
                "failure_count": "2",
                "kind": "partial-failure",
            },
        )
        self.assertEqual(
            event["exception"]["values"][0]["value"],
            "first failure",
        )
        self.assertNotIn("extra", event)
        self.assertNotIn("request", event)
        self.assertNotIn("user", event)

    def test_event_sanitizer_removes_request_and_payload_data(self) -> None:
        event = {
            "breadcrumbs": {"values": [{"message": "prompt secret"}]},
            "extra": {"candidate": {"stockId": 123}},
            "request": {
                "cookies": {"session": "secret"},
                "data": {"prompt": "secret"},
                "headers": {"Authorization": "Bearer secret"},
                "query_string": "token=secret",
                "url": "https://worker/run-trade-intents?token=secret",
            },
            "user": {"email": "user@example.com", "ip_address": "127.0.0.1"},
        }

        sanitized = sanitize_sentry_event(event, {})

        self.assertNotIn("breadcrumbs", sanitized)
        self.assertNotIn("extra", sanitized)
        self.assertNotIn("request", sanitized)
        self.assertNotIn("user", sanitized)

    @patch("adk_worker.monitoring.sentry_sdk.init")
    @patch.dict(
        os.environ,
        {
            "K_REVISION": "worker-revision-123",
            "SENTRY_DSN": "https://public@example.com/1",
            "SENTRY_ENABLED": "true",
            "SENTRY_ENVIRONMENT": "production",
        },
        clear=True,
    )
    def test_init_uses_production_privacy_and_sampling_options(
        self,
        sentry_init,
    ) -> None:
        init_sentry()

        sentry_init.assert_called_once()
        options = sentry_init.call_args.kwargs
        self.assertEqual(options["environment"], "production")
        self.assertEqual(options["release"], "worker-revision-123")
        self.assertEqual(options["sample_rate"], 1.0)
        self.assertEqual(options["traces_sample_rate"], 0.05)
        self.assertFalse(options["enable_logs"])
        self.assertFalse(options["include_local_variables"])
        self.assertEqual(options["max_request_body_size"], "never")
        self.assertFalse(options["send_default_pii"])

    @patch("adk_worker.monitoring.sentry_sdk.init")
    @patch.dict(
        os.environ,
        {
            "SENTRY_DSN": "https://public@example.com/1",
            "SENTRY_ENABLED": "true",
            "SENTRY_ENVIRONMENT": "preview",
        },
        clear=True,
    )
    def test_init_stays_disabled_outside_production(self, sentry_init) -> None:
        init_sentry()

        sentry_init.assert_not_called()


class TradeIntentFailureReportingTests(unittest.IsolatedAsyncioTestCase):
    @patch("adk_worker.trade_intents.report_batch_failures")
    @patch("adk_worker.trade_intents.run_agent_for_candidate", new_callable=AsyncMock)
    @patch("adk_worker.trade_intents.load_config")
    async def test_request_reports_partial_failures_once(
        self,
        load_config,
        run_agent,
        report_failures,
    ) -> None:
        load_config.return_value = SimpleNamespace(
            adk_worker_concurrency=2,
            can_call_adk=True,
            gemini_model="test-model",
        )
        run_agent.side_effect = [RuntimeError("value failed"), ValueError("growth failed")]
        payload = {
            "agents": [
                {
                    "agentType": "VALUE",
                    "candidates": [{"stockId": 11}],
                },
                {
                    "agentType": "GROWTH",
                    "candidates": [{"stockId": 22}],
                },
            ]
        }

        intents, errors = await run_trade_intents_from_payload(payload)

        self.assertEqual(intents, [])
        self.assertEqual(
            errors,
            [
                {"agentType": "VALUE", "error": "value failed", "stockId": 11},
                {"agentType": "GROWTH", "error": "growth failed", "stockId": 22},
            ],
        )
        report_failures.assert_called_once()
        failures = report_failures.call_args.args[0]
        self.assertEqual(
            [(failure.agent_type, type(failure.error)) for failure in failures],
            [("VALUE", RuntimeError), ("GROWTH", ValueError)],
        )

    @patch(
        "adk_worker.trade_intents.report_batch_failures",
        side_effect=RuntimeError("monitoring unavailable"),
    )
    @patch("adk_worker.trade_intents.run_agent_for_candidate", new_callable=AsyncMock)
    @patch("adk_worker.trade_intents.load_config")
    async def test_monitoring_failure_does_not_change_worker_response(
        self,
        load_config,
        run_agent,
        _report_failures,
    ) -> None:
        load_config.return_value = SimpleNamespace(
            adk_worker_concurrency=1,
            can_call_adk=True,
            gemini_model="test-model",
        )
        run_agent.side_effect = RuntimeError("agent failed")

        intents, errors = await run_trade_intents_from_payload(
            {
                "agents": [
                    {
                        "agentType": "VALUE",
                        "candidates": [{"stockId": 11}],
                    }
                ]
            }
        )

        self.assertEqual(intents, [])
        self.assertEqual(
            errors,
            [{"agentType": "VALUE", "error": "agent failed", "stockId": 11}],
        )
