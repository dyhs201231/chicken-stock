from __future__ import annotations

import asyncio
import json
import re
from collections.abc import Callable

from adk_worker.schema import AgentTradeIntent, AgentTradeIntentModel, AgentType, StockCandidate


SYSTEM_INSTRUCTION = """
You generate trade intent only. Never claim that an order was placed, filled, saved,
or reflected in a balance. Return exactly one JSON object with this shape:
{"agentUserId":1,"agentType":"VALUE","decisionSource":"ADK","stockId":1,"side":"BUY","quantity":10,"reason":"...","score":72}
Use only BUY, SELL, or HOLD. BUY and SELL quantity must be a positive integer. HOLD quantity may be 0.
If maxBuyQuantity is 0, do not return BUY. If maxSellQuantity is 0, do not return SELL.
For BUY quantity must be <= maxBuyQuantity. For SELL quantity must be <= maxSellQuantity.
decisionSource MUST be "ADK". Never return "RULE_BASED".
Keep reason under 80 Korean characters.
"""

GEMINI_RETRY_DELAYS_SECONDS = (3, 10, 25)


def create_adk_agent(agent_type: AgentType, model: str, strategy_instruction: str):
    from google.adk.agents import Agent

    return Agent(
        name=f"{agent_type.lower()}_trade_intent_agent",
        model=model,
        instruction=f"{SYSTEM_INSTRUCTION}\n\nAgent type: {agent_type}\n{strategy_instruction}",
        output_schema=AgentTradeIntentModel,
    )


def build_candidate_prompt(agent_type: AgentType, candidates: list[StockCandidate]) -> str:
    return (
        f"{agent_type} 전략으로 입력 후보 종목의 매매 의도 JSON을 생성하세요.\n"
        "백엔드가 이미 후보를 5~15개로 필터링했고, 이 호출은 단일 후보 판단이라고 가정합니다.\n"
        "agentUserId, agentType, decisionSource, stockId는 입력값과 동일해야 합니다.\n"
        "maxBuyQuantity/maxSellQuantity는 백엔드가 계산한 최대 실행 가능 수량입니다.\n"
        "가능 수량이 0인 방향은 선택하지 말고 HOLD를 고려하세요.\n"
        "입력 데이터:\n"
        f"{json.dumps(candidates, ensure_ascii=False)}"
    )


async def run_adk_json_agent(agent, prompt: str) -> dict:
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types

    app_name = "chicken_stock_adk_worker"
    user_id = "agent-worker"
    session_id = f"{agent.name}-session"
    session_service = InMemorySessionService()
    await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id,
    )
    runner = Runner(agent=agent, app_name=app_name, session_service=session_service)
    message = types.Content(role="user", parts=[types.Part(text=prompt)])

    final_text = ""
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=message,
    ):
        if event.is_final_response() and event.content and event.content.parts:
            final_text = event.content.parts[0].text or ""

    return json.loads(extract_json_object(final_text))


def extract_json_object(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"ADK response did not contain a JSON object: {text}")

    return stripped[start : end + 1]


def parse_trade_intent(raw: dict, expected_agent_type: AgentType) -> AgentTradeIntent:
    if raw.get("agentType") != expected_agent_type:
        raise ValueError(f"Expected agentType {expected_agent_type}, got {raw.get('agentType')}")

    side = raw.get("side")
    if side not in ("BUY", "SELL", "HOLD"):
        raise ValueError(f"Invalid trade side: {side}")

    try:
        quantity = int(raw.get("quantity", 0))
    except (TypeError, ValueError):
        quantity = 0

    if side in ("BUY", "SELL") and quantity <= 0:
        side = "HOLD"
        quantity = 0
    if side == "HOLD" and quantity < 0:
        quantity = 0

    reason = str(raw.get("reason", "")).strip()
    if not reason:
        reason = "실행 가능한 매매 판단이 없어 보류"

    return AgentTradeIntent(
        agentUserId=int(raw["agentUserId"]),
        agentType=expected_agent_type,
        decisionSource="ADK",
        stockId=int(raw["stockId"]),
        side=side,
        quantity=quantity,
        reason=reason,
        score=float(raw["score"]) if raw.get("score") is not None else None,
    )


async def run_adk_json_agent_with_retry(agent, prompt: str) -> dict:
    last_error: Exception | None = None

    for attempt in range(len(GEMINI_RETRY_DELAYS_SECONDS) + 1):
        try:
            return await run_adk_json_agent(agent, prompt)
        except Exception as error:
            last_error = error

            if attempt >= len(GEMINI_RETRY_DELAYS_SECONDS):
                break

            await asyncio.sleep(GEMINI_RETRY_DELAYS_SECONDS[attempt])

    if last_error:
        raise last_error

    raise RuntimeError("ADK retry loop ended without a response")


async def run_agent(
    *,
    agent_type: AgentType,
    model: str,
    candidates: list[StockCandidate],
    strategy_instruction: str,
    mock_decider: Callable[[list[StockCandidate]], AgentTradeIntent],
    use_mock: bool,
) -> AgentTradeIntent:
    if use_mock:
        return mock_decider(candidates)

    agent = create_adk_agent(agent_type, model, strategy_instruction)
    raw_intent = await run_adk_json_agent_with_retry(
        agent,
        build_candidate_prompt(agent_type, candidates),
    )
    return parse_trade_intent(raw_intent, agent_type)
