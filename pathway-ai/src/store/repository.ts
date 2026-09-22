/* ==========================================================================
   Repository layer — the only place the app talks to persistence.
   Swap `LocalRepository` for an HTTP implementation and nothing else changes.
   ========================================================================== */

import type { AccountState, ContentRevision, Session, User } from '@/domain/types';
import { createDebouncedWriter, kvDelete, kvGet, kvKeys, kvSet, syncStore } from '@/lib/storage';
import { hashPassword, randomSalt, randomToken, safeEqual } from '@/lib/crypto';
import { hydrateAccountState, emptyAccountState } from './defaults';
import { nowISO } from '@/lib/date';
import { uid } from '@/lib/id';

const K = {
  users: 'users',
  session: 'session',
  state: (userId: string) => `state:${userId}`,
  contentRevisions: 'admin:revisions',
} as const;

export interface AuthResult {
  ok: boolean;
  user?: User;
  error?: string;
  /** Present when a password reset was requested. Surfaced in-app rather than emailed. */
  resetToken?: string;
}

export interface Repository {
  listUsers(): Promise<User[]>;
  signUp(input: { name: string; email: string; password: string }): Promise<AuthResult>;
  logIn(input: { email: string; password: string }): Promise<AuthResult>;
  requestPasswordReset(email: string): Promise<AuthResult>;
  resetPassword(input: { email: string; token: string; password: string }): Promise<AuthResult>;
  logOut(): Promise<void>;
  currentSession(): Session | undefined;
  loadState(userId: string, displayName: string): Promise<AccountState>;
  saveState(userId: string, state: AccountState): void;
  deleteAccount(userId: string): Promise<void>;
  listContentRevisions(): Promise<ContentRevision[]>;
  addContentRevision(rev: ContentRevision): Promise<void>;
}

const SESSION_DAYS = 30;

export class LocalRepository implements Repository {
  private write = createDebouncedWriter(300);

  async listUsers(): Promise<User[]> {
    return (await kvGet<User[]>(K.users)) ?? [];
  }

  private async putUsers(users: User[]): Promise<void> {
    await kvSet(K.users, users);
  }

  private static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async signUp({ name, email, password }: { name: string; email: string; password: string }): Promise<AuthResult> {
    const normalized = LocalRepository.normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
      return { ok: false, error: 'Enter a valid email address.' };
    }
    if (password.length < 8) return { ok: false, error: 'Passwords need at least 8 characters.' };
    if (!name.trim()) return { ok: false, error: 'Tell us your name so we can personalise things.' };

    const users = await this.listUsers();
    if (users.some((u) => u.email === normalized)) {
      return { ok: false, error: 'An account already exists with that email. Try logging in.' };
    }
    const salt = randomSalt();
    const user: User = {
      id: uid('user'),
      email: normalized,
      name: name.trim(),
      role: users.length === 0 ? 'admin' : 'student',
      createdAt: nowISO(),
      lastActiveAt: nowISO(),
      passwordHash: await hashPassword(password, salt),
      passwordSalt: salt,
      provider: 'email',
    };
    await this.putUsers([...users, user]);
    await kvSet(K.state(user.id), emptyAccountState(user.id, user.name));
    this.startSession(user.id);
    return { ok: true, user };
  }

  async logIn({ email, password }: { email: string; password: string }): Promise<AuthResult> {
    const normalized = LocalRepository.normalizeEmail(email);
    const users = await this.listUsers();
    const user = users.find((u) => u.email === normalized);
    // Same message for unknown email and wrong password — don't leak which accounts exist.
    const generic = { ok: false as const, error: 'That email and password combination did not match.' };
    if (!user) return generic;
    const hash = await hashPassword(password, user.passwordSalt);
    if (!safeEqual(hash, user.passwordHash)) return generic;
    user.lastActiveAt = nowISO();
    await this.putUsers(users.map((u) => (u.id === user.id ? user : u)));
    this.startSession(user.id);
    return { ok: true, user };
  }

  async requestPasswordReset(email: string): Promise<AuthResult> {
    const normalized = LocalRepository.normalizeEmail(email);
    const users = await this.listUsers();
    const user = users.find((u) => u.email === normalized);
    if (!user) {
      // Don't confirm whether the address exists.
      return { ok: true };
    }
    const token = randomToken(8);
    user.resetToken = { token, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
    await this.putUsers(users.map((u) => (u.id === user.id ? user : u)));
    // A server build would email this. Here it is returned so the demo flow can complete.
    return { ok: true, resetToken: token };
  }

  async resetPassword({ email, token, password }: { email: string; token: string; password: string }): Promise<AuthResult> {
    if (password.length < 8) return { ok: false, error: 'Passwords need at least 8 characters.' };
    const normalized = LocalRepository.normalizeEmail(email);
    const users = await this.listUsers();
    const user = users.find((u) => u.email === normalized);
    if (!user?.resetToken) return { ok: false, error: 'That reset link is no longer valid. Request a new one.' };
    if (!safeEqual(user.resetToken.token, token.trim())) {
      return { ok: false, error: 'That reset code did not match.' };
    }
    if (new Date(user.resetToken.expiresAt).getTime() < Date.now()) {
      return { ok: false, error: 'That reset code has expired. Request a new one.' };
    }
    const salt = randomSalt();
    user.passwordSalt = salt;
    user.passwordHash = await hashPassword(password, salt);
    delete user.resetToken;
    await this.putUsers(users.map((u) => (u.id === user.id ? user : u)));
    this.startSession(user.id);
    return { ok: true, user };
  }

  private startSession(userId: string): void {
    const session: Session = {
      userId,
      startedAt: nowISO(),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString(),
    };
    syncStore.set(K.session, session);
  }

  currentSession(): Session | undefined {
    const session = syncStore.get<Session>(K.session);
    if (!session) return undefined;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      syncStore.remove(K.session);
      return undefined;
    }
    return session;
  }

  async logOut(): Promise<void> {
    syncStore.remove(K.session);
  }

  async loadState(userId: string, displayName: string): Promise<AccountState> {
    const raw = await kvGet<unknown>(K.state(userId));
    return hydrateAccountState(raw, userId, displayName);
  }

  saveState(userId: string, state: AccountState): void {
    this.write(K.state(userId), state);
  }

  async deleteAccount(userId: string): Promise<void> {
    const users = await this.listUsers();
    await this.putUsers(users.filter((u) => u.id !== userId));
    await kvDelete(K.state(userId));
    syncStore.remove(K.session);
  }

  async listContentRevisions(): Promise<ContentRevision[]> {
    return (await kvGet<ContentRevision[]>(K.contentRevisions)) ?? [];
  }

  async addContentRevision(rev: ContentRevision): Promise<void> {
    const all = await this.listContentRevisions();
    await kvSet(K.contentRevisions, [rev, ...all].slice(0, 500));
  }

  /** Diagnostic helper used by Settings → Data. */
  async debugKeys(): Promise<string[]> {
    return kvKeys();
  }
}

export const repository: Repository = new LocalRepository();
