"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = fs.promises;
const path = require("node:path");
const {
  createSessionCredentials,
  hashPassword,
  hashToken,
  normalizeEmail,
  randomToken,
  safeEqualToken,
  verifyPassword
} = require("./auth");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultAuthState() {
  return { version: 1, users: [], sessions: [] };
}

class AuthStore {
  constructor(filePath = path.join(__dirname, "..", "data", "auth.json"), { now = () => Date.now() } = {}) {
    this.filePath = path.resolve(filePath);
    this.now = now;
    this.initialization = null;
    this.writeQueue = Promise.resolve();
  }

  async init() {
    if (!this.initialization) {
      this.initialization = (async () => {
        await fsp.mkdir(path.dirname(this.filePath), { recursive: true });
        try {
          await fsp.access(this.filePath, fs.constants.F_OK);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          await this.write(defaultAuthState());
        }
        const raw = await fsp.readFile(this.filePath, "utf8");
        this.normalize(JSON.parse(raw));
      })().catch((error) => {
        this.initialization = null;
        throw error;
      });
    }
    return this.initialization;
  }

  normalize(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.users) || !Array.isArray(value.sessions)) {
      throw new Error("The authentication store is not a valid v1 document.");
    }
    return value;
  }

  async read() {
    await this.init();
    const raw = await fsp.readFile(this.filePath, "utf8");
    return clone(this.normalize(JSON.parse(raw)));
  }

  async write(value) {
    const next = this.normalize(clone(value));
    const serialized = `${JSON.stringify(next, null, 2)}\n`;
    const temporaryPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    let handle;
    try {
      handle = await fsp.open(temporaryPath, "wx", 0o600);
      await handle.writeFile(serialized, "utf8");
      await handle.sync();
      await handle.close();
      handle = null;
      await fsp.rename(temporaryPath, this.filePath);
    } finally {
      if (handle) await handle.close().catch(() => undefined);
      await fsp.unlink(temporaryPath).catch(() => undefined);
    }
    return clone(next);
  }

  update(mutator) {
    const operation = this.writeQueue.then(async () => {
      await this.init();
      const current = await this.read();
      const next = await mutator(current);
      return this.write(next);
    });
    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async createUser({ name, email, password, tenantId, workspaceId }) {
    const normalizedEmail = normalizeEmail(email);
    const user = {
      id: `user-${crypto.randomUUID()}`,
      name,
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      tenantId,
      workspaceId,
      createdAt: new Date(this.now()).toISOString()
    };
    await this.update((state) => {
      if (state.users.some((candidate) => candidate.email === normalizedEmail)) {
        const error = new Error("An account already exists for that email.");
        error.code = "ACCOUNT_EXISTS";
        error.statusCode = 409;
        throw error;
      }
      state.users.push(user);
      return state;
    });
    return this.publicUser(user);
  }

  async authenticate(email, password) {
    const state = await this.read();
    const normalizedEmail = normalizeEmail(email);
    const user = state.users.find((candidate) => candidate.email === normalizedEmail);
    if (!user || !verifyPassword(password, user.passwordHash)) return null;
    return this.publicUser(user);
  }

  async userById(id) {
    const state = await this.read();
    const user = state.users.find((candidate) => candidate.id === id);
    return user ? this.publicUser(user) : null;
  }

  publicUser(user) {
    return { id: user.id, name: user.name, email: user.email, tenantId: user.tenantId, workspaceId: user.workspaceId };
  }

  async createSession(userId) {
    const credentials = createSessionCredentials();
    const session = {
      id: `session-${randomToken(18)}`,
      userId,
      tokenHash: credentials.tokenHash,
      csrfHash: credentials.csrfHash,
      createdAt: credentials.createdAt,
      expiresAt: credentials.expiresAt
    };
    await this.update((state) => {
      state.sessions = state.sessions.filter((candidate) => Date.parse(candidate.expiresAt) > this.now() && candidate.userId !== userId);
      state.sessions.push(session);
      return state;
    });
    return { ...credentials, sessionId: session.id };
  }

  async resolveSession(token) {
    if (!token) return null;
    const state = await this.read();
    const session = state.sessions.find((candidate) => safeEqualToken(token, candidate.tokenHash));
    if (!session || Date.parse(session.expiresAt) <= this.now()) return null;
    const user = state.users.find((candidate) => candidate.id === session.userId);
    if (!user) return null;
    return { session: clone(session), user: this.publicUser(user) };
  }

  async csrfValid(session, token) {
    return Boolean(session && safeEqualToken(token, session.csrfHash));
  }

  async revoke(token) {
    if (!token) return;
    const tokenHash = hashToken(token);
    await this.update((state) => {
      state.sessions = state.sessions.filter((session) => session.tokenHash !== tokenHash);
      return state;
    });
  }
}

module.exports = { AuthStore };
