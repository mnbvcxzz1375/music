import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, BarChart, Crown } from 'lucide-react';
import { Button, Input, Tabs } from '../UI';
import { useAuthStore } from '@/services/auth';
import { useI18n } from '@/i18n';
import { useSubscriptionStore } from '@/services/subscription';

export interface UserPageProps {
  onSuccess?: () => void;
}

export function UserPage({ onSuccess: _onSuccess }: UserPageProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();
  
  const { isAuthenticated, user, logout } = useAuthStore();
  const { isPremium } = useSubscriptionStore();

  // If already authenticated, show Profile View (Hostinger Style Cards)
  if (isAuthenticated && user) {
    return (
      <div className="user-page profile-page">
        <div className="profile-header">
          <div className="avatar-circle">{user.nickname?.[0] || 'U'}</div>
          <div className="user-info">
            <h2 className="username">{user.nickname}</h2>
            <p className="user-email">{user.email}</p>
            {isPremium() && (
              <div className="premium-badge-large">
                <Crown size={16} /> Premium
              </div>
            )}
          </div>
          <Button variant="danger" className="logout-btn" onClick={() => { logout(); navigate('/'); }}>
            登出
          </Button>
        </div>

        <div className="profile-actions-grid">
          <Link to="/subscription">
            <div className="action-card">
              <div className="icon-box gold">
                <Crown size={24} />
              </div>
              <div className="text-group">
                <h3>会员管理</h3>
                <p>查看权益与续费</p>
              </div>
            </div>
          </Link>
          
          <Link to="/statistics">
            <div className="action-card">
              <div className="icon-box green">
                <BarChart size={24} />
              </div>
              <div className="text-group">
                <h3>练习统计</h3>
                <p>历史数据分析</p>
              </div>
            </div>
          </Link>

          <Link to="/user/settings">
            <div className="action-card">
              <div className="icon-box">
                <Settings size={24} />
              </div>
              <div className="text-group">
                <h3>设置</h3>
                <p>个性化配置</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // If not authenticated, show Instagram Login Style
  return (
    <div className="login-page">
      {/* Left Side - Preview Gradient */}
      <div className="login-preview">
        <span style={{ transform: 'rotate(-10deg)' }}>🎵</span>
      </div>

      {/* Right Side - Form */}
      <div className="login-form-section">
        <div className="login-card">
          <h1 className="login-logo">Resonance</h1>
          
          <Tabs
            items={[
              { id: 'login', label: t.user.login },
              { id: 'register', label: t.user.register },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
            variant="underline"
          />

          {activeTab === 'login' && (
            <LoginForm onSuccess={() => { navigate('/library'); }} />
          )}

          {activeTab === 'register' && (
            <RegisterForm onSuccess={() => { navigate('/library'); }} />
          )}

          <div className="login-divider">
            <div className="line"></div>
            <span>OR</span>
            <div className="line"></div>
          </div>

          <Button variant="primary" fullWidth className="login-btn">
            第三方登录
          </Button>
        </div>

        <div className="login-switch">
          {activeTab === 'login' ? (
            <p>没有账号？ <span onClick={() => setActiveTab('register')} className="switch-link">立即注册</span></p>
          ) : (
            <p>已有账号？ <span onClick={() => setActiveTab('login')} className="switch-link">登录</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      onSuccess();
    } catch (err) {
      alert('登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Input
        label=""
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.user.email}
        required
        className="login-input"
      />
      <Input
        label=""
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t.user.password}
        required
        className="login-input"
      />
      <Button
        variant="primary"
        fullWidth
        loading={loading}
        type="submit"
        className="login-btn"
      >
        登录
      </Button>
    </form>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ email, password, nickname: nickname || '用户', instrument: 'other' });
      onSuccess();
    } catch (err) {
      alert('注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Input
        label=""
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="昵称"
        className="login-input"
      />
      <Input
        label=""
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.user.email}
        required
        className="login-input"
      />
      <Input
        label=""
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t.user.password}
        required
        className="login-input"
      />
      <Input
        label=""
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="再次输入密码"
        required
        className="login-input"
      />
      <Button
        variant="primary"
        fullWidth
        loading={loading}
        type="submit"
        className="login-btn"
      >
        注册
      </Button>
    </form>
  );
}
