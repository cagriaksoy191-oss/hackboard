import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import rateLimit from 'express-rate-limit';

describe('Rate Limiter', () => {
  let app;
  let server;

  before(() => {
    app = express();
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 2, // very small limit for testing
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests' }
    });

    app.use('/api', limiter);
    app.get('/api/test', (req, res) => res.json({ success: true }));

    return new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  test('should allow requests under the limit', async () => {
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/test`);
    assert.strictEqual(res.status, 200);
  });

  test('should block requests over the limit', async () => {
    const port = server.address().port;
    // first request is consumed by previous test (1/2)
    const res2 = await fetch(`http://localhost:${port}/api/test`);
    assert.strictEqual(res2.status, 200); // 2/2

    const res3 = await fetch(`http://localhost:${port}/api/test`);
    assert.strictEqual(res3.status, 429); // 3/2 blocked

    const data = await res3.json();
    assert.strictEqual(data.error, 'Too many requests');
  });
});
