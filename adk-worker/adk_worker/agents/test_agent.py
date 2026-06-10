from __future__ import annotations

import json

from adk_worker.agents.base import parse_trade_intent, run_adk_json_agent
from adk_worker.schema import AgentTradeIntent, AgentTradeIntentModel, TestStockInput


TEST_AGENT_INSTRUCTION = """
You are TEST_AGENT for verifying Google ADK and Gemini connectivity.

Your only job is to create one AgentTradeIntent JSON object from a small stock input.
Do not save to DB. Do not create orders. Do not execute trades. Do not update balances.

Input example:
{"stockId":1,"per":7.2,"pbr":0.8}

Decision rule for this test:
- If PER is low, return BUY.
- Otherwise return SELL.

Return exactly one JSON object matching this TypeScript-compatible shape:
{"agentType":"VALUE","stockId":1,"side":"BUY","quantity":10,"reason":"PER이 낮아 매수 판단"}
"""


def create_test_agent(model: str):
    from google.adk.agents import Agent

    return Agent(
        name="test_trade_intent_agent",
        model=model,
        instruction=TEST_AGENT_INSTRUCTION,
        output_schema=AgentTradeIntentModel,
    )


def build_test_prompt(stock: TestStockInput) -> str:
    return (
        "아래 mock 종목 데이터를 보고 AgentTradeIntent JSON만 반환하세요.\n"
        f"{json.dumps(stock.model_dump(), ensure_ascii=False)}"
    )


async def run_test_agent(*, model: str, stock: TestStockInput) -> AgentTradeIntent:
    agent = create_test_agent(model)
    raw_intent = await run_adk_json_agent(agent, build_test_prompt(stock))
    return parse_trade_intent(raw_intent, "VALUE")
