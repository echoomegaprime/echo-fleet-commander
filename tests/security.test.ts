import { describe, it, expect } from 'vitest';
import { handleRequest, timingSafeEqual } from '../src/index.js';

describe('timingSafeEqual', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqual('secret-value', 'secret-value')).toBe(true);
  });
  it('returns false for different strings of the same length', () => {
    expect(timingSafeEqual('secret-value', 'secret-vlaue')).toBe(false);
  });
  it('returns false for strings of different length', () => {
    expect(timingSafeEqual('short', 'a-much-longer-string')).toBe(false);
  });
  it('returns false when either side is missing', () => {
    expect(timingSafeEqual(undefined, 'x')).toBe(false);
    expect(timingSafeEqual('x', null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Minimal fake env — enough to exercise the auth gate. `/health` never
// touches DB/CACHE, so it's a safe target for the positive-control test.
// ---------------------------------------------------------------------------

function fakeEnv(overrides: Record<string, unknown> = {}) {
  return {
    DB: {},
    CACHE: {},
    ECHO_API_KEY: 'correct-horse-battery-staple',
    ...overrides,
  } as any;
}

describe('auth gate (Env.ECHO_API_KEY / X-Echo-API-Key)', () => {
  it('allows "/" and "/health" with no key', async () => {
    const rootRes = await handleRequest(new Request('https://worker/'), fakeEnv());
    expect(rootRes.status).toBe(200);

    const healthRes = await handleRequest(new Request('https://worker/health'), fakeEnv());
    expect(healthRes.status).toBe(200);
  });

  it('rejects a protected route with no key (401)', async () => {
    const res = await handleRequest(new Request('https://worker/dashboard'), fakeEnv());
    expect(res.status).toBe(401);
  });

  it('rejects a protected route with a wrong key (401)', async () => {
    const res = await handleRequest(
      new Request('https://worker/dashboard', { headers: { 'X-Echo-API-Key': 'garbage' } }),
      fakeEnv()
    );
    expect(res.status).toBe(401);
  });

  it('fails closed (503) when ECHO_API_KEY is not configured -- regression guard for the fail-open bug', async () => {
    // Previously `env.ECHO_API_KEY && apiKey !== env.ECHO_API_KEY` short-circuited to
    // false (i.e. NOT unauthorized) whenever the secret was unset, letting every
    // request through with no key at all. This must now fail closed instead.
    const res = await handleRequest(
      new Request('https://worker/dashboard'),
      fakeEnv({ ECHO_API_KEY: '' })
    );
    expect(res.status).toBe(503);

    // Even a request WITH a key must still be rejected when the service itself
    // is misconfigured -- there is no key that can satisfy an unset secret.
    const withKeyRes = await handleRequest(
      new Request('https://worker/dashboard', { headers: { 'X-Echo-API-Key': 'anything' } }),
      fakeEnv({ ECHO_API_KEY: '' })
    );
    expect(withKeyRes.status).toBe(503);
  });

  it('allows a protected route with the correct key (positive control)', async () => {
    const res = await handleRequest(
      new Request('https://worker/health', {
        headers: { 'X-Echo-API-Key': 'correct-horse-battery-staple' },
      }),
      fakeEnv()
    );
    expect(res.status).toBe(200);
  });

  it('blocks the command-dispatch endpoint without a key', async () => {
    const res = await handleRequest(
      new Request('https://worker/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'echo-autonomous-daemon', command: 'trigger-cycle' }),
      }),
      fakeEnv()
    );
    expect(res.status).toBe(401);
  });
});
