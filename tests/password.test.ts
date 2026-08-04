import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '@/shared/utils/password';

// Generated with the native `bcrypt` package (backend's original dependency,
// bcrypt.hash('CorrectHorseBattery9!', 12)) — a real fixture, not merely an
// assumption, that a hash produced before the bcryptjs swap still verifies
// correctly after it. This is the exact compatibility check the migration
// decision required before approving the bcrypt -> bcryptjs swap.
const PRE_EXISTING_BCRYPT_HASH = '$2b$12$l9YkOk7rYde0T029MMKJ7eD.xB0CPhlYSlOQjDhy4x1kVW.VULP12';
const PRE_EXISTING_BCRYPT_PLAINTEXT = 'CorrectHorseBattery9!';

test('a hash produced by the original native bcrypt package verifies correctly under bcryptjs', async () => {
  const ok = await verifyPassword(PRE_EXISTING_BCRYPT_PLAINTEXT, PRE_EXISTING_BCRYPT_HASH);
  assert.equal(ok, true);
});

test('the same pre-existing hash rejects an incorrect password', async () => {
  const ok = await verifyPassword('wrong-password', PRE_EXISTING_BCRYPT_HASH);
  assert.equal(ok, false);
});

test('registration flow: hashPassword produces a hash verifyPassword accepts', async () => {
  const hash = await hashPassword('a-brand-new-password-123');
  assert.equal(await verifyPassword('a-brand-new-password-123', hash), true);
});

test('login flow: verifyPassword rejects the wrong password against a freshly hashed one', async () => {
  const hash = await hashPassword('a-brand-new-password-123');
  assert.equal(await verifyPassword('not-the-password', hash), false);
});

test('hashPassword output is recognizable as a $2b bcrypt hash at cost 12', async () => {
  const hash = await hashPassword('another-password-456');
  assert.match(hash, /^\$2b\$12\$/);
});
