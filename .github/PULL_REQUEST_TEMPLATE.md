## What

## Why

## Testing

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npx wrangler deploy --dry-run` succeeds (all bindings resolve)
- [ ] If touching auth/`timingSafeEqual`: added a test that would fail without the fix, including
      the misconfigured-secret (fail-closed) case
