import { queryOne } from '../db/connection';
import { createUserFromOAuth, generateTokenPair } from './jwt';
import type { User } from '../db/models';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const defaultConfig: GoogleOAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5174/api/auth/oauth/google/callback',
};

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: defaultConfig.clientId,
    redirect_uri: defaultConfig.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token: string;
}

export async function getGoogleToken(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: defaultConfig.clientId,
      client_secret: defaultConfig.clientSecret,
      redirect_uri: defaultConfig.redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to get Google token');
  }
  
  return response.json();
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get Google user info');
  }
  
  return response.json();
}

export async function handleGoogleOAuth(code: string): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
  const tokenResponse = await getGoogleToken(code);
  const userInfo = await getGoogleUserInfo(tokenResponse.access_token);
  
  const user = await createUserFromOAuth(
    userInfo.email,
    userInfo.name || userInfo.email.split('@')[0],
    'google',
    userInfo.id,
    userInfo.picture
  );
  
  const tokens = generateTokenPair(user);
  
  return { user, tokens };
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo | null> {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
  
  if (!response.ok) {
    return null;
  }
  
  const data = await response.json();
  
  if (data.aud !== defaultConfig.clientId) {
    return null;
  }
  
  return {
    id: data.sub,
    email: data.email,
    verified_email: data.email_verified === 'true',
    name: data.name,
    given_name: data.given_name,
    family_name: data.family_name,
    picture: data.picture,
  };
}

export { defaultConfig as googleOAuthConfig };