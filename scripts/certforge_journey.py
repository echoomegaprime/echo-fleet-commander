#!/usr/bin/env python3
"""Certification Forge journey for echo-fleet-commander.

The Forge sandbox is python:3.12-alpine with no Node.js, so this journey
performs text/structural checks on the TypeScript source rather than
actually running npm/vitest/wrangler. Each check is discriminating: it
must fail against the pre-fix source and pass against the current source,
not just assert a file exists.
"""
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FAILURES = []


def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail and not condition else ""))
    if not condition:
        FAILURES.append(name)


def read(rel_path):
    path = REPO_ROOT / rel_path
    if not path.exists():
        return None
    return path.read_text(encoding="utf-8")


def main():
    index_ts = read("src/index.ts")
    check("src/index.ts exists", index_ts is not None)

    if index_ts:
        auth_match = re.search(
            r"if\s*\(path !== '/health' && path !== '/'\)\s*\{(.*?)\n  \}",
            index_ts,
            re.S,
        )
        check("auth check block found", auth_match is not None)
        body = auth_match.group(1) if auth_match else ""

        # The regression: `env.ECHO_API_KEY && apiKey !== env.ECHO_API_KEY`
        # short-circuits to false (open) whenever the secret is unset.
        fail_open_pattern = bool(
            re.search(r"if\s*\(\s*env\.ECHO_API_KEY\s*&&\s*apiKey\s*!==\s*env\.ECHO_API_KEY\s*\)", body)
        )
        check(
            "no fail-open pattern (env.KEY && apiKey !== env.KEY)",
            not fail_open_pattern,
            "found the short-circuit-to-open pattern",
        )

        fails_closed_on_missing_key = bool(re.search(r"if\s*\(\s*!env\.ECHO_API_KEY\s*\)", body))
        check("explicitly fails closed (503) when ECHO_API_KEY unset", fails_closed_on_missing_key)

        uses_timing_safe_compare = "timingSafeEqual(" in body
        check("auth check uses timingSafeEqual, not raw !==", uses_timing_safe_compare)

        tse_match = re.search(
            r"export function timingSafeEqual\([^)]*\)\s*:\s*boolean\s*\{(.*?)\n\}",
            index_ts,
            re.S,
        )
        check("timingSafeEqual function found", tse_match is not None)
        tse_body = tse_match.group(1) if tse_match else ""
        early_length_return = bool(
            re.search(r"if\s*\(\s*a\.length\s*!==\s*b\.length\s*\)\s*return\s*false", tse_body)
        )
        check(
            "timingSafeEqual has no early-return-on-length-mismatch timing oracle",
            not early_length_return,
        )

    package_json_raw = read("package.json")
    check("package.json exists", package_json_raw is not None)
    if package_json_raw:
        pkg = json.loads(package_json_raw)
        scripts = pkg.get("scripts", {})
        check("package.json declares a test script", scripts.get("test") == "vitest run")
        dev_deps = pkg.get("devDependencies", {})
        check("vitest is a devDependency", "vitest" in dev_deps)
        check("license is declared", bool(pkg.get("license")))

    check("tests/security.test.ts exists", (REPO_ROOT / "tests" / "security.test.ts").exists())

    security_test = read("tests/security.test.ts")
    if security_test:
        check(
            "security.test.ts has an explicit fail-closed regression test",
            "fails closed" in security_test and "503" in security_test,
        )

    for fname in [
        "README.md",
        "LICENSE",
        "SECURITY.md",
        "CONTRIBUTING.md",
        "CHANGELOG.md",
        "CODE_OF_CONDUCT.md",
    ]:
        check(f"{fname} exists", (REPO_ROOT / fname).exists())

    check(
        ".github/workflows/ci.yml exists",
        (REPO_ROOT / ".github" / "workflows" / "ci.yml").exists(),
    )

    print()
    if FAILURES:
        print(f"CERTFORGE JOURNEY: FAIL ({len(FAILURES)} check(s) failed)")
        for f in FAILURES:
            print(f"  - {f}")
        sys.exit(1)
    print("CERTFORGE JOURNEY: PASS (all checks green)")
    sys.exit(0)


if __name__ == "__main__":
    main()
