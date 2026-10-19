"use strict";

const crypto = require("node:crypto");
const { MAX_AUTH_TOKEN_LENGTH, MAX_SESSION_AGE_MS, SESSION_TTL_SECONDS } = require("./config");

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;

function hashToken(token) {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_AUTH_TOKEN_LENGTH) {
    throw new TypeError("token must be a non-empty string within the safe token limit");
  }
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function randomToken(bytes = 32) {
  if (!Number.isInteger(bytes) || bytes < 16 || bytes > 128) throw new RangeError("token size must be between 16 and 128 bytes");
  return crypto.randomBytes(bytes).toString("base64url");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 1024) {
    throw new TypeError("password must be a string between 12 and 1024 characters");
  }
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

function verifyPassword(password, encoded) {
  try {
    if (typeof password !== "string" || password.length > 1024 || typeof encoded !== "string" || encoded.length > 512) return false;
    const [algorithm, nRaw, rRaw, pRaw, saltRaw, hashRaw] = String(encoded).split("$");
    if (algorithm !== "scrypt" || !saltRaw || !hashRaw) return false;
    const n = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);
    if (![n, r, p].every(Number.isInteger) || n < 1024 || n > SCRYPT_N * 4 || r < 1 || r > 32 || p < 1 || p > 16) return false;
    const salt = Buffer.from(saltRaw, "base64url");
    const expected = Buffer.from(hashRaw, "base64url");
    if (salt.length < 8 || salt.length > 64 || expected.length !== SCRYPT_KEY_LENGTH) return false;
    const actual = crypto.scryptSync(password, salt, expected.length, { N: n, r, p, maxmem: 64 * 1024 * 1024 });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function createSessionCredentials() {
  const token = randomToken(32);
  const csrfToken = randomToken(24);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + MAX_SESSION_AGE_MS);
  return {
    token,
    tokenHash: hashToken(token),
    csrfToken,
    csrfHash: hashToken(csrfToken),
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    maxAge: SESSION_TTL_SECONDS
  };
}

function safeEqualToken(provided, expectedHash) {
  if (typeof provided !== "string" || !provided || provided.length > MAX_AUTH_TOKEN_LENGTH || typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/i.test(expectedHash)) return false;
  const actual = hashToken(provided);
  const left = Buffer.from(actual, "hex");
  const right = Buffer.from(expectedHash, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = {
  hashToken,
  randomToken,
  normalizeEmail,
  hashPassword,
  verifyPassword,
  createSessionCredentials,
  safeEqualToken
};
