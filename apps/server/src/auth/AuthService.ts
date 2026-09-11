import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import type { PrismaClient } from '@prisma/client';
import type { UserRole } from '@chess3d/shared';

const scryptAsync = promisify(scrypt);
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_KEY_LENGTH = 64;

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  rating: number;
  role?: UserRole;
}

export interface RegisterInput {
  username?: string;
  email?: string;
  password?: string;
}

export interface LoginInput {
  username?: string;
  password?: string;
}

export interface AuthResult {
  user: AuthUser;
  sessionToken: string;
}

export interface AuthProvider {
  register(input: RegisterInput): Promise<AuthResult>;
  login(input: LoginInput): Promise<AuthResult>;
  authenticate(sessionToken: string | undefined): Promise<AuthUser | undefined>;
  logout(sessionToken: string | undefined): Promise<void>;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

export class PrismaAuthProvider implements AuthProvider {
  constructor(
    private readonly client: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const username = normalizeUsername(input.username);
    const email = normalizeEmail(input.email);
    const password = input.password ?? '';
    validateCredentials(username, password);

    const existing = await this.client.user.findFirst({
      where: {
        OR: [{ username }, ...(email ? [{ email }] : [])],
      },
    });
    if (existing) throw new AuthError('Username or email is already registered', 409);

    const user = await this.client.user.create({
      data: {
        username,
        email,
        passwordHash: await hashPassword(password),
        lastOnline: this.now(),
      },
    });
    return this.createSession(toAuthUser(user));
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const username = normalizeUsername(input.username);
    const password = input.password ?? '';
    if (!username || !password) throw new AuthError('Invalid username or password', 401);

    const user = await this.client.user.findUnique({ where: { username } });
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new AuthError('Invalid username or password', 401);
    }

    await this.client.user.update({
      where: { id: user.id },
      data: { lastOnline: this.now() },
    });
    return this.createSession(toAuthUser(user));
  }

  async authenticate(sessionToken: string | undefined): Promise<AuthUser | undefined> {
    if (!sessionToken) return undefined;

    const session = await this.client.session.findUnique({
      where: { tokenHash: hashToken(sessionToken) },
      include: { user: true },
    });
    if (!session) return undefined;

    if (session.expiresAt <= this.now()) {
      await this.client.session.delete({ where: { id: session.id } });
      return undefined;
    }

    const now = this.now();
    await Promise.all([
      this.client.session.update({ where: { id: session.id }, data: { lastSeenAt: now } }),
      this.client.user.update({ where: { id: session.user.id }, data: { lastOnline: now } }),
    ]);
    return toAuthUser(session.user);
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) return;
    await this.client.session.deleteMany({ where: { tokenHash: hashToken(sessionToken) } });
  }

  private async createSession(user: AuthUser): Promise<AuthResult> {
    const sessionToken = randomBytes(32).toString('hex');
    const createdAt = this.now();
    await this.client.session.create({
      data: {
        tokenHash: hashToken(sessionToken),
        userId: user.id,
        expiresAt: new Date(createdAt.getTime() + SESSION_TTL_MS),
        createdAt,
        lastSeenAt: createdAt,
      },
    });
    return { user, sessionToken };
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [, salt, encodedKey] = storedHash.split('$');
  if (!salt || !encodedKey) return false;

  const expectedKey = Buffer.from(encodedKey, 'hex');
  const actualKey = (await scryptAsync(password, salt, expectedKey.length)) as Buffer;
  return expectedKey.length === actualKey.length && timingSafeEqual(expectedKey, actualKey);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeUsername(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function normalizeEmail(value: string | undefined): string | undefined {
  const email = value?.trim().toLowerCase();
  return email || undefined;
}

function validateCredentials(username: string, password: string): void {
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new AuthError('Username must contain 3-24 lowercase letters, numbers or underscores');
  }
  if (password.length < 8) throw new AuthError('Password must contain at least 8 characters');
}

function toAuthUser(user: {
  id: string;
  username: string;
  email: string | null;
  rating: number;
  role?: string;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email ?? undefined,
    rating: user.rating,
    role: toUserRole(user.role),
  } satisfies AuthUser;
}

function toUserRole(role: string | undefined): UserRole {
  if (role?.toLowerCase() === 'admin') return 'admin';
  if (role?.toLowerCase() === 'spectator') return 'spectator';
  return 'user';
}
