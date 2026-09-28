"""gs343-digest systemd timeout policy helpers (ECHO R&D rnd-26)."""

from __future__ import annotations

from echo_gs343_digest.timeout_policy import (
    DEFAULT_SYSTEMD_TIMEOUT_START_SEC,
    MIN_TIMEOUT_START_SEC,
    TARGET_TIMEOUT_START_SEC,
    TARGET_TIMEOUT_STOP_SEC,
    DigestStartResult,
    evaluate_digest_start,
    load_unit_timeout_start_sec,
    load_unit_timeout_stop_sec,
    parse_timeout_start_sec,
    parse_timeout_stop_sec,
    digest_completes_within_timeout,
)

__all__ = [
    "DEFAULT_SYSTEMD_TIMEOUT_START_SEC",
    "MIN_TIMEOUT_START_SEC",
    "TARGET_TIMEOUT_START_SEC",
    "TARGET_TIMEOUT_STOP_SEC",
    "DigestStartResult",
    "evaluate_digest_start",
    "load_unit_timeout_start_sec",
    "load_unit_timeout_stop_sec",
    "parse_timeout_start_sec",
    "parse_timeout_stop_sec",
    "digest_completes_within_timeout",
]
