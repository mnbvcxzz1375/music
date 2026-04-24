import { queryOne } from '../db/connection';
import { createUserFromOAuth, generateTokenPair } from './jwt';
import type { User } from '../db/models';

export interface WechatOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

const defaultConfig: WechatOAuthConfig = {
  appId: process.env.WECHAT_WEB_APP_ID || '',
  appSecret: process.env.WECHAT_WEB_APP_SECRET || '',
  redirectUri: process.env.WECHAT_REDIRECT_URI || 'https://musicpractice.app/api/auth/oauth/wechat/callback',
};

export function getWechatAuthUrl(state: string): string {
  const params = new URLSearchParams({
    appid: defaultConfig.appId,
    redirect_uri: defaultConfig.redirectUri,
    response_type: 'code',
    scope: 'snsapi_login',
    state,
  });
  
  return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
}

export interface WechatTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
}

export async function getWechatToken(code: string): Promise<WechatTokenResponse> {
  const response = await fetch(
    `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${defaultConfig.appId}&secret=${defaultConfig.appSecret}&code=${code}&grant_type=authorization_code`
  );
  
  if (!response.ok) {
    throw new Error('Failed to get Wechat token');
  }
  
  const data = await response.json();
  
  if (data.errcode) {
    throw new Error(`Wechat error: ${data.errmsg}`);
  }
  
  return data;
}

export interface WechatUserInfo {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
}

export async function getWechatUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
  const response = await fetch(
    `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to get Wechat user info');
  }
  
  return response.json();
}

export async function handleWechatOAuth(code: string): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
  const tokenResponse = await getWechatToken(code);
  const userInfo = await getWechatUserInfo(tokenResponse.access_token, tokenResponse.openid);
  
  const email = `${tokenResponse.openid}@wechat.musicpractice.app`;
  
  const user = await createUserFromOAuth(
    email,
    userInfo.nickname || 'WechatUser',
    'wechat',
    tokenResponse.openid,
    userInfo.headimgurl
  );
  
  const tokens = generateTokenPair(user);
  
  return { user, tokens };
}

export async function refreshWechatToken(refreshToken: string): Promise<WechatTokenResponse> {
  const response = await fetch(
    `https://api.weixin.qq.com/sns/oauth2/refresh_token?appid=${defaultConfig.appId}&grant_type=refresh_token&refresh_token=${refreshToken}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to refresh Wechat token');
  }
  
  return response.json();
}

export { defaultConfig as wechatOAuthConfig };