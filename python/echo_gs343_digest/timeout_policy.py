"""TimeoutStartSec / TimeoutStopSec policy for gs343-digest.service (rnd-26).

Models systemd oneshot start budgeting without touching live units. Used by
unit/integration tests and the CertForge rnd journey. Stdlib-first so the
offline CertForge sandbox (no third-party packages) can import it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

try:
    from loguru import logger as _raw_logger

    class _CompatLogger:
        """%-format bridge so the same call sites work under loguru or stdlib."""

        def debug(self, msg: str, *args: object) -> None:
            _raw_logger.debug(msg % args if args else msg)

        def info(self, msg: str, *args: object) -> None:
            _raw_logger.info(msg % args if args else msg)

        def warning(self, msg: str, *args: object) -> None:
            _raw_logger.warning(msg % args if args else msg)

    logger = _CompatLogger()
except ImportError:  # CertForge / minimal sandboxes
    import logging

    logger = logging.getLogger("echo_gs343_digest.timeout_policy")
    if not logger.handlers:
        _handler = logging.StreamHandler()
        _handler.setFormatter(logging.Formatter("%(levelname)s %(message)s"))
        logger.addHandler(_handler)
        logger.setLevel(logging.INFO)

# systemd default when TimeoutStartSec is unset (DefaultTimeoutStartSec=90s
# on typical Debian/Ubuntu fleet images).
DEFAULT_SYSTEMD_TIMEOUT_START_SEC = 90

# Minimum accepted by the rnd-26 contract (assert TimeoutStartSec >= 60).
MIN_TIMEOUT_START_SEC = 60

# ECHO R&D proposal #26 targets: digest + Telegram delivery under load.
TARGET_TIMEOUT_START_SEC = 120
TARGET_TIMEOUT_STOP_SEC = 30

UNIT_REL_PATH = Path("systemd/gs343-digest.service")
DROPIN_REL_PATH = Path("systemd/gs343-digest.service.d/10-timeout.conf")

_TIMEOUT_START_RE = re.compile(
    r"(?im)^\s*TimeoutStartSec\s*=\s*([0-9]+)\s*(?:s)?\s*$"
)
_TIMEOUT_STOP_RE = re.compile(
    r"(?im)^\s*TimeoutStopSec\s*=\s*([0-9]+)\s*(?:s)?\s*$"
)


def parse_timeout_start_sec(unit_text: str) -> Optional[int]:
    """Return the last TimeoutStartSec integer in a unit/drop-in body, if any."""
    matches = _TIMEOUT_START_RE.findall(unit_text)
    if not matches:
        return None
    return int(matches[-1])


def parse_timeout_stop_sec(unit_text: str) -> Optional[int]:
    """Return the last TimeoutStopSec integer in a unit/drop-in body, if any."""
    matches = _TIMEOUT_STOP_RE.findall(unit_text)
    if not matches:
        return None
    return int(matches[-1])


def _load_effective_timeout(
    repo_root: Path,
    parser,
    *,
    label: str,
    default: Optional[int],
) -> Optional[int]:
    """Load effective timeout from versioned unit + drop-in (drop-in wins)."""
    root = Path(repo_root)
    base = root / UNIT_REL_PATH
    dropin = root / DROPIN_REL_PATH

    effective: Optional[int] = None
    if base.is_file():
        effective = parser(base.read_text(encoding="utf-8"))
        logger.debug("base unit %s=%r from %s", label, effective, base)
    if dropin.is_file():
        dropin_val = parser(dropin.read_text(encoding="utf-8"))
        if dropin_val is not None:
            effective = dropin_val
            logger.debug("drop-in %s=%s from %s", label, effective, dropin)

    if effective is None:
        logger.warning(
            "%s unset in versioned unit files; using default %s",
            label,
            default,
        )
        return default
    return effective


def load_unit_timeout_start_sec(repo_root: Path) -> int:
    """Load effective TimeoutStartSec from the versioned unit + drop-in."""
    value = _load_effective_timeout(
        repo_root,
        parse_timeout_start_sec,
        label="TimeoutStartSec",
        default=DEFAULT_SYSTEMD_TIMEOUT_START_SEC,
    )
    assert value is not None
    return value


def load_unit_timeout_stop_sec(repo_root: Path) -> Optional[int]:
    """Load effective TimeoutStopSec from the versioned unit + drop-in."""
    return _load_effective_timeout(
        repo_root,
        parse_timeout_stop_sec,
        label="TimeoutStopSec",
        default=None,
    )


def digest_completes_within_timeout(
    digest_duration_sec: float,
    timeout_start_sec: float,
) -> bool:
    """True when a oneshot digest finishes before systemd would SIGTERM it."""
    if digest_duration_sec < 0:
        raise ValueError("digest_duration_sec must be >= 0")
    if timeout_start_sec <= 0:
        raise ValueError("timeout_start_sec must be > 0")
    return float(digest_duration_sec) <= float(timeout_start_sec)


@dataclass(frozen=True)
class DigestStartResult:
    """Simulated systemd oneshot start outcome for gs343-digest."""

    ok: bool
    result: str  # "success" | "timeout"
    digest_duration_sec: float
    timeout_start_sec: float
    exit_signal: Optional[str]
    exit_code: Optional[int]

    def as_dict(self) -> dict:
        return {
            "ok": self.ok,
            "result": self.result,
            "digest_duration_sec": self.digest_duration_sec,
            "timeout_start_sec": self.timeout_start_sec,
            "exit_signal": self.exit_signal,
            "exit_code": self.exit_code,
            "unit_active": 1 if self.ok else 0,
        }


def evaluate_digest_start(
    digest_duration_sec: float,
    timeout_start_sec: float,
) -> DigestStartResult:
    """Simulate whether systemd would mark the oneshot as success or timeout.

    Mirrors the failure mode that motivated rnd-26: result=timeout, exit=15
    (SIGTERM) when wall time exceeds TimeoutStartSec.
    """
    completes = digest_completes_within_timeout(
        digest_duration_sec, timeout_start_sec
    )
    if completes:
        logger.info(
            "digest start ok duration=%ss timeout=%ss",
            digest_duration_sec,
            timeout_start_sec,
        )
        return DigestStartResult(
            ok=True,
            result="success",
            digest_duration_sec=float(digest_duration_sec),
            timeout_start_sec=float(timeout_start_sec),
            exit_signal=None,
            exit_code=0,
        )
    logger.warning(
        "digest start timeout duration=%ss timeout=%ss -> SIGTERM/exit=15",
        digest_duration_sec,
        timeout_start_sec,
    )
    return DigestStartResult(
        ok=False,
        result="timeout",
        digest_duration_sec=float(digest_duration_sec),
        timeout_start_sec=float(timeout_start_sec),
        exit_signal="SIGTERM",
        exit_code=15,
    )
