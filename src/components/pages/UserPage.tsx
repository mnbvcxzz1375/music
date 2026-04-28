import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart, Crown, Settings, ShieldCheck } from 'lucide-react';
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

  if (isAuthenticated && user) {
    return (
      <div className="user-page profile-page">
        <button className="profile-back-btn" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> 返回
        </button>

        <div className="profile-header">
          <div className="avatar-circle">{user.nickname?.[0]?.toUpperCase() || 'U'}</div>
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
            退出登录
          </Button>
        </div>

        <div className="profile-actions-grid">
          <Link to="/subscription" className="action-card-link">
            <div className="action-card">
              <div className="icon-box gold"><Crown size={24} /></div>
              <div className="text-group">
                <h3>会员管理</h3>
                <p>查看权益、续费与升级方案</p>
              </div>
            </div>
          </Link>

          <Link to="/statistics" className="action-card-link">
            <div className="action-card">
              <div className="icon-box green"><BarChart size={24} /></div>
              <div className="text-group">
                <h3>练习统计</h3>
                <p>查看历史表现和进步趋势</p>
              </div>
            </div>
          </Link>

          <Link to="/user/settings" className="action-card-link">
            <div className="action-card">
              <div className="icon-box"><Settings size={24} /></div>
              <div className="text-group">
                <h3>账号设置</h3>
                <p>管理个人资料和偏好设置</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <section className="login-preview" aria-hidden="true">
        <div className="login-device">
          <div className="login-device-score">♪</div>
          <div className="login-device-bars">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-card">
          <h1 className="login-logo">Resonance</h1>
          <p className="login-tagline">登录后同步曲库、练习记录和谱面导入结果。</p>

          <Tabs
            items={[
              { id: 'login', label: t.user.login },
              { id: 'register', label: t.user.register },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
            variant="underline"
          />

          {activeTab === 'login' && <LoginForm onSuccess={() => navigate('/library')} />}
          {activeTab === 'register' && <RegisterForm onSuccess={() => navigate('/library')} />}

          <div className="login-divider">
            <div className="line" />
            <span>或</span>
            <div className="line" />
          </div>

          <Button variant="secondary" fullWidth className="login-btn" icon={<ShieldCheck size={18} />}>
            使用第三方账号登录
          </Button>
        </div>

        <div className="login-switch">
          {activeTab === 'login' ? (
            <p>没有账号？<button type="button" onClick={() => setActiveTab('register')} className="switch-link">立即注册</button></p>
          ) : (
            <p>已有账号？<button type="button" onClick={() => setActiveTab('login')} className="switch-link">去登录</button></p>
          )}
        </div>
      </section>
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : '登录失败，请检查账号或网络。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.user.email} required className="login-input" />
      <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t.user.password} required className="login-input" />
      <Button variant="primary" fullWidth loading={loading} type="submit" className="login-btn">
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      alert('两次输入的密码不一致。');
      return;
    }

    setLoading(true);
    try {
      await register({ email, password, nickname: nickname || '用户', instrument: 'other' });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : '注册失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Input type="text" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="昵称" className="login-input" />
      <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.user.email} required className="login-input" />
      <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t.user.password} required className="login-input" />
      <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入密码" required className="login-input" />
      <Button variant="primary" fullWidth loading={loading} type="submit" className="login-btn">
        注册
      </Button>
    </form>
  );
}
