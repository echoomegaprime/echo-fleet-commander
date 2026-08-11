# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Fixed
- **Security (critical):** fail-open auth bypass — `env.ECHO_API_KEY && apiKey !== env.ECHO_API_KEY`
  let every request through with no key at all whenever the secret was unconfigured, on every
  route except `/` and `/health` (including the command-dispatch and incident endpoints). Now
  fails closed (503) and uses constant-time comparison.
- `npm audit`: resolved all 6 findings to 0 — wrangler dev-toolchain (miniflare/sharp/undici/ws/
  esbuild) via `npm audit fix --force`, verified all 100+ service bindings still resolve.

### Added
- First test suite: `vitest`, 10 tests including an explicit fail-open regression guard.
- `README.md` (none existed previously), `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `LICENSE`, `.github/` templates + CI.

## [1.2.0] and earlier

See git history — this file starts tracking from the current consolidation pass forward.
