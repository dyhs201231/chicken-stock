from __future__ import annotations

import argparse
import asyncio
import json
import sys

from adk_worker.agents import run_growth_agent, run_momentum_agent, run_value_agent
from adk_worker.config import load_config
from adk_worker.runner import run_worker
from adk_worker.schema import AgentTradeIntent, AgentType, StockCandidate


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run ADK trade-intent worker.")
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use deterministic mock agents instead of calling Google ADK.",
    )
    parser.add_argument(
        "--stdin",
        action="store_true",
        help="Read backend-selected candidates from stdin and return JSON intents.",
    )
    return parser.parse_args()


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


def parse_stdin_payload() -> list[tuple[AgentType, StockCandidate]]:
    payload = json.loads(sys.stdin.read())
    pairs: list[tuple[AgentType, StockCandidate]] = []

    for agent_group in payload.get("agents", []):
        agent_type = agent_group["agentType"]

        if agent_type not in ("VALUE", "GROWTH", "MOMENTUM"):
            raise ValueError(f"Invalid agentType: {agent_type}")

        for candidate in agent_group.get("candidates", []):
            pairs.append((agent_type, candidate))

    return pairs


async def run_stdin_worker(use_mock: bool) -> list[AgentTradeIntent]:
    config = load_config()
    should_mock = use_mock or not config.can_call_adk
    pairs = parse_stdin_payload()
    concurrency = max(1, min(config.adk_worker_concurrency, len(pairs) or 1))
    semaphore = asyncio.Semaphore(concurrency)

    async def run_pair(agent_type: AgentType, candidate: StockCandidate) -> AgentTradeIntent | None:
        async with semaphore:
            try:
                return await run_agent_for_candidate(
                    agent_type=agent_type,
                    candidate=candidate,
                    model=config.gemini_model,
                    use_mock=should_mock,
                )
            except Exception as error:
                print(
                    json.dumps(
                        {
                            "agentType": agent_type,
                            "error": str(error),
                            "stockId": candidate.get("stockId"),
                        },
                        ensure_ascii=False,
                    ),
                    file=sys.stderr,
                )
                return None

    results = await asyncio.gather(
        *[
            run_pair(
                agent_type=agent_type,
                candidate=candidate,
            )
            for agent_type, candidate in pairs
        ]
    )

    return [result for result in results if result is not None]


async def async_main() -> None:
    args = parse_args()
    intents = (
        await run_stdin_worker(use_mock=args.mock)
        if args.stdin
        else await run_worker(use_mock=args.mock)
    )
    print(json.dumps([intent.to_json() for intent in intents], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(async_main())
