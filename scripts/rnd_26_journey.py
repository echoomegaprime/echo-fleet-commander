#!/usr/bin/env python3
"""CertForge journey for ECHO R&D proposal #26 (rnd-26).

Verifies the versioned gs343-digest TimeoutStartSec=120 / TimeoutStopSec=30
change and runs the stdlib unittest suite via certforge_testkit. Offline-safe:
stdlib only, no live systemctl, no production edits.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FAILURES: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    status = "PASS" if condition else "FAIL"
    suffix = f" — {detail}" if detail and not condition else ""
    print(f"[{status}] {name}{suffix}")
    if not condition:
        FAILURES.append(name)


def main() -> int:
    unit = REPO_ROOT / "systemd" / "gs343-digest.service"
    dropin = (
        REPO_ROOT
        / "systemd"
        / "gs343-digest.service.d"
        / "10-timeout.conf"
    )
    timer = REPO_ROOT / "systemd" / "gs343-digest.timer"
    test_file = REPO_ROOT / "tests" / "python" / "test_gs343_digest_timeout.py"
    policy = REPO_ROOT / "python" / "echo_gs343_digest" / "timeout_policy.py"
    cert = REPO_ROOT / ".echo" / "certification.json"
    suites = REPO_ROOT / ".echo" / "certforge_suites.json"

    check("unit file exists", unit.is_file())
    check("drop-in exists", dropin.is_file())
    check("timer file exists", timer.is_file())
    check("timeout policy module exists", policy.is_file())
    check("rnd-26 test module exists", test_file.is_file())
    check("certforge_suites.json exists", suites.is_file())

    if unit.is_file():
        text = unit.read_text(encoding="utf-8")
        check("unit declares TimeoutStartSec=120", "TimeoutStartSec=120" in text)
        check("unit declares TimeoutStopSec=30", "TimeoutStopSec=30" in text)
        check("unit remains Type=oneshot", "Type=oneshot" in text)
        check(
            "unit still invokes gs343_daily_digest.py",
            "gs343_daily_digest.py" in text,
        )

    if dropin.is_file():
        dropin_text = dropin.read_text(encoding="utf-8")
        check(
            "drop-in declares TimeoutStartSec=120",
            "TimeoutStartSec=120" in dropin_text,
        )
        check(
            "drop-in declares TimeoutStopSec=30",
            "TimeoutStopSec=30" in dropin_text,
        )

    if suites.is_file():
        suites_data = json.loads(suites.read_text(encoding="utf-8"))
        paths = [s.get("path") for s in suites_data.get("suites", [])]
        check(
            "certforge_suites lists rnd-26 test",
            "tests/python/test_gs343_digest_timeout.py" in paths,
        )

    if cert.is_file():
        data = json.loads(cert.read_text(encoding="utf-8"))
        rnd = data.get("rnd") or {}
        check("certification.json has rnd.proposal_id == 26", rnd.get("proposal_id") == 26)
        check(
            "certification.json rnd.policy_version",
            rnd.get("policy_version") == "certforge.rnd-staging.v1",
        )
        journey = rnd.get("journey") or []
        check(
            "certification.json rnd.journey points at rnd_26_journey.py",
            journey == ["python3", "-B", "scripts/rnd_26_journey.py"],
        )
        # Existing keys must remain for other pipelines.
        check("certification.json keeps version key", "version" in data)
        check("certification.json keeps top-level journey", "journey" in data)

    # Run the discriminating test suite (mocked digest timings, no live systemctl).
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    try:
        import certforge_testkit  # noqa: WPS433
    except ImportError as exc:
        check("certforge_testkit importable", False, str(exc))
    else:
        rc = certforge_testkit.run_suite(
            test_file,
            sys_paths=["python"],
        )
        check("rnd-26 unittest suite green", rc == 0, f"exit={rc}")

    print()
    if FAILURES:
        print(f"RND-26 JOURNEY: FAIL ({len(FAILURES)} check(s) failed)")
        for name in FAILURES:
            print(f"  - {name}")
        return 1
    print("RND-26 JOURNEY: PASS (all checks green)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
