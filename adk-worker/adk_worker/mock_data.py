from __future__ import annotations

from adk_worker.schema import StockCandidate


def create_mock_candidate(
    *,
    agent_user_id: int,
    name: str,
    per: float,
    price_change_rate_20d: float,
    revenue_growth_rate: float,
    rule_based_score: float,
    stock_id: int,
    symbol: str,
) -> StockCandidate:
    return {
        "agentUserId": agent_user_id,
        "averageVolume20d": 120000.0,
        "epsGrowthRate": None,
        "ma20": None,
        "ma60": None,
        "name": name,
        "operatingProfitGrowthRate": None,
        "pbr": 1.2,
        "per": per,
        "price": 42000.0,
        "priceChangeRate20d": price_change_rate_20d,
        "revenueGrowthRate": revenue_growth_rate,
        "rsi": None,
        "ruleBasedScore": rule_based_score,
        "stockId": stock_id,
        "symbol": symbol,
        "volumeRatio": None,
    }


MOCK_CANDIDATES: list[StockCandidate] = [
    create_mock_candidate(
        agent_user_id=1,
        name="Chicken Stock Holdings",
        per=8.2,
        price_change_rate_20d=3.0,
        revenue_growth_rate=8.0,
        rule_based_score=76.0,
        stock_id=1,
        symbol="CHKN",
    ),
    create_mock_candidate(
        agent_user_id=2,
        name="Eggs Bio",
        per=31.4,
        price_change_rate_20d=11.0,
        revenue_growth_rate=34.0,
        rule_based_score=82.0,
        stock_id=2,
        symbol="EGGS",
    ),
    create_mock_candidate(
        agent_user_id=3,
        name="Feed Logistics",
        per=14.6,
        price_change_rate_20d=19.0,
        revenue_growth_rate=12.0,
        rule_based_score=71.0,
        stock_id=3,
        symbol="FEED",
    ),
]
