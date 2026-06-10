from __future__ import annotations

from adk_worker.agents.base import run_agent
from adk_worker.schema import AgentTradeIntent, StockCandidate


STRATEGY_INSTRUCTION = """
Prefer stocks with strong revenue growth and acceptable valuation. Sell only when growth
is negative or valuation appears excessive relative to the given data.
"""


def decide_growth_mock(candidates: list[StockCandidate]) -> AgentTradeIntent:
    selected = max(candidates, key=lambda candidate: candidate["revenueGrowthRate"] or -1)
    growth_rate = selected["revenueGrowthRate"] or 0
    side = "BUY" if growth_rate >= 20 else "SELL"
    reason = "매출 성장률이 높아 매수 판단" if side == "BUY" else "성장성이 약해 매도 판단"
    return AgentTradeIntent(
        agentUserId=selected["agentUserId"],
        agentType="GROWTH",
        decisionSource="ADK",
        stockId=selected["stockId"],
        side=side,
        quantity=8,
        reason=reason,
        score=selected.get("ruleBasedScore"),
    )


async def run_growth_agent(
    *,
    model: str,
    candidates: list[StockCandidate],
    use_mock: bool,
) -> AgentTradeIntent:
    return await run_agent(
        agent_type="GROWTH",
        model=model,
        candidates=candidates,
        strategy_instruction=STRATEGY_INSTRUCTION,
        mock_decider=decide_growth_mock,
        use_mock=use_mock,
    )
