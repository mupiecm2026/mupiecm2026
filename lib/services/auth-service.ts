import { createKVStore } from "./kv/kv-store.factory";
import { KVStore } from "./kv/kv-store.interface";
import { createSessionToken, createSalt, hashPassword, verifyPassword } from "../utils/security";
import { UserRole } from "../../types/types";

interface UserRecord {
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  createdAt: string;
}

interface SessionRecord {
  token: string;
  email: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
}

function getEnv(): any {
  return (globalThis as any).__ENV__ || (globalThis as any).process?.env || null;
}

export class AuthService {
  private kv: KVStore | null = null;

  private async getKV(): Promise<KVStore> {
    if (!this.kv) {
      this.kv = await createKVStore(getEnv());
    }
    return this.kv;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const kv = await this.getKV();
    const normalized = this.normalizeEmail(email);
    const raw = await kv.get(`user:${normalized}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserRecord;
    } catch {
      return null;
    }
  }

  async registerUser(email: string, password: string, role: UserRole = "user"): Promise<UserRecord> {
    const normalized = this.normalizeEmail(email);
    const existing = await this.getUserByEmail(normalized);
    if (existing) {
      throw new Error("Já existe uma conta com este email.");
    }
    const { hash, salt } = await hashPassword(password);
    const user: UserRecord = {
      email: normalized,
      passwordHash: hash,
      salt,
      role,
      createdAt: new Date().toISOString(),
    };

    const kv = await this.getKV();
    await kv.put(`user:${normalized}`, JSON.stringify(user));
    return user;
  }

  async verifyUser(email: string, password: string): Promise<UserRecord> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error("Usuário ou senha inválidos.");
    }
    const isValid = await verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      throw new Error("Usuário ou senha inválidos.");
    }
    return user;
  }

  async createSession(email: string): Promise<SessionRecord> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error("Usuário não encontrado.");
    }
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const session: SessionRecord = {
      token,
      email: this.normalizeEmail(email),
      role: user.role,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    const kv = await this.getKV();
    await kv.put(`session:${token}`, JSON.stringify(session));
    return session;
  }

  async getSession(token: string): Promise<SessionRecord | null> {
    const kv = await this.getKV();
    const raw = await kv.get(`session:${token}`);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as SessionRecord;
      if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
        await kv.delete(`session:${token}`);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  async deleteSession(token: string): Promise<void> {
    const kv = await this.getKV();
    await kv.delete(`session:${token}`);
  }
}

export const authService = new AuthService();
