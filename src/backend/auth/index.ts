export {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  refreshTokens,
  hashPassword,
  verifyPassword,
  createUserFromOAuth,
  validateToken,
  jwtConfig,
} from './jwt';

export type { JwtConfig, TokenPayload, TokenPair } from './jwt';

export {
  getGoogleAuthUrl,
  getGoogleToken,
  getGoogleUserInfo,
  handleGoogleOAuth,
  verifyGoogleToken,
  googleOAuthConfig,
} from './google';

export type { GoogleOAuthConfig, GoogleTokenResponse, GoogleUserInfo } from './google';

export {
  getWechatAuthUrl,
  getWechatToken,
  getWechatUserInfo,
  handleWechatOAuth,
  refreshWechatToken,
  wechatOAuthConfig,
} from './wechat';

export type { WechatOAuthConfig, WechatTokenResponse, WechatUserInfo } from './wechat';

export {
  getGitHubAuthUrl,
  getGitHubToken,
  getGitHubUserInfo,
  getGitHubUserEmails,
  handleGitHubOAuth,
  githubOAuthConfig,
} from './github';

export type { GitHubOAuthConfig, GitHubTokenResponse, GitHubUserInfo } from './github';