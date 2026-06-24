from __future__ import annotations

import argparse
import asyncio
import json
import sys

from adk_worker.runner import run_worker
from adk_worker.trade_intents import run_trade_intents_from_payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run ADK trade-intent worker.")
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use deterministic mock agents instead of calling Google ADK.",
    )
    parser.add_argument(
        "--stdin",
        action="store_true",
        help="Read backend-selected candidates from stdin and return JSON intents.",
    )
    return parser.parse_args()


async def run_stdin_worker(use_mock: bool):
    payload = json.loads(sys.stdin.read())
    intents, errors = await run_trade_intents_from_payload(payload, use_mock=use_mock)

    for error in errors:
        print(json.dumps(error, ensure_ascii=False), file=sys.stderr)

    return intents


async def async_main() -> None:
    args = parse_args()
    intents = (
        await run_stdin_worker(use_mock=args.mock)
        if args.stdin
        else await run_worker(use_mock=args.mock)
    )
    print(json.dumps([intent.to_json() for intent in intents], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(async_main())
