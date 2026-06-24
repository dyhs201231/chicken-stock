from __future__ import annotations

import os
import time
from typing import Any

from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

from adk_worker.config import load_config
from adk_worker.trade_intents import run_trade_intents_from_payload


class AgentCandidateGroup(BaseModel):
    agentType: str
    candidates: list[dict[str, Any]] = Field(default_factory=list)


class TradeIntentRequest(BaseModel):
    agents: list[AgentCandidateGroup] = Field(default_factory=list)
    useMock: bool = False


app = FastAPI(title="Chicken Stock ADK Worker")


def verify_authorization(authorization: str | None) -> None:
    token = os.getenv("ADK_WORKER_TOKEN")

    if not token:
        return

    if authorization != f"Bearer {token}":
        raise HTTPException(
            detail="Unauthorized",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


@app.get("/health")
async def health() -> dict[str, Any]:
    config = load_config()

    return {
        "canCallAdk": config.can_call_adk,
        "ok": True,
        "worker": "adk",
    }


@app.post("/run-trade-intents")
async def run_trade_intents(
    request: TradeIntentRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    verify_authorization(authorization)

    started_at = time.perf_counter()
    payload = {
        "agents": [
            {
                "agentType": agent.agentType,
                "candidates": agent.candidates,
            }
            for agent in request.agents
        ],
    }
    intents, errors = await run_trade_intents_from_payload(
        payload,
        use_mock=request.useMock,
    )

    return {
        "data": [intent.to_json() for intent in intents],
        "errors": errors,
        "ok": True,
        "tookMs": round((time.perf_counter() - started_at) * 1000),
    }
