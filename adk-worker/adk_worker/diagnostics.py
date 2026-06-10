from __future__ import annotations

import hashlib
import os
import sys
from collections.abc import Mapping
from importlib import import_module

from adk_worker.config import ENV_FILE_PATH, WorkerConfig


PROJECT_ENV_KEYS = (
    "GOOGLE_CLOUD_PROJECT",
    "GOOGLE_PROJECT_ID",
    "GCLOUD_PROJECT",
)


def _load_dotenv_values() -> Mapping[str, str | None]:
    try:
        dotenv = import_module("dotenv")
    except ImportError:
        return {}

    if not ENV_FILE_PATH.exists():
        return {}

    return dotenv.dotenv_values(ENV_FILE_PATH)


def _fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]


def describe_runtime_config(config: WorkerConfig) -> list[str]:
    dotenv_values = _load_dotenv_values()
    env_file_key = dotenv_values.get("GOOGLE_API_KEY")
    process_key = os.environ.get("GOOGLE_API_KEY")
    key_source = "missing"

    if env_file_key and process_key == env_file_key:
        key_source = str(ENV_FILE_PATH)
    elif process_key:
        key_source = "process environment"

    lines = [
        "ADK Worker runtime diagnostics:",
        f"- env file: {ENV_FILE_PATH} ({'found' if ENV_FILE_PATH.exists() else 'missing'})",
        f"- GEMINI_MODEL: {config.gemini_model}",
        f"- GOOGLE_API_KEY present: {'yes' if config.google_api_key else 'no'}",
        f"- GOOGLE_API_KEY source: {key_source}",
    ]

    if config.google_api_key:
        lines.append(f"- GOOGLE_API_KEY fingerprint: sha256:{_fingerprint(config.google_api_key)}")
        lines.append(f"- GOOGLE_API_KEY length: {len(config.google_api_key)}")

    if env_file_key and process_key and env_file_key != process_key:
        lines.append("- warning: process GOOGLE_API_KEY differs from adk-worker/.env")

    for key in PROJECT_ENV_KEYS:
        value = os.environ.get(key)
        lines.append(f"- {key}: {value or '(not set)'}")

    vertex_flag = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI")
    lines.append(f"- GOOGLE_GENAI_USE_VERTEXAI: {vertex_flag or '(not set)'}")
    lines.append("- Project ID from API key: not available; Google API keys do not expose project id locally.")
    lines.append("- Billing status from API key: not available; check AI Studio project billing or use gcloud with an authenticated project.")

    return lines


def log_runtime_config(config: WorkerConfig) -> None:
    print("\n".join(describe_runtime_config(config)), file=sys.stderr)
