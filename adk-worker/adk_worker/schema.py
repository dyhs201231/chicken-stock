from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, TypedDict

from pydantic import BaseModel


AgentType = Literal["VALUE", "GROWTH", "MOMENTUM"]
DecisionSource = Literal["ADK", "RULE_BASED"]
TradeSide = Literal["BUY", "SELL", "HOLD"]


class StockCandidate(TypedDict):
    agentUserId: int
    stockId: int
    symbol: str
    name: str
    price: float
    per: float | None
    pbr: float | None
    epsGrowthRate: float | None
    revenueGrowthRate: float | None
    operatingProfitGrowthRate: float | None
    ma20: float | None
    ma60: float | None
    rsi: float | None
    volumeRatio: float | None
    priceChangeRate20d: float | None
    averageVolume20d: float | None
    ruleBasedScore: float | None


class TestStockInput(BaseModel):
    stockId: int
    per: float
    pbr: float


class AgentTradeIntentModel(BaseModel):
    agentUserId: int
    agentType: AgentType
    decisionSource: DecisionSource
    stockId: int
    side: TradeSide
    quantity: int
    reason: str
    score: float | None = None


@dataclass(frozen=True)
class AgentTradeIntent:
    agentUserId: int
    agentType: AgentType
    decisionSource: DecisionSource
    stockId: int
    side: TradeSide
    quantity: int
    reason: str
    score: float | None = None

    @classmethod
    def from_model(cls, intent: AgentTradeIntentModel) -> "AgentTradeIntent":
        return cls(
            agentUserId=intent.agentUserId,
            agentType=intent.agentType,
            decisionSource=intent.decisionSource,
            stockId=intent.stockId,
            side=intent.side,
            quantity=intent.quantity,
            reason=intent.reason,
            score=intent.score,
        )

    def to_json(self) -> dict[str, str | int | float | None]:
        return {
            "agentUserId": self.agentUserId,
            "agentType": self.agentType,
            "decisionSource": self.decisionSource,
            "stockId": self.stockId,
            "side": self.side,
            "quantity": self.quantity,
            "reason": self.reason,
            "score": self.score,
        }
