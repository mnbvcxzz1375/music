import { query, queryOne, queryMany, transaction } from './connection';
import type { User } from './models';
import bcrypt from 'bcryptjs';

export async function createUser(
  email: string,
  username: string,
  password: string
): Promise<User> {
  const passwordHash = await bcrypt.hash(password, 10);
  
  const result = await queryOne<User>(
    `INSERT INTO users (email, username, password_hash, role, is_verified, is_premium)
     VALUES ($1, $2, $3, 'user', false, false)
     RETURNING id, email, username, password_hash as "passwordHash", 
               avatar_url as "avatarUrl", bio, role, 
               created_at as "createdAt", updated_at as "updatedAt",
               last_active_at as "lastActiveAt", is_verified as "isVerified", 
               is_premium as "isPremium"`,
    [email, username, passwordHash]
  );
  
  if (!result) {
    throw new Error('Failed to create user');
  }
  
  return result;
}

export async function getUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    `SELECT id, email, username, password_hash as "passwordHash",
            avatar_url as "avatarUrl", bio, role,
            created_at as "createdAt", updated_at as "updatedAt",
            last_active_at as "lastActiveAt", is_verified as "isVerified",
            is_premium as "isPremium"
     FROM users WHERE id = $1`,
    [id]
  );
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return queryOne<User>(
    `SELECT id, email, username, password_hash as "passwordHash",
            avatar_url as "avatarUrl", bio, role,
            created_at as "createdAt", updated_at as "updatedAt",
            last_active_at as "lastActiveAt", is_verified as "isVerified",
            is_premium as "isPremium"
     FROM users WHERE email = $1`,
    [email]
  );
}

export async function getUserByUsername(username: string): Promise<User | null> {
  return queryOne<User>(
    `SELECT id, email, username, password_hash as "passwordHash",
            avatar_url as "avatarUrl", bio, role,
            created_at as "createdAt", updated_at as "updatedAt",
            last_active_at as "lastActiveAt", is_verified as "isVerified",
            is_premium as "isPremium"
     FROM users WHERE username = $1`,
    [username]
  );
}

export async function updateUser(
  id: string,
  updates: Partial<{
    username: string;
    avatarUrl: string;
    bio: string;
    isVerified: boolean;
    isPremium: boolean;
    lastActiveAt: Date;
  }>
): Promise<User | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  
  if (updates.username !== undefined) {
    fields.push(`username = $${paramIndex}`);
    values.push(updates.username);
    paramIndex++;
  }
  if (updates.avatarUrl !== undefined) {
    fields.push(`avatar_url = $${paramIndex}`);
    values.push(updates.avatarUrl);
    paramIndex++;
  }
  if (updates.bio !== undefined) {
    fields.push(`bio = $${paramIndex}`);
    values.push(updates.bio);
    paramIndex++;
  }
  if (updates.isVerified !== undefined) {
    fields.push(`is_verified = $${paramIndex}`);
    values.push(updates.isVerified);
    paramIndex++;
  }
  if (updates.isPremium !== undefined) {
    fields.push(`is_premium = $${paramIndex}`);
    values.push(updates.isPremium);
    paramIndex++;
  }
  if (updates.lastActiveAt !== undefined) {
    fields.push(`last_active_at = $${paramIndex}`);
    values.push(updates.lastActiveAt);
    paramIndex++;
  }
  
  fields.push(`updated_at = NOW()`);
  values.push(id);
  
  const result = await queryOne<User>(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, email, username, password_hash as "passwordHash",
               avatar_url as "avatarUrl", bio, role,
               created_at as "createdAt", updated_at as "updatedAt",
               last_active_at as "lastActiveAt", is_verified as "isVerified",
               is_premium as "isPremium"`,
    values
  );
  
  return result;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM users WHERE id = $1',
    [id]
  );
  
  return result.rowCount > 0;
}

export async function verifyPassword(
  user: User,
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function changePassword(
  id: string,
  newPassword: string
): Promise<boolean> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  const result = await query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [passwordHash, id]
  );
  
  return result.rowCount > 0;
}

export async function getUsers(
  limit: number = 20,
  offset: number = 0
): Promise<User[]> {
  return queryMany<User>(
    `SELECT id, email, username, password_hash as "passwordHash",
            avatar_url as "avatarUrl", bio, role,
            created_at as "createdAt", updated_at as "updatedAt",
            last_active_at as "lastActiveAt", is_verified as "isVerified",
            is_premium as "isPremium"
     FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

export async function countUsers(): Promise<number> {
  const result = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM users'
  );
  
  return parseInt(result?.count || '0');
}

export async function searchUsers(
  searchTerm: string,
  limit: number = 20
): Promise<User[]> {
  return queryMany<User>(
    `SELECT id, email, username, password_hash as "passwordHash",
            avatar_url as "avatarUrl", bio, role,
            created_at as "createdAt", updated_at as "updatedAt",
            last_active_at as "lastActiveAt", is_verified as "isVerified",
            is_premium as "isPremium"
     FROM users 
     WHERE username ILIKE $1 OR email ILIKE $1
     ORDER BY created_at DESC LIMIT $2`,
    [`%${searchTerm}%`, limit]
  );
}