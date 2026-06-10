from __future__ import annotations

import os
from dataclasses import dataclass
from importlib import import_module
from pathlib import Path


WORKER_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE_PATH = WORKER_ROOT / ".env"


def load_env_file() -> None:
    try:
        dotenv = import_module("dotenv")
    except ImportError:
        return

    dotenv.load_dotenv(dotenv_path=ENV_FILE_PATH, override=True)


load_env_file()


@dataclass(frozen=True)
class WorkerConfig:
    google_api_key: str
    gemini_model: str
    adk_worker_concurrency: int
    max_candidates_per_run: int
    backend_order_intent_url: str

    @property
    def can_call_adk(self) -> bool:
        return bool(self.google_api_key)


def load_config() -> WorkerConfig:
    return WorkerConfig(
        google_api_key=os.getenv("GOOGLE_API_KEY", ""),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        adk_worker_concurrency=int(os.getenv("ADK_WORKER_CONCURRENCY", "5")),
        max_candidates_per_run=int(os.getenv("MAX_CANDIDATES_PER_RUN", "15")),
        backend_order_intent_url=os.getenv("BACKEND_ORDER_INTENT_URL", ""),
    )
