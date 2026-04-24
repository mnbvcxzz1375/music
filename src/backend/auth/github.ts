import { queryOne } from '../db/connection';
import { createUserFromOAuth, generateTokenPair } from './jwt';
import type { User } from '../db/models';

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const defaultConfig: GitHubOAuthConfig = {
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:5174/api/auth/oauth/github/callback',
};

export function getGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: defaultConfig.clientId,
    redirect_uri: defaultConfig.redirectUri,
    scope: 'user:email',
    state,
    allow_signup: 'true',
  });
  
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export async function getGitHubToken(code: string): Promise<GitHubTokenResponse> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: defaultConfig.clientId,
      client_secret: defaultConfig.clientSecret,
      code,
      redirect_uri: defaultConfig.redirectUri,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to get GitHub token');
  }
  
  return response.json();
}

export interface GitHubUserInfo {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  bio: string | null;
}

export async function getGitHubUserInfo(accessToken: string): Promise<GitHubUserInfo> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get GitHub user info');
  }
  
  return response.json();
}

export async function getGitHubUserEmails(accessToken: string): Promise<{ email: string; primary: boolean; verified: boolean }[]> {
  const response = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  
  if (!response.ok) {
    return [];
  }
  
  return response.json();
}

export async function handleGitHubOAuth(code: string): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
  const tokenResponse = await getGitHubToken(code);
  const userInfo = await getGitHubUserInfo(tokenResponse.access_token);
  const emails = await getGitHubUserEmails(tokenResponse.access_token);
  
  const primaryEmail = emails.find(e => e.primary && e.verified)?.email || 
                       emails.find(e => e.verified)?.email ||
                       userInfo.email ||
                       `${userInfo.login}@github.musicpractice.app`;
  
  const user = await createUserFromOAuth(
    primaryEmail,
    userInfo.name || userInfo.login,
    'github',
    userInfo.id.toString(),
    userInfo.avatar_url
  );
  
  const tokens = generateTokenPair(user);
  
  return { user, tokens };
}

export { defaultConfig as githubOAuthConfig };