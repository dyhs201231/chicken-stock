from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path


WORKER_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(WORKER_ROOT))

from adk_worker.agents.test_agent import run_test_agent
from adk_worker.backend_sink import submit_trade_intents
from adk_worker.config import load_config
from adk_worker.diagnostics import log_runtime_config
from adk_worker.schema import TestStockInput


mock_stock = TestStockInput(
    stockId=1,
    per=7.2,
    pbr=0.8,
)


async def main() -> None:
    config = load_config()
    log_runtime_config(config)

    try:
        intent = await run_test_agent(model=config.gemini_model, stock=mock_stock)
    except Exception as error:
        print(
            "TEST_AGENT Gemini 호출에 실패했습니다.\n"
            f"- model: {config.gemini_model}\n"
            f"- error: {error}",
            file=sys.stderr,
        )
        raise SystemExit(1) from error

    await submit_trade_intents([intent])
    print(json.dumps(intent.to_json(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
