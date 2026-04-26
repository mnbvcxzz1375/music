import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../db/models';
import * as usersRepo from '../db/users';
import * as redis from '../db/redis';
import { generateAccessToken, generateRefreshToken, generateTokenPair, verifyAccessToken } from '../auth/jwt';

interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds

export class Auth {
  /**
   * Registers a new user.
   * 1. Checks if email/username exists.
   * 2. Creates user in PostgreSQL.
   * 3. Generates JWT pair.
   * 4. Stores refresh token in Redis.
   */
  async register(input: RegisterInput): Promise<LoginResult> {
    const existingEmail = await usersRepo.getUserByEmail(input.email);
    if (existingEmail) throw new Error('Email already registered');

    const existingUsername = await usersRepo.getUserByUsername(input.username);
    if (existingUsername) throw new Error('Username already taken');

    const user = await usersRepo.createUser(input.email, input.username, input.password);
    const sanitizedUser = this.sanitize(user);
    const tokens = this.createTokens(sanitizedUser);

    await redis.set(`refresh_token:${tokens.refreshToken}`, user.id);
    await redis.expire(`refresh_token:${tokens.refreshToken}`, REFRESH_TOKEN_EXPIRES_IN);

    return { user: sanitizedUser, ...tokens };
  }

  /**
   * Logs in an existing user.
   * 1. Finds user by email.
   * 2. Verifies password hash.
   * 3. Updates last_active_at.
   * 4. Generates tokens and stores refresh token in Redis.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await usersRepo.getUserByEmail(email);
    if (!user) throw new Error('Invalid email or password');

    const isValid = await usersRepo.verifyPassword(user, password);
    if (!isValid) throw new Error('Invalid email or password');

    // Update last active time
    await usersRepo.updateUser(user.id, { lastActiveAt: new Date() });

    const sanitizedUser = this.sanitize(user);
    const tokens = this.createTokens(sanitizedUser);

    // Store refresh token in Redis with 7-day expiry
    await redis.set(`refresh_token:${tokens.refreshToken}`, user.id);
    await redis.expire(`refresh_token:${tokens.refreshToken}`, REFRESH_TOKEN_EXPIRES_IN);

    return { user: sanitizedUser, ...tokens };
  }

  /**
   * Refreshes access and refresh tokens using a valid refresh token.
   * Implements token rotation (old refresh token is deleted).
   */
  async refreshTokens(refreshToken: string): Promise<RefreshResult> {
    const userId = await redis.get(`refresh_token:${refreshToken}`);
    if (!userId) throw new Error('Invalid or expired refresh token');

    // Token rotation: delete the old one immediately
    await redis.del(`refresh_token:${refreshToken}`);

    const user = await usersRepo.getUserById(userId);
    if (!user) throw new Error('User not found');

    const sanitizedUser = this.sanitize(user);
    const tokens = this.createTokens(sanitizedUser);

    // Save new refresh token
    await redis.set(`refresh_token:${tokens.refreshToken}`, userId);
    await redis.expire(`refresh_token:${tokens.refreshToken}`, REFRESH_TOKEN_EXPIRES_IN);

    return tokens;
  }

  /**
   * Logs out the user by revoking the specified refresh token from Redis.
   */
  async logout(refreshToken: string): Promise<void> {
    const userId = await redis.get(`refresh_token:${refreshToken}`);
    if (!userId) throw new Error('Invalid refresh token');

    await redis.del(`refresh_token:${refreshToken}`);
  }

  /**
   * Gets the current authenticated user's profile.
   */
  async getProfile(userId: string): Promise<User | null> {
    const user = await usersRepo.getUserById(userId);
    return user ? this.sanitize(user) : null;
  }

  /**
   * Sanitizes a user object to prevent sensitive data leaks.
   */
  private sanitize(user: User): User {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  /**
   * Generates access and refresh tokens.
   */
  private createTokens(user: User): { accessToken: string; refreshToken: string } {
    return generateTokenPair(user);
  }
}

export const authService = new Auth();
