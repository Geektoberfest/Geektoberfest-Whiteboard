import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { before, describe, it } from 'node:test';

let app;
before(async () => {
  ({ createApp: app } = await import('../src/app.js'));
  app = app();
});

describe('HTTP boundary behavior', () => {
  it('reports database state in the health response', async () => {
    const response = await request(app).get('/api/health');
    const connected = mongoose.connection.readyState === 1;
    assert.equal(response.status, connected ? 200 : 503);
    assert.equal(response.body.database, connected ? 'connected' : 'unavailable');
  });

  it('returns a controlled error for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
  });

  it('permits the Vite fallback loopback origin in development CORS', async () => {
    const response = await request(app)
      .options('/api/auth/me')
      .set('Origin', 'http://localhost:5174')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization');
    assert.equal(response.status, 204);
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5174');
  });

  it('rejects an unrelated browser origin', async () => {
    const response = await request(app)
      .options('/api/auth/me')
      .set('Origin', 'https://attacker.example')
      .set('Access-Control-Request-Method', 'GET');
    assert.equal(response.status, 403);
  });

  it('returns a controlled unauthenticated response for protected routes', async () => {
    const response = await request(app).get('/api/rooms');
    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error, 'UNAUTHORIZED');
  });
});
