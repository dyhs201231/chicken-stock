from __future__ import annotations

import asyncio
from typing import Any

from adk_worker.agents import run_growth_agent, run_momentum_agent, run_value_agent
from adk_worker.agents.base import GEMINI_TOTAL_TIMEOUT_SECONDS, GeminiRequestTimeoutError
from adk_worker.config import load_config
from adk_worker.monitoring import WorkerFailure, report_batch_failures
from adk_worker.schema import AgentTradeIntent, AgentType, StockCandidate


async def run_agent_for_candidate(
    *,
    agent_type: AgentType,
    candidate: StockCandidate,
    model: str,
    use_mock: bool,
) -> AgentTradeIntent:
    if agent_type == "VALUE":
        return await run_value_agent(
            candidates=[candidate],
            model=model,
            use_mock=use_mock,
        )

    if agent_type == "GROWTH":
        return await run_growth_agent(
            candidates=[candidate],
            model=model,
            use_mock=use_mock,
        )

    return await run_momentum_agent(
        candidates=[candidate],
        model=model,
        use_mock=use_mock,
    )


def parse_trade_intent_payload(
    payload: dict[str, Any],
) -> list[tuple[AgentType, StockCandidate]]:
    pairs: list[tuple[AgentType, StockCandidate]] = []

    for agent_group in payload.get("agents", []):
        agent_type = agent_group["agentType"]

        if agent_type not in ("VALUE", "GROWTH", "MOMENTUM"):
            raise ValueError(f"Invalid agentType: {agent_type}")

        for candidate in agent_group.get("candidates", []):
            pairs.append((agent_type, candidate))

    return pairs


async def run_trade_intents_from_payload(
    payload: dict[str, Any],
    *,
    use_mock: bool = False,
) -> tuple[list[AgentTradeIntent], list[dict[str, Any]]]:
    config = load_config()
    should_mock = use_mock or not config.can_call_adk
    pairs = parse_trade_intent_payload(payload)
    concurrency = max(1, min(config.adk_worker_concurrency, len(pairs) or 1))
    semaphore = asyncio.Semaphore(concurrency)

    def failure_result(
        agent_type: AgentType,
        candidate: StockCandidate,
        error: Exception,
    ) -> tuple[
        AgentTradeIntent | None,
        dict[str, Any] | None,
        WorkerFailure | None,
    ]:
        return (
            None,
            {
                "agentType": agent_type,
                "error": str(error),
                "stockId": candidate.get("stockId"),
            },
            WorkerFailure(agent_type=agent_type, error=error),
        )

    async def run_pair(
        agent_type: AgentType,
        candidate: StockCandidate,
    ) -> tuple[
        AgentTradeIntent | None,
        dict[str, Any] | None,
        WorkerFailure | None,
    ]:
        async with semaphore:
            try:
                intent = await run_agent_for_candidate(
                    agent_type=agent_type,
                    candidate=candidate,
                    model=config.gemini_model,
                    use_mock=should_mock,
                )

                return intent, None, None
            except Exception as error:
                return failure_result(agent_type, candidate, error)

    tasks = [
        asyncio.create_task(
            run_pair(
                agent_type=agent_type,
                candidate=candidate,
            )
        )
        for agent_type, candidate in pairs
    ]

    async def cancel_unfinished_tasks() -> None:
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    try:
        completed_tasks, unfinished_tasks = await asyncio.wait(
            tasks,
            timeout=GEMINI_TOTAL_TIMEOUT_SECONDS,
        ) if tasks else (set(), set())

        if unfinished_tasks:
            await cancel_unfinished_tasks()

        results = [
            task.result()
            if task in completed_tasks
            else failure_result(agent_type, candidate, GeminiRequestTimeoutError())
            for task, (agent_type, candidate) in zip(tasks, pairs, strict=True)
        ]
    except BaseException:
        await cancel_unfinished_tasks()
        raise
    intents = [intent for intent, _, _ in results if intent is not None]
    errors = [error for _, error, _ in results if error is not None]
    failures = [failure for _, _, failure in results if failure is not None]

    try:
        report_batch_failures(failures)
    except Exception:
        # Monitoring must never change the Worker HTTP response contract.
        pass

    return intents, errors
