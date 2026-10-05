import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export const digest = value => createHash('sha256').update(value).digest('hex');
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, hash) {
  try {
    const [kind, salt, value] = hash.split(':');
    if (kind !== 'scrypt' || !/^[a-f0-9]{128}$/.test(value)) return false;
    return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(value, 'hex'));
  } catch { return false; }
}
export const randomToken = () => randomBytes(32).toString('base64url');
export const temporaryPassword = () => `Sb!${randomBytes(10).toString('base64url')}7`;
