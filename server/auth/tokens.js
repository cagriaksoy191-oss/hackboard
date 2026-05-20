/**
 * tokens.js — JWT Token Management
 *
 * Handles access token and refresh token lifecycle:
 * - Access tokens: short-lived (15 min), carry userId + orgId
 * - Refresh tokens: longer-lived (7 days), stored hashed in DB
 * - Token rotation: old refresh token invalidated on use
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prepare } from '../db-adapter.js';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret');
if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate an access token (JWT).
 * @param {object} payload - { userId, orgId? }
 * @returns {string} Signed JWT
 */
export function generateAccessToken(payload) {
  return jwt.sign(
    { userId: payload.userId, orgId: payload.orgId || null },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: 'HS256' }
  );
}

/**
 * Generate a refresh token, hash it, and store in DB.
 * @param {number} userId
 * @returns {Promise<string>} The raw refresh token (sent to client)
 */
export async function generateRefreshToken(userId) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS).toISOString();

  await prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
  ).run(userId, tokenHash, expiresAt);

  return rawToken;
}

/**
 * Verify an access token.
 * @param {string} token - The JWT string
 * @returns {{ userId: number, orgId: number|null } | null}
 */
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded && decoded.userId) {
      return { userId: decoded.userId, orgId: decoded.orgId || null };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Verify and rotate a refresh token.
 * Consumes the old token and issues a new pair.
 * @param {string} rawToken - The raw refresh token from client
 * @returns {Promise<{ accessToken: string, refreshToken: string, userId: number } | null>}
 */
export async function rotateRefreshToken(rawToken) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Find the token
  const stored = await prepare(
    'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = ?'
  ).get(tokenHash);

  if (!stored) return null;

  // Delete the used token (rotation — one-time use)
  await prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);

  // Check expiry
  const now = new Date();
  const expiresAt = new Date(stored.expires_at);
  if (now > expiresAt) return null;

  // Check user still exists
  const user = await prepare('SELECT id FROM users WHERE id = ? AND is_deleted = 0').get(stored.user_id);
  if (!user) return null;

  // Get the user's active org membership for the access token
  const membership = await prepare(
    'SELECT org_id FROM org_memberships WHERE user_id = ? ORDER BY joined_at LIMIT 1'
  ).get(stored.user_id);

  // Issue new pair
  const accessToken = generateAccessToken({
    userId: stored.user_id,
    orgId: membership?.org_id || null
  });
  const newRefreshToken = await generateRefreshToken(stored.user_id);

  return { accessToken, refreshToken: newRefreshToken, userId: stored.user_id };
}

/**
 * Revoke all refresh tokens for a user (logout from all devices).
 * @param {number} userId
 */
export async function revokeAllTokens(userId) {
  await prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
}

/**
 * Cleanup expired refresh tokens (housekeeping).
 * Should be called periodically (e.g., daily cron).
 */
export async function cleanupExpiredTokens() {
  await prepare('DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP').run();
}
