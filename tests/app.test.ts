import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '@/app.js';
import { loadEnv } from '@/config/env.js';
import { NotImplementedError } from '@/errors.js';
import type { RouteFinder } from '@/services/route-finder.service.js';

const errorCode = (res: { body: unknown }): string =>
  (res.body as { error: { code: string } }).error.code;

function buildApp(
  options: { routeFinder?: RouteFinder; ready?: boolean; env?: NodeJS.ProcessEnv } = {},
) {
  const routeFinder: RouteFinder = options.routeFinder ?? {
    findFastestRoute: vi
      .fn()
      .mockReturnValue({ duration: 8, route: ['Tatooine', 'Hoth', 'Endor'] }),
  };
  return createApp({
    env: loadEnv({ NODE_ENV: 'test', LOG_LEVEL: 'silent', ...options.env }),
    logger: pino({ level: 'silent' }),
    routeFinder,
    isReady: () => options.ready ?? true,
  });
}

describe('operational endpoints', () => {
  it('GET /health/live returns 200', async () => {
    const res = await request(buildApp()).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /health/ready returns 503 when the data source is unavailable', async () => {
    const res = await request(buildApp({ ready: false })).get('/health/ready');
    expect(res.status).toBe(503);
  });
});

describe('security hardening', () => {
  it('sets security headers and hides the framework', async () => {
    const res = await request(buildApp()).get('/health/live');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rate limits clients exceeding the configured quota', async () => {
    const app = buildApp({ env: { RATE_LIMIT_MAX: '1' } });
    await request(app).post('/compute').send({ arrival: 'Endor' });
    const res = await request(app).post('/compute').send({ arrival: 'Endor' });
    expect(res.status).toBe(429);
    expect(errorCode(res)).toBe('RATE_LIMITED');
  });
});

describe('POST /compute', () => {
  it('returns the route computed by the service', async () => {
    const findFastestRoute = vi
      .fn<RouteFinder['findFastestRoute']>()
      .mockReturnValue({ duration: 8, route: ['Tatooine', 'Hoth', 'Endor'] });
    const res = await request(buildApp({ routeFinder: { findFastestRoute } }))
      .post('/compute')
      .send({ arrival: 'Endor' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ duration: 8, route: ['Tatooine', 'Hoth', 'Endor'] });
    expect(findFastestRoute).toHaveBeenCalledWith('Endor');
  });

  it.each([
    ['missing arrival', {}],
    ['empty arrival', { arrival: '   ' }],
    ['wrong type', { arrival: 42 }],
    ['unknown field', { arrival: 'Endor', extra: true }],
  ])('returns 400 on invalid payload (%s)', async (_label, payload) => {
    const res = await request(buildApp()).post('/compute').send(payload);
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on malformed JSON', async () => {
    const res = await request(buildApp())
      .post('/compute')
      .set('Content-Type', 'application/json')
      .send('{"arrival":');
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe('BAD_REQUEST');
  });

  it('returns 413 on oversized payload', async () => {
    const res = await request(buildApp())
      .post('/compute')
      .send({ arrival: 'x'.repeat(20_000) });
    expect(res.status).toBe(413);
  });

  it('returns 404 when no route exists', async () => {
    const routeFinder: RouteFinder = { findFastestRoute: vi.fn().mockReturnValue(null) };
    const res = await request(buildApp({ routeFinder }))
      .post('/compute')
      .send({ arrival: 'Alderaan' });
    expect(res.status).toBe(404);
    expect(errorCode(res)).toBe('NO_ROUTE_FOUND');
  });

  it('does not leak internals on unexpected errors', async () => {
    const routeFinder: RouteFinder = {
      findFastestRoute: vi.fn().mockImplementation(() => {
        throw new Error('database password is hunter2');
      }),
    };
    const res = await request(buildApp({ routeFinder }))
      .post('/compute')
      .send({ arrival: 'Endor' });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });

  it('maps NotImplementedError to 501', async () => {
    const routeFinder: RouteFinder = {
      findFastestRoute: vi.fn().mockImplementation(() => {
        throw new NotImplementedError();
      }),
    };
    const res = await request(buildApp({ routeFinder }))
      .post('/compute')
      .send({ arrival: 'Endor' });
    expect(res.status).toBe(501);
  });
});

describe('unknown routes', () => {
  it('returns a JSON 404', async () => {
    const res = await request(buildApp()).get('/nope');
    expect(res.status).toBe(404);
    expect(errorCode(res)).toBe('ROUTE_NOT_FOUND');
  });
});
