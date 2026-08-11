# Security Policy

## Supported Versions

Only the latest deployed revision of `echo-fleet-commander` receives security fixes.

## Reporting a Vulnerability

Do not open a public GitHub issue for a suspected vulnerability. Email **security@echo-ept.com**.

## Fixed This Pass

### Fail-open auth bypass on a 100+-worker orchestration hub (critical, fixed)

The auth check was:

```typescript
if (env.ECHO_API_KEY && apiKey !== env.ECHO_API_KEY) {
  return json({ error: 'Unauthorized' }, 401);
}
```

When `ECHO_API_KEY` was unset (unprovisioned secret), the `&&` short-circuited to `false` —
meaning the condition could never be true, so the 401 branch never fired, regardless of what
header the caller sent (or didn't send). Every route except `/` and `/health` — including
`POST /command` (dispatches whitelisted actions like `trigger-cycle`/`run-tests`/`stats` to any
of 100+ registered Cloudflare Workers), `/incidents/create`, `/incidents/resolve`, and every read
endpoint exposing fleet topology/health-history/audit data — became fully open to the public
internet whenever the secret was misconfigured.

Fixed to fail closed:

```typescript
if (!env.ECHO_API_KEY) {
  return json({ error: 'Service misconfigured: ECHO_API_KEY not set' }, 503);
}
const apiKey = request.headers.get('X-Echo-API-Key');
if (!timingSafeEqual(apiKey, env.ECHO_API_KEY)) {
  return json({ error: 'Unauthorized' }, 401);
}
```

Also switched from a raw `!==` comparison to `timingSafeEqual` (constant-time, no early return on
length mismatch) to close the timing side-channel on the key itself.

Verified with a dedicated regression test asserting BOTH a keyless request AND a request with a
(necessarily wrong, since none can be right) key both get `503` when the secret is unconfigured
— proven to actually catch the regression by reverting to the buggy condition and confirming the
test suite correctly fails (9/10 instead of 10/10) before restoring the fix.

### `dispatchCommand` command whitelist (reviewed, no change needed)

`/command` dispatches to a `switch (command)` over a fixed set of cases (`health`,
`trigger-cycle`, `run-tests`, `stats`, ...) — not an arbitrary command-execution surface. Some
commands are further scoped to a specific `target` (e.g. `trigger-cycle` only acts if
`target === 'echo-autonomous-daemon'`). The auth fix above is the load-bearing control; no
whitelist change was needed.

### `npm audit` — resolved to 0 vulnerabilities

All 6 findings (`miniflare`, `sharp`, `undici`, `wrangler`, `ws`, `esbuild`) were `wrangler`'s
own dev-only toolchain, resolved via `npm audit fix --force` and bumping
`@cloudflare/workers-types` to the matching v5 peer range. Verified with `wrangler deploy
--dry-run` that all 100+ service bindings still resolve correctly after the bump.

## Design Notes

- Zero runtime dependencies — plain `fetch`-handler Worker, no framework.
- Service bindings (`Fetcher`) keep fleet-wide calls inside Cloudflare's network rather than
  round-tripping to the public internet for each worker.
- `timingSafeEqual` always walks a length-padded buffer rather than short-circuiting on length
  mismatch, so key length can't be recovered via timing.
