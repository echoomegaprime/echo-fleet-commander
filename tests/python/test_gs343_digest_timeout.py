"""Tests for gs343-digest.service TimeoutStartSec (ECHO R&D rnd-26).

Stdlib unittest only — importable in the CertForge offline sandbox (no pytest,
no third-party deps, 90s wall). Slow digests are *simulated* (no real sleep) so
a mocked overrun stays well under the sandbox budget.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = REPO_ROOT / "python"
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from echo_gs343_digest.timeout_policy import (  # noqa: E402
    DEFAULT_SYSTEMD_TIMEOUT_START_SEC,
    DROPIN_REL_PATH,
    MIN_TIMEOUT_START_SEC,
    TARGET_TIMEOUT_START_SEC,
    TARGET_TIMEOUT_STOP_SEC,
    UNIT_REL_PATH,
    digest_completes_within_timeout,
    evaluate_digest_start,
    load_unit_timeout_start_sec,
    load_unit_timeout_stop_sec,
    parse_timeout_start_sec,
    parse_timeout_stop_sec,
)


class TestParseTimeoutStartSec(unittest.TestCase):
    """Unit: parse gs343-digest.service and assert TimeoutStartSec >= 60."""

    def test_parses_integer_seconds(self) -> None:
        text = "[Service]\nTimeoutStartSec=120\nTimeoutStopSec=30\n"
        self.assertEqual(parse_timeout_start_sec(text), 120)

    def test_last_declaration_wins(self) -> None:
        text = "TimeoutStartSec=90\nTimeoutStartSec=120\n"
        self.assertEqual(parse_timeout_start_sec(text), 120)

    def test_missing_returns_none(self) -> None:
        self.assertIsNone(parse_timeout_start_sec("[Service]\nType=oneshot\n"))

    def test_versioned_unit_timeout_start_sec_ge_60(self) -> None:
        unit_path = REPO_ROOT / UNIT_REL_PATH
        self.assertTrue(unit_path.is_file(), f"missing {unit_path}")
        value = parse_timeout_start_sec(unit_path.read_text(encoding="utf-8"))
        self.assertIsNotNone(value)
        assert value is not None
        self.assertGreaterEqual(value, MIN_TIMEOUT_START_SEC)
        self.assertEqual(value, TARGET_TIMEOUT_START_SEC)


class TestParseTimeoutStopSec(unittest.TestCase):
    def test_parses_stop_timeout(self) -> None:
        text = "[Service]\nTimeoutStopSec=30\n"
        self.assertEqual(parse_timeout_stop_sec(text), 30)

    def test_versioned_unit_declares_timeout_stop_30(self) -> None:
        unit_path = REPO_ROOT / UNIT_REL_PATH
        value = parse_timeout_stop_sec(unit_path.read_text(encoding="utf-8"))
        self.assertEqual(value, TARGET_TIMEOUT_STOP_SEC)


class TestSandboxActiveWithinBudget(unittest.TestCase):
    """Integration: sandbox start reaches active (unit_active=1) within 120s."""

    def test_sandbox_digest_reaches_active_within_120s(self) -> None:
        # Simulated wall time — do NOT sleep; CertForge budget is 90s.
        mocked_digest_duration_sec = 95.0  # exceeds old ~90s default, fits 120
        timeout = load_unit_timeout_start_sec(REPO_ROOT)
        self.assertEqual(timeout, TARGET_TIMEOUT_START_SEC)
        self.assertLessEqual(mocked_digest_duration_sec, 120.0)
        outcome = evaluate_digest_start(mocked_digest_duration_sec, timeout)
        self.assertTrue(outcome.ok)
        self.assertEqual(outcome.result, "success")
        self.assertEqual(outcome.as_dict()["unit_active"], 1)
        self.assertIsNone(outcome.exit_signal)

    def test_mocked_95s_digest_fails_under_default_90(self) -> None:
        mocked_digest_duration_sec = 95.0
        self.assertFalse(
            digest_completes_within_timeout(
                mocked_digest_duration_sec, DEFAULT_SYSTEMD_TIMEOUT_START_SEC
            )
        )
        outcome = evaluate_digest_start(
            mocked_digest_duration_sec, DEFAULT_SYSTEMD_TIMEOUT_START_SEC
        )
        self.assertFalse(outcome.ok)
        self.assertEqual(outcome.result, "timeout")
        self.assertEqual(outcome.exit_signal, "SIGTERM")
        self.assertEqual(outcome.exit_code, 15)
        self.assertEqual(outcome.as_dict()["unit_active"], 0)


class TestIntegrationVersionedUnit(unittest.TestCase):
    """Integration: versioned unit/drop-in prevent result=timeout under load."""

    def test_versioned_unit_declares_timeout_120(self) -> None:
        unit_path = REPO_ROOT / UNIT_REL_PATH
        dropin_path = REPO_ROOT / DROPIN_REL_PATH
        self.assertTrue(unit_path.is_file(), f"missing {unit_path}")
        self.assertTrue(dropin_path.is_file(), f"missing {dropin_path}")

        unit_text = unit_path.read_text(encoding="utf-8")
        dropin_text = dropin_path.read_text(encoding="utf-8")
        self.assertEqual(parse_timeout_start_sec(unit_text), TARGET_TIMEOUT_START_SEC)
        self.assertEqual(parse_timeout_start_sec(dropin_text), TARGET_TIMEOUT_START_SEC)
        self.assertEqual(parse_timeout_stop_sec(unit_text), TARGET_TIMEOUT_STOP_SEC)
        self.assertEqual(parse_timeout_stop_sec(dropin_text), TARGET_TIMEOUT_STOP_SEC)

        effective = load_unit_timeout_start_sec(REPO_ROOT)
        self.assertEqual(effective, TARGET_TIMEOUT_START_SEC)
        self.assertEqual(load_unit_timeout_stop_sec(REPO_ROOT), TARGET_TIMEOUT_STOP_SEC)

    def test_unit_remains_oneshot_digest_exec(self) -> None:
        text = (REPO_ROOT / UNIT_REL_PATH).read_text(encoding="utf-8")
        self.assertIn("Type=oneshot", text)
        self.assertIn("gs343_daily_digest.py", text)

    def test_normal_load_does_not_timeout(self) -> None:
        normal_load_sec = 45.0
        timeout = load_unit_timeout_start_sec(REPO_ROOT)
        outcome = evaluate_digest_start(normal_load_sec, timeout)
        self.assertEqual(outcome.result, "success")
        self.assertNotEqual(outcome.result, "timeout")
        self.assertTrue(outcome.ok)


class TestNegativeExceedsTimeout(unittest.TestCase):
    """Negative: service fails gracefully if wall time exceeds TimeoutStartSec."""

    def test_exceeds_timeout_start_sec_fails_gracefully(self) -> None:
        timeout = load_unit_timeout_start_sec(REPO_ROOT)
        self.assertEqual(timeout, TARGET_TIMEOUT_START_SEC)
        overrun_sec = float(timeout) + 15.0  # 135s vs 120s budget
        outcome = evaluate_digest_start(overrun_sec, timeout)
        self.assertFalse(outcome.ok)
        self.assertEqual(outcome.result, "timeout")
        self.assertEqual(outcome.exit_signal, "SIGTERM")
        self.assertEqual(outcome.exit_code, 15)
        self.assertEqual(outcome.as_dict()["unit_active"], 0)
        # Graceful: structured result, no exception raised.
        self.assertIsInstance(outcome.as_dict(), dict)


class TestInputValidation(unittest.TestCase):
    def test_negative_duration_rejected(self) -> None:
        with self.assertRaises(ValueError):
            digest_completes_within_timeout(-1.0, 120)

    def test_non_positive_timeout_rejected(self) -> None:
        with self.assertRaises(ValueError):
            digest_completes_within_timeout(10.0, 0)


def load_tests(loader, tests, pattern):  # noqa: ARG001
    """unittest discovery hook used by certforge_testkit."""
    suite = unittest.TestSuite()
    for case in (
        TestParseTimeoutStartSec,
        TestParseTimeoutStopSec,
        TestSandboxActiveWithinBudget,
        TestIntegrationVersionedUnit,
        TestNegativeExceedsTimeout,
        TestInputValidation,
    ):
        suite.addTests(loader.loadTestsFromTestCase(case))
    return suite


if __name__ == "__main__":
    unittest.main(verbosity=2)
