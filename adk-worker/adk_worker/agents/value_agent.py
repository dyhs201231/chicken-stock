from __future__ import annotations

from adk_worker.agents.base import run_agent
from adk_worker.schema import AgentTradeIntent, StockCandidate


STRATEGY_INSTRUCTION = """
Prefer stocks with low PER and stable positive growth. Sell only when valuation is high
or recent data suggests the value thesis is weak.
"""


def get_max_quantity(candidate: StockCandidate, side: str, fallback: int) -> int:
    key = "maxBuyQuantity" if side == "BUY" else "maxSellQuantity"
    value = candidate.get(key, fallback)

    return value if isinstance(value, int) and value >= 0 else 0


def decide_value_mock(candidates: list[StockCandidate]) -> AgentTradeIntent:
    selected = min(candidates, key=lambda candidate: candidate["per"] or 999)
    side = "BUY" if (selected["per"] or 999) <= 12 else "SELL"
    quantity = min(10, get_max_quantity(selected, side, 10))
    if quantity <= 0:
        side = "HOLD"
    reason = (
        "PER이 낮아 매수 판단"
        if side == "BUY"
        else "저평가 매력이 약해 매도 판단"
        if side == "SELL"
        else "실행 가능 수량이 없어 보류"
    )
    return AgentTradeIntent(
        agentUserId=selected["agentUserId"],
        agentType="VALUE",
        decisionSource="ADK",
        stockId=selected["stockId"],
        side=side,
        quantity=quantity,
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
