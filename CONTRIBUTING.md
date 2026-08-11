# Contributing

## Setup

```bash
git clone https://github.com/echoomegaprime/echo-fleet-commander.git
cd echo-fleet-commander
npm install
```

## Development loop

```bash
npm run typecheck                       # tsc --noEmit
npm test                                # vitest run
npx wrangler deploy --dry-run           # verify all 100+ bindings resolve without deploying
npm run dev                             # local dev server (wrangler dev)
```

## Adding a worker to the fleet

Add an entry to `FLEET_REGISTRY` in `src/index.ts` (name, binding or publicUrl, healthPath,
category, tier, critical, dependsOn) and a matching service binding in `wrangler.toml` if it's
bound (not just reached via publicUrl).

## Security-sensitive changes

Anything touching the auth gate or `timingSafeEqual` needs a test that would fail without the
fix — see `SECURITY.md`'s note on the fail-open regression for the discipline (a fix that only
gets tested for the "obviously wrong key" case can still ship a fail-open default; test the
misconfigured-secret case explicitly, with and without a header).

## Adding a command

New `/command` cases go in `dispatchCommand()`'s `switch`. Keep it a closed whitelist — do not
add a passthrough/eval-style case that executes an arbitrary caller-supplied action.
