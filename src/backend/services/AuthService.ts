import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';

interface RegisterInput {
  email: string;
  password: string;
  nickname?: string;
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

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

export class AuthService {
  private refreshTokens: Map<string, { userId: string; expiresAt: Date; isRevoked: boolean }> = new Map();

  async register(input: RegisterInput): Promise<LoginResult> {
    const existingUser = await this.findUserByEmail(input.email);
    
    if (existingUser) {
      throw new Error('User already exists with this email');
    }
    
    const hashedPassword = await bcrypt.hash(input.password, 12);
    
    const user: User = {
      id: this.generateId(),
      email: input.email,
      passwordHash: hashedPassword,
      nickname: input.nickname || input.email.split('@')[0],
      subscriptionStatus: 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await this.saveUser(user);
    
    const tokens = this.generateTokens(user);
    
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(input: { email: string; password: string }): Promise<LoginResult> {
    const user = await this.findUserByEmail(input.email);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    
    if (!isValid) {
      throw new Error('Invalid email or password');
    }
    
    user.lastLoginAt = new Date();
    await this.saveUser(user);
    
    const tokens = this.generateTokens(user);
    
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<RefreshResult> {
    const storedToken = this.refreshTokens.get(refreshToken);
    
    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }
    
    const user = await this.findUserById(storedToken.userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    this.refreshTokens.delete(refreshToken);
    
    const tokens = this.generateTokens(user);
    
    return tokens;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      this.refreshTokens.delete(refreshToken);
    } else {
      for (const [token, data] of this.refreshTokens.entries()) {
        if (data.userId === userId) {
          this.refreshTokens.delete(token);
        }
      }
    }
  }

  async oauthGoogle(token: string): Promise<LoginResult> {
    const googleUser = await this.verifyGoogleToken(token);
    
    let user = await this.findUserByEmail(googleUser.email);
    
    if (!user) {
      user = {
        id: this.generateId(),
        email: googleUser.email,
        passwordHash: '',
        nickname: googleUser.name,
        avatarUrl: googleUser.picture,
        subscriptionStatus: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await this.saveUser(user);
    }
    
    user.lastLoginAt = new Date();
    await this.saveUser(user);
    
    const tokens = this.generateTokens(user);
    
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.findUserById(userId);
  }

  private generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      subscriptionStatus: user.subscriptionStatus,
      permissions: this.getPermissions(user.subscriptionStatus),
    };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    
    const refreshToken = this.generateRefreshToken();
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
    });
    
    return { accessToken, refreshToken };
  }

  private generateRefreshToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private getPermissions(subscriptionStatus: string): string[] {
    if (subscriptionStatus === 'premium') {
      return ['premium', 'advanced_analysis', 'unlimited_ocr', 'premium_pieces'];
    }
    return ['basic_practice', 'basic_statistics'];
  }

  private sanitizeUser(user: User): User {
    return {
      ...user,
      passwordHash: undefined,
    } as User;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    return null;
  }

  private async findUserById(id: string): Promise<User | null> {
    return null;
  }

  private async saveUser(user: User): Promise<void> {
  }

  private async verifyGoogleToken(token: string): Promise<{ email: string; name: string; picture: string }> {
    return {
      email: 'test@example.com',
      name: 'Test User',
      picture: '',
    };
  }
}