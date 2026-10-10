import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAllowedOrigin, parseClientOrigins } from '../src/config/env.js';

describe('origin policy', () => {
  const configured = ['https://board.example.com', 'http://localhost:5173'];

  it('allows configured origins and requests without an Origin header', () => {
    assert.equal(isAllowedOrigin('https://board.example.com', { nodeEnv: 'production', allowedOrigins: configured }), true);
    assert.equal(isAllowedOrigin(undefined, { nodeEnv: 'production', allowedOrigins: configured }), true);
  });

  it('allows loopback origins on Vite fallback ports only outside production', () => {
    assert.equal(isAllowedOrigin('http://localhost:5174', { nodeEnv: 'development', allowedOrigins: configured }), true);
    assert.equal(isAllowedOrigin('http://127.0.0.1:5401', { nodeEnv: 'test', allowedOrigins: configured }), true);
    assert.equal(isAllowedOrigin('http://localhost:5174', { nodeEnv: 'production', allowedOrigins: configured }), false);
  });

  it('rejects unconfigured public origins and malformed origins', () => {
    assert.equal(isAllowedOrigin('https://attacker.example', { nodeEnv: 'development', allowedOrigins: configured }), false);
    assert.equal(isAllowedOrigin('not-an-origin', { nodeEnv: 'development', allowedOrigins: configured }), false);
  });

  it('parses comma-separated origins and normalizes trailing slashes', () => {
    assert.deepEqual(
      parseClientOrigins('https://board.example.com/, https://preview.example.com'),
      ['https://board.example.com', 'https://preview.example.com'],
    );
  });
});
