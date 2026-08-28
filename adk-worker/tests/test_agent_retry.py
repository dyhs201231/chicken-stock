from __future__ import annotations

import asyncio
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from google.genai import errors
from pydantic import ValidationError


WORKER_ROOT = Path(__file__).resolve().parents[1]
if str(WORKER_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKER_ROOT))

from adk_worker.agents import base
from adk_worker.config import WorkerConfig
from adk_worker.schema import AgentTradeIntent
from adk_worker import trade_intents


class RunAdkJsonAgentWithRetryTests(unittest.IsolatedAsyncioTestCase):
    async def test_returns_successful_response_without_retry(self) -> None:
        response = {"stockId": 1}

        with patch.object(
            base,
            "run_adk_json_agent",
            new=AsyncMock(return_value=response),
        ) as run_agent, patch.object(base.asyncio, "sleep", new=AsyncMock()) as sleep:
            result = await base.run_adk_json_agent_with_retry(object(), "prompt")

        self.assertEqual(result, response)
        self.assertEqual(run_agent.await_count, 1)
        self.assertEqual(sleep.await_count, 0)

    async def test_retries_a_5xx_server_error_and_returns_the_next_response(self) -> None:
        response = {"stockId": 1}

        with patch.object(
            base,
            "run_adk_json_agent",
            new=AsyncMock(
                side_effect=[errors.ServerError(500, {"error": "unavailable"}), response]
            ),
        ) as run_agent, patch.object(base.asyncio, "sleep", new=AsyncMock()):
            result = await base.run_adk_json_agent_with_retry(object(), "prompt")

        self.assertEqual(result, response)
        self.assertEqual(run_agent.await_count, 2)

    async def test_retries_a_429_client_error_and_returns_the_next_response(self) -> None:
        response = {"stockId": 1}

        with patch.object(
            base,
            "run_adk_json_agent",
            new=AsyncMock(
                side_effect=[errors.ClientError(429, {"error": "rate limited"}), response]
            ),
        ) as run_agent, patch.object(base.asyncio, "sleep", new=AsyncMock()):
            result = await base.run_adk_json_agent_with_retry(object(), "prompt")

        self.assertEqual(result, response)
        self.assertEqual(run_agent.await_count, 2)

    async def test_attempt_timeout_retries_without_waiting_for_the_total_budget(self) -> None:
        attempts = 0

        async def run_after_first_timeout(_agent, _prompt):
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                await asyncio.Event().wait()
            return {"stockId": 1}

        with patch.object(base, "GEMINI_ATTEMPT_TIMEOUT_SECONDS", 0.01, create=True), patch.object(
            base, "GEMINI_TOTAL_TIMEOUT_SECONDS", 1, create=True
        ), patch.object(base, "run_adk_json_agent", new=run_after_first_timeout), patch.object(
            base.asyncio, "sleep", new=AsyncMock()
        ):
            try:
                result = await asyncio.wait_for(
                    base.run_adk_json_agent_with_retry(object(), "prompt"),
                    timeout=0.1,
                )
            except TimeoutError:
                self.fail("an individual attempt did not time out and retry")

        self.assertEqual(result, {"stockId": 1})
        self.assertEqual(attempts, 2)

    async def test_stops_after_three_attempts(self) -> None:
        server_error = errors.ServerError(503, {"error": "unavailable"})

        with patch.object(
            base,
            "run_adk_json_agent",
            new=AsyncMock(side_effect=server_error),
        ) as run_agent, patch.object(base.asyncio, "sleep", new=AsyncMock()) as sleep:
            with self.assertRaises(errors.ServerError):
                await base.run_adk_json_agent_with_retry(object(), "prompt")

        self.assertEqual(run_agent.await_count, 3)
        self.assertEqual([call.args[0] for call in sleep.await_args_list], [3, 10])

    async def test_total_budget_raises_a_non_empty_internal_timeout_and_cancels_the_request(
        self,
    ) -> None:
        was_cancelled = False

        async def wait_for_gemini(_agent, _prompt):
            nonlocal was_cancelled
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                was_cancelled = True
                raise

        timeout_error_type = getattr(base, "GeminiRequestTimeoutError", RuntimeError)
        with patch.object(base, "GEMINI_TOTAL_TIMEOUT_SECONDS", 0.01, create=True), patch.object(
            base, "GEMINI_ATTEMPT_TIMEOUT_SECONDS", 1, create=True
        ), patch.object(base, "run_adk_json_agent", new=wait_for_gemini):
            try:
                with self.assertRaises(timeout_error_type) as context:
                    await asyncio.wait_for(
                        base.run_adk_json_agent_with_retry(object(), "prompt"),
                        timeout=0.1,
                    )
            except TimeoutError:
                self.fail("the total request budget did not raise the internal timeout")

        self.assertTrue(hasattr(base, "GeminiRequestTimeoutError"))
        self.assertEqual(
            str(context.exception),
            "Gemini request exceeded the candidate timeout budget",
        )
        self.assertTrue(was_cancelled)

    async def test_json_and_validation_errors_fail_immediately(self) -> None:
        validation_error = ValidationError.from_exception_data(
            "AgentTradeIntentModel",
            [
                {
                    "type": "missing",
                    "loc": ("stockId",),
                    "input": {},
                }
            ],
        )

        for error in (json.JSONDecodeError("invalid JSON", "", 0), validation_error):
            with self.subTest(error=type(error).__name__), patch.object(
                base,
                "run_adk_json_agent",
                new=AsyncMock(side_effect=[error, {"stockId": 1}]),
            ) as run_agent, patch.object(base.asyncio, "sleep", new=AsyncMock()):
                with self.assertRaises(type(error)):
                    await base.run_adk_json_agent_with_retry(object(), "prompt")

            self.assertEqual(run_agent.await_count, 1)

    async def test_non_429_client_errors_fail_immediately(self) -> None:
        client_error = errors.ClientError(400, {"error": "invalid request"})

        with patch.object(
            base,
            "run_adk_json_agent",
            new=AsyncMock(side_effect=[client_error, {"stockId": 1}]),
        ) as run_agent, patch.object(base.asyncio, "sleep", new=AsyncMock()):
            with self.assertRaises(errors.ClientError):
                await base.run_adk_json_agent_with_retry(object(), "prompt")

        self.assertEqual(run_agent.await_count, 1)

    async def test_unclassified_errors_fail_immediately(self) -> None:
        class UnclassifiedGeminiError(Exception):
            pass

        error = UnclassifiedGeminiError("unexpected Gemini error")
        with patch.object(
            base,
            "run_adk_json_agent",
            new=AsyncMock(side_effect=[error, {"stockId": 1}]),
        ) as run_agent, patch.object(base.asyncio, "sleep", new=AsyncMock()):
            with self.assertRaises(UnclassifiedGeminiError):
                await base.run_adk_json_agent_with_retry(object(), "prompt")

        self.assertEqual(run_agent.await_count, 1)


class TradeIntentTimeoutIsolationTests(unittest.IsolatedAsyncioTestCase):
    async def test_parent_cancellation_cancels_active_work_and_never_starts_queued_work(
        self,
    ) -> None:
        config = WorkerConfig(
            google_api_key="key",
            gemini_model="gemini",
            adk_worker_concurrency=1,
            max_candidates_per_run=15,
            backend_order_intent_url="",
        )
        active_started = asyncio.Event()
        release_active_work = asyncio.Event()
        cancelled_stock_ids: set[int] = set()
        queued_stock_ids: set[int] = set()

        async def run_candidate(*, candidate, **_kwargs):
            stock_id = candidate["stockId"]
            if stock_id != 1:
                queued_stock_ids.add(stock_id)
                return AgentTradeIntent(
                    agentUserId=2,
                    agentType="VALUE",
                    decisionSource="ADK",
                    stockId=stock_id,
                    side="HOLD",
                    quantity=0,
                    reason="보류",
                )

            active_started.set()
            try:
                await release_active_work.wait()
            except asyncio.CancelledError:
                cancelled_stock_ids.add(stock_id)
                raise

            return AgentTradeIntent(
                agentUserId=1,
                agentType="VALUE",
                decisionSource="ADK",
                stockId=stock_id,
                side="HOLD",
                quantity=0,
                reason="보류",
            )

        payload = {
            "agents": [
                {
                    "agentType": "VALUE",
                    "candidates": [
                        {"agentUserId": 1, "stockId": 1},
                        {"agentUserId": 2, "stockId": 2},
                    ],
                }
            ]
        }
        with patch.object(trade_intents, "load_config", return_value=config), patch.object(
            trade_intents, "run_agent_for_candidate", new=run_candidate
        ), patch.object(trade_intents, "report_batch_failures"):
            parent_task = asyncio.create_task(
                trade_intents.run_trade_intents_from_payload(payload)
            )
            await asyncio.wait_for(active_started.wait(), timeout=0.1)
            parent_task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await parent_task

        self.assertEqual(cancelled_stock_ids, {1})
        self.assertEqual(queued_stock_ids, set())
        release_active_work.set()
        await asyncio.sleep(0)

    async def test_shared_deadline_preserves_early_success_and_times_out_queued_work(
        self,
    ) -> None:
        successful_intent = AgentTradeIntent(
            agentUserId=1,
            agentType="VALUE",
            decisionSource="ADK",
            stockId=1,
            side="BUY",
            quantity=1,
            reason="매수",
            score=80,
        )
        config = WorkerConfig(
            google_api_key="key",
            gemini_model="gemini",
            adk_worker_concurrency=1,
            max_candidates_per_run=15,
            backend_order_intent_url="",
        )
        cancelled_stock_ids: set[int] = set()

        async def run_candidate(*, candidate, **_kwargs):
            stock_id = candidate["stockId"]
            if stock_id == 1:
                return successful_intent

            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                cancelled_stock_ids.add(stock_id)
                raise

        payload = {
            "agents": [
                {
                    "agentType": "VALUE",
                    "candidates": [
                        {"agentUserId": 1, "stockId": 1},
                        {"agentUserId": 2, "stockId": 2},
                        {"agentUserId": 3, "stockId": 3},
                    ],
                }
            ]
        }
        with patch.object(trade_intents, "GEMINI_TOTAL_TIMEOUT_SECONDS", 0.01, create=True), patch.object(
            trade_intents, "load_config", return_value=config
        ), patch.object(
            trade_intents, "run_agent_for_candidate", new=run_candidate
        ), patch.object(trade_intents, "report_batch_failures"):
            try:
                intents, worker_errors = await asyncio.wait_for(
                    trade_intents.run_trade_intents_from_payload(payload),
                    timeout=0.1,
                )
            except TimeoutError:
                self.fail("the Worker request did not enforce one shared deadline")

        self.assertEqual(intents, [successful_intent])
        self.assertEqual(
            worker_errors,
            [
                {
                    "agentType": "VALUE",
                    "error": "Gemini request exceeded the candidate timeout budget",
                    "stockId": 2,
                },
                {
                    "agentType": "VALUE",
                    "error": "Gemini request exceeded the candidate timeout budget",
                    "stockId": 3,
                },
            ],
        )
        self.assertEqual(cancelled_stock_ids, {2})

    async def test_keeps_a_successful_candidate_when_another_times_out(self) -> None:
        successful_intent = AgentTradeIntent(
            agentUserId=1,
            agentType="VALUE",
            decisionSource="ADK",
            stockId=1,
            side="BUY",
            quantity=1,
            reason="매수",
            score=80,
        )
        timeout_error_type = getattr(base, "GeminiRequestTimeoutError", RuntimeError)
        timeout_error = (
            timeout_error_type()
            if hasattr(base, "GeminiRequestTimeoutError")
            else timeout_error_type("candidate budget exhausted")
        )
        config = WorkerConfig(
            google_api_key="key",
            gemini_model="gemini",
            adk_worker_concurrency=2,
            max_candidates_per_run=15,
            backend_order_intent_url="",
        )

        async def run_candidate(*, candidate, **_kwargs):
            if candidate["stockId"] == 1:
                return successful_intent
            raise timeout_error

        payload = {
            "agents": [
                {
                    "agentType": "VALUE",
                    "candidates": [
                        {"agentUserId": 1, "stockId": 1},
                        {"agentUserId": 2, "stockId": 2},
                    ],
                }
            ]
        }
        with patch.object(trade_intents, "load_config", return_value=config), patch.object(
            trade_intents, "run_agent_for_candidate", new=run_candidate
        ), patch.object(trade_intents, "report_batch_failures"):
            intents, worker_errors = await trade_intents.run_trade_intents_from_payload(payload)

        self.assertEqual(intents, [successful_intent])
        self.assertEqual(
            worker_errors,
            [{"agentType": "VALUE", "stockId": 2, "error": str(timeout_error)}],
        )
