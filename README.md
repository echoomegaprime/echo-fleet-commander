# Echo Fleet Commander

> Centralized multi-Worker orchestration hub — a single pane of glass over 100+ Cloudflare
> Workers.

## Overview

Fleet Commander maintains a static registry (`FLEET_REGISTRY`) of every ECHO Cloudflare Worker
— name, service binding, health path, category (`core` / `bot` / `intelligence` / `scraper` /
`infra` / `product` / `utility`), tier, criticality, and dependencies — and provides fleet-wide
scanning, health history, incident tracking, deployment detection, AI-generated briefings, and a
whitelisted command-dispatch interface for triggering actions on specific workers (e.g. the
autonomous daemon's cycle, the QA tester's test run).

## Authentication

Every route except `GET /` and `GET /health` requires an `X-Echo-API-Key` header matching the
`ECHO_API_KEY` secret. An unconfigured key fails closed (503), never open:

```bash
npx wrangler secret put ECHO_API_KEY
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/`, `/health` | none | Liveness + fleet size/category/tier summary |
| `GET` | `/dashboard` | required | Full fleet dashboard (health, topology, incidents, deploys, briefing, trend) |
| `GET`/`POST` | `/scan`, `/fleet/scan` | required | Scan the fleet (optionally by `?tier=`), cached 60s unless `?force=true` |
| `GET` | `/briefing` | required | Latest AI-generated fleet briefing |
| `GET` | `/registry` | required | The full static worker registry |
| `GET` | `/search` | required | Search the registry |
| `GET` | `/topology` | required | Dependency graph |
| `GET` | `/incidents` | required | List incidents |
| `POST` | `/incidents/create` | required | Create an incident |
| `POST` | `/incidents/resolve` | required | Resolve an incident |
| `POST` | `/command` | required | Dispatch a whitelisted command (`health`, `trigger-cycle`, `run-tests`, `stats`, ...) to `?target=` |
| `GET` | `/commands` | required | Command dispatch history |
| `GET` | `/deploys` | required | Detected deployment events (last N days) |
| `GET` | `/uptime` | required | Daily uptime per worker |
| `GET` | `/history` | required | Health check history |
| `GET` | `/snapshots` | required | Fleet score snapshots |
| `GET` | `/briefings` | required | Briefing history |
| `GET` | `/audit` | required | Audit log |
| `GET` | `/worker?name=` | required | Detail for a single registered worker |
| `GET` | `/stats` | required | Aggregate fleet stats |

## Deployment

```bash
npm install
npx wrangler secret put ECHO_API_KEY
npx wrangler deploy
```

## Testing

```bash
npm run typecheck   # tsc --noEmit
npm test             # vitest run
npx wrangler deploy --dry-run   # verify all 100+ service bindings resolve
```

## Architecture

Plain `fetch`-handler Worker (no framework), zero runtime dependencies. D1 (`DB`) stores fleet
health history, deploys, commands, incidents, uptime, snapshots, and audit log. KV (`CACHE`)
holds hot scan results and briefings. An Analytics Engine dataset (`ANALYTICS`) records metrics.
Every other product/service Worker is wired in as a service binding (`Fetcher`) so fleet-wide
calls stay inside Cloudflare's network rather than round-tripping over the public internet.
