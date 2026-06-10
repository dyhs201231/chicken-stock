from __future__ import annotations

import asyncio

from adk_worker.agents import run_growth_agent, run_momentum_agent, run_value_agent
from adk_worker.backend_sink import submit_trade_intents
from adk_worker.config import load_config
from adk_worker.mock_data import MOCK_CANDIDATES
from adk_worker.schema import AgentTradeIntent, StockCandidate


def load_rule_based_candidates(limit: int) -> list[StockCandidate]:
    """Placeholder for backend-selected candidates.

    The production version should call a backend rule-based filter that returns
    5~15 concise candidates. The LLM should not scan the full stock universe.
    """

    return MOCK_CANDIDATES[:limit]


async def run_worker(use_mock: bool = False) -> list[AgentTradeIntent]:
    config = load_config()
    candidates = load_rule_based_candidates(config.max_candidates_per_run)
    should_mock = use_mock or not config.can_call_adk

    intents = await asyncio.gather(
        run_value_agent(model=config.gemini_model, candidates=candidates, use_mock=should_mock),
        run_growth_agent(model=config.gemini_model, candidates=candidates, use_mock=should_mock),
        run_momentum_agent(model=config.gemini_model, candidates=candidates, use_mock=should_mock),
    )

    await submit_trade_intents(list(intents))
    return list(intents)
