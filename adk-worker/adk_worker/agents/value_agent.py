from __future__ import annotations

from adk_worker.agents.base import run_agent
from adk_worker.schema import AgentTradeIntent, StockCandidate


STRATEGY_INSTRUCTION = """
Prefer stocks with low PER and stable positive growth. Sell only when valuation is high
or recent data suggests the value thesis is weak.
"""


def decide_value_mock(candidates: list[StockCandidate]) -> AgentTradeIntent:
    selected = min(candidates, key=lambda candidate: candidate["per"] or 999)
    side = "BUY" if (selected["per"] or 999) <= 12 else "SELL"
    reason = "PER이 낮아 매수 판단" if side == "BUY" else "저평가 매력이 약해 매도 판단"
    return AgentTradeIntent(
        agentUserId=selected["agentUserId"],
        agentType="VALUE",
        decisionSource="ADK",
        stockId=selected["stockId"],
        side=side,
        quantity=10,
        reason=reason,
        score=selected.get("ruleBasedScore"),
    )


async def run_value_agent(
    *,
    model: str,
    candidates: list[StockCandidate],
    use_mock: bool,
) -> AgentTradeIntent:
    return await run_agent(
        agent_type="VALUE",
        model=model,
        candidates=candidates,
        strategy_instruction=STRATEGY_INSTRUCTION,
        mock_decider=decide_value_mock,
        use_mock=use_mock,
    )
