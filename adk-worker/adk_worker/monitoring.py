from __future__ import annotations

import os
import random
from dataclasses import dataclass
from typing import Any, Sequence

import sentry_sdk

from adk_worker.schema import AgentType


@dataclass(frozen=True)
class WorkerFailure:
    agent_type: AgentType
    error: Exception


def sanitize_sentry_event(
    event: dict[str, Any],
    _hint: dict[str, Any],
) -> dict[str, Any]:
    sanitized = dict(event)

    sanitized.pop("breadcrumbs", None)
    sanitized.pop("extra", None)
    sanitized.pop("request", None)
    sanitized.pop("user", None)

    return sanitized


def init_sentry() -> None:
    dsn = os.getenv("SENTRY_DSN")
    environment = os.getenv("SENTRY_ENVIRONMENT")
    enabled = (
        os.getenv("SENTRY_ENABLED") == "true"
        and environment == "production"
        and bool(dsn)
    )

    if not enabled:
        return

    sentry_sdk.init(
        before_breadcrumb=lambda _breadcrumb, _hint: None,
        before_send=sanitize_sentry_event,
        dsn=dsn,
        enable_logs=False,
        environment=environment,
        include_local_variables=False,
        max_request_body_size="never",
        profiles_sample_rate=0,
        release=os.getenv("K_REVISION") or None,
        sample_rate=1.0,
        send_default_pii=False,
        traces_sample_rate=0.05,
    )


def report_batch_failures(failures: Sequence[WorkerFailure]) -> None:
    if not failures or random.random() >= 0.1:
        return

    agent_types = ",".join(sorted({failure.agent_type for failure in failures}))

    with sentry_sdk.new_scope() as scope:
        scope.clear_breadcrumbs()
        scope.set_tag("agent_types", agent_types)
        scope.set_tag("component", "adk-worker")
        scope.set_tag("failure_count", str(len(failures)))
        scope.set_tag("kind", "partial-failure")
        sentry_sdk.capture_exception(failures[0].error)
