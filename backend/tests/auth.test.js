import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { before, describe, it } from 'node:test';

process.env.JWT_SECRET = 'test-secret-for-the-geekstober-suite';
process.env.JWT_EXPIRES_IN = '1h';

let signToken;
let verifyToken;

before(async () => {
  ({ signToken, verifyToken } = await import('../src/services/tokenService.js'));
});

describe('token service', () => {
  it('signs a token that resolves back to the user id', () => {
    const token = signToken({ _id: '65f0000000000000000000aa' });

    assert.equal(verifyToken(token), '65f0000000000000000000aa');
  });

  it('rejects a tampered token', () => {
    const token = signToken({ _id: '65f0000000000000000000aa' });

    assert.throws(() => verifyToken(`${token}tampered`), (error) => error.statusCode === 401);
  });

  it('rejects a token signed with another secret', () => {
    const foreignToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4In0.not-a-real-signature`;

    assert.throws(() => verifyToken(foreignToken), (error) => error.statusCode === 401);
  });
});

describe('password hashing', () => {
  it('never stores the plain text password', async () => {
    const password = 'correct-horse-battery';
    const passwordHash = await bcrypt.hash(password, 10);

    assert.notEqual(passwordHash, password);
    assert.ok(await bcrypt.compare(password, passwordHash));
    assert.equal(await bcrypt.compare('wrong-password', passwordHash), false);
  });
});
