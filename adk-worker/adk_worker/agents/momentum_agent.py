from __future__ import annotations

from adk_worker.agents.base import run_agent
from adk_worker.schema import AgentTradeIntent, StockCandidate


STRATEGY_INSTRUCTION = """
Prefer stocks with strong recent price momentum and sufficient trading volume. Sell only
when recent momentum is negative or volume support is weak.
"""


def get_max_quantity(candidate: StockCandidate, side: str, fallback: int) -> int:
    key = "maxBuyQuantity" if side == "BUY" else "maxSellQuantity"
    value = candidate.get(key, fallback)

    return value if isinstance(value, int) and value >= 0 else 0


def decide_momentum_mock(candidates: list[StockCandidate]) -> AgentTradeIntent:
    selected = max(candidates, key=lambda candidate: candidate["priceChangeRate20d"] or -1)
    change_rate = selected["priceChangeRate20d"] or 0
    side = "BUY" if change_rate >= 10 else "SELL"
    quantity = min(5, get_max_quantity(selected, side, 5))
    if quantity <= 0:
        side = "HOLD"
    reason = (
        "20일 상승 모멘텀이 강해 매수 판단"
        if side == "BUY"
        else "상승 모멘텀이 약해 매도 판단"
        if side == "SELL"
        else "실행 가능 수량이 없어 보류"
    )
    return AgentTradeIntent(
        agentUserId=selected["agentUserId"],
        agentType="MOMENTUM",
        decisionSource="ADK",
        stockId=selected["stockId"],
        side=side,
        quantity=quantity,
        reason=reason,
        score=selected.get("ruleBasedScore"),
    )


async def run_momentum_agent(
    *,
    model: str,
    candidates: list[StockCandidate],
    use_mock: bool,
) -> AgentTradeIntent:
    return await run_agent(
        agent_type="MOMENTUM",
        model=model,
        candidates=candidates,
        strategy_instruction=STRATEGY_INSTRUCTION,
        mock_decider=decide_momentum_mock,
        use_mock=use_mock,
    )
