import { Router } from 'express';
import { 
  getGoogleAuthUrl, 
  handleGoogleOAuth, 
  verifyGoogleToken 
} from '../auth/google';
import { 
  getWechatAuthUrl, 
  handleWechatOAuth 
} from '../auth/wechat';
import { 
  getGitHubAuthUrl, 
  handleGitHubOAuth 
} from '../auth/github';
import { 
  generateTokenPair, 
  refreshTokens, 
  validateToken 
} from '../auth/jwt';
import { set, get, del } from '../db/redis';

const router = Router();

const generateState = () => Math.random().toString(36).substring(2, 15);

router.get('/oauth/google', (req, res) => {
  const state = generateState();
  set(`oauth_state:${state}`, 'google', 300);
  res.redirect(getGoogleAuthUrl(state));
});

router.get('/oauth/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }
    
    const storedProvider = await get(`oauth_state:${state}`);
    if (!storedProvider || storedProvider !== 'google') {
      return res.status(400).json({ error: 'Invalid state' });
    }
    
    await del(`oauth_state:${state}`);
    
    const { user, tokens } = await handleGoogleOAuth(code as string);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isPremium: user.isPremium,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json({ error: 'OAuth failed' });
  }
});

router.get('/oauth/wechat', (req, res) => {
  const state = generateState();
  set(`oauth_state:${state}`, 'wechat', 300);
  res.redirect(getWechatAuthUrl(state));
});

router.get('/oauth/wechat/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }
    
    const storedProvider = await get(`oauth_state:${state}`);
    if (!storedProvider || storedProvider !== 'wechat') {
      return res.status(400).json({ error: 'Invalid state' });
    }
    
    await del(`oauth_state:${state}`);
    
    const { user, tokens } = await handleWechatOAuth(code as string);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isPremium: user.isPremium,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Wechat OAuth callback error:', error);
    res.status(500).json({ error: 'OAuth failed' });
  }
});

router.get('/oauth/github', (req, res) => {
  const state = generateState();
  set(`oauth_state:${state}`, 'github', 300);
  res.redirect(getGitHubAuthUrl(state));
});

router.get('/oauth/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }
    
    const storedProvider = await get(`oauth_state:${state}`);
    if (!storedProvider || storedProvider !== 'github') {
      return res.status(400).json({ error: 'Invalid state' });
    }
    
    await del(`oauth_state:${state}`);
    
    const { user, tokens } = await handleGitHubOAuth(code as string);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isPremium: user.isPremium,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    res.status(500).json({ error: 'OAuth failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }
    
    const tokens = await refreshTokens(refreshToken);
    
    if (!tokens) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Refresh failed' });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }
    
    const user = await validateToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isPremium: user.isPremium,
      },
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await del(`refresh_token:${refreshToken}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;