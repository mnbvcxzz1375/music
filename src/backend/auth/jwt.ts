import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db/connection';
import type { User } from '../db/models';

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

const defaultConfig: JwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
};

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  isPremium: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function generateAccessToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    isPremium: user.isPremium,
  };
  
  return jwt.sign(payload, defaultConfig.secret, {
    expiresIn: defaultConfig.expiresIn,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, defaultConfig.secret, {
    expiresIn: defaultConfig.refreshExpiresIn,
  });
}

export function generateTokenPair(user: User): TokenPair {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user.id),
  };
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, defaultConfig.secret) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, defaultConfig.secret) as { userId: string; type: string };
    if (decoded.type !== 'refresh') {
      return null;
    }
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair | null> {
  const decoded = verifyRefreshToken(refreshToken);
  
  if (!decoded) {
    return null;
  }
  
  const user = await queryOne<User>(
    `SELECT id, email, username, password_hash as "passwordHash",
            avatar_url as "avatarUrl", bio, role,
            created_at as "createdAt", updated_at as "updatedAt",
            last_active_at as "lastActiveAt", is_verified as "isVerified",
            is_premium as "isPremium"
     FROM users WHERE id = $1`,
    [decoded.userId]
  );
  
  if (!user) {
    return null;
  }
  
  return generateTokenPair(user);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUserFromOAuth(
  email: string,
  username: string,
  provider: string,
  providerId: string,
  avatarUrl?: string
): Promise<User> {
  const existingUser = await queryOne<User>(
    `SELECT id, email, username, password_hash as "passwordHash",
            avatar_url as "avatarUrl", bio, role,
            created_at as "createdAt", updated_at as "updatedAt",
            last_active_at as "lastActiveAt", is_verified as "isVerified",
            is_premium as "isPremium"
     FROM users WHERE email = $1`,
    [email]
  );
  
  if (existingUser) {
    await query(
      `UPDATE users SET last_active_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [existingUser.id]
    );
    return existingUser;
  }
  
  const randomPassword = await hashPassword(Math.random().toString(36));
  
  const result = await queryOne<User>(
    `INSERT INTO users (email, username, password_hash, avatar_url, role, is_verified)
     VALUES ($1, $2, $3, $4, 'user', true)
     RETURNING id, email, username, password_hash as "passwordHash",
               avatar_url as "avatarUrl", bio, role,
               created_at as "createdAt", updated_at as "updatedAt",
               last_active_at as "lastActiveAt", is_verified as "isVerified",
               is_premium as "isPremium"`,
    [email, username, randomPassword, avatarUrl]
  );
  
  if (!result) {
    throw new Error('Failed to create user from OAuth');
  }
  
  return result;
}

export async function validateToken(token: string): Promise<User | null> {
  const payload = verifyAccessToken(token);
  
  if (!payload) {
    return null;
  }
  
  const user = await queryOne<User>(
    `SELECT id, email, username, password_hash as "passwordHash",
            avatar_url as "avatarUrl", bio, role,
            created_at as "createdAt", updated_at as "updatedAt",
            last_active_at as "lastActiveAt", is_verified as "isVerified",
            is_premium as "isPremium"
     FROM users WHERE id = $1`,
    [payload.userId]
  );
  
  return user;
}

export { defaultConfig as jwtConfig };