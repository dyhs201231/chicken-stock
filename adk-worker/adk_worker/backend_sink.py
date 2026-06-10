from __future__ import annotations

from adk_worker.schema import AgentTradeIntent


async def submit_trade_intents(intents: list[AgentTradeIntent]) -> None:
    """Future bridge to backend order-intent endpoint or shared order handler.

    This worker intentionally does not mutate DB state. When backend trading logic is
    ready, replace this no-op with a call to the agent-specific order entrypoint.
    That entrypoint should reuse the same final validation/execution/persistence
    function used by user-initiated trades.
    """

    _ = intents
