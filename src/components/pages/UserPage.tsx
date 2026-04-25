import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, CreditCard, BarChart, Crown } from 'lucide-react';
import { Button, Card, CardContent, Input, Tabs, TabItem } from '../UI';
import { useAuthStore } from '@/services/auth';
import { useI18n } from '@/i18n';
import { useSubscriptionStore } from '@/services/subscription';

export interface UserPageProps {
  onSuccess?: () => void;
}

export function UserPage({ onSuccess }: UserPageProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();
  
  const { isAuthenticated, user, logout } = useAuthStore();
  const { isPremium, currentStatus } = useSubscriptionStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (isAuthenticated && user) {
    return (
      <div className="user-page">
        <header className="user-header">
          <div className="user-header-left">
            <h1 className="user-title">个人中心</h1>
            <p className="user-subtitle">{user.email}</p>
          </div>
          <div className="user-header-right">
            <Button variant="danger" onClick={handleLogout}>
              登出
            </Button>
          </div>
        </header>

        <main className="user-content">
          <Card variant="outlined">
            <CardContent>
              <div className="membership-card">
                <div className="membership-card-left">
                  <div className="membership-card-title">
                    <Crown size={18} />
                    <span>{isPremium() ? '会员' : '免费用户'}</span>
                  </div>
                  <div className="membership-card-subtitle">
                    {isPremium()
                      ? `当前方案：${currentStatus?.plan?.name || 'Premium'}`
                      : '升级VIP解锁高级分析、AI建议、VIP曲目等功能'}
                  </div>
                </div>
                <div className="membership-card-right">
                  <Link to="/subscription">
                    <Button variant={isPremium() ? 'secondary' : 'primary'}>
                      {isPremium() ? '会员中心' : '升级VIP'}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent>
              <div className="user-profile">
                <div className="user-avatar">
                  <span className="user-avatar-icon"><User size={24} /></span>
                </div>
                <div className="user-info">
                  <h2 className="user-name">{user.nickname || '用户'}</h2>
                  <p className="user-email">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="user-actions">
            <Link to="/user/settings">
              <Card variant="outlined" hoverable>
                <CardContent>
                  <div className="user-action-item">
                    <span className="user-action-icon"><Settings size={20} /></span>
                    <span className="user-action-label">设置</span>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/subscription">
              <Card variant="outlined" hoverable>
                <CardContent>
                  <div className="user-action-item">
                    <span className="user-action-icon"><CreditCard size={20} /></span>
                    <span className="user-action-label">{isPremium() ? '会员中心' : '升级VIP'}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/statistics">
              <Card variant="outlined" hoverable>
                <CardContent>
                  <div className="user-action-item">
                    <span className="user-action-icon"><BarChart size={20} /></span>
                    <span className="user-action-label">练习统计</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const tabs: TabItem[] = [
    { id: 'login', label: t.user.login },
    { id: 'register', label: t.user.register },
  ];

  return (
    <div className="user-page">
      <header className="user-header">
        <div className="user-header-left">
          <h1 className="user-title">用户中心</h1>
        </div>
      </header>

      <main className="user-content">
        <Tabs
          items={tabs}
          activeId={activeTab}
          onChange={setActiveTab}
          variant="underline"
        />

        {activeTab === 'login' && (
          <LoginForm onSuccess={onSuccess || (() => navigate('/'))} />
        )}

        {activeTab === 'register' && (
          <RegisterForm onSuccess={onSuccess || (() => navigate('/'))} />
        )}
      </main>
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="elevated">
      <CardContent>
        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label={t.user.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.user.email}
            required
          />

          <Input
            label={t.user.password}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.user.password}
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <Button
            variant="primary"
            fullWidth
            loading={loading}
            type="submit"
          >{t.user.login}</Button>

          <div className="auth-divider">
            <span>或使用第三方登录</span>
          </div>

          <div className="oauth-buttons">
            <Button variant="secondary" fullWidth>
              {t.user.googleLogin}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 8) {
      setError('密码长度至少8位');
      return;
    }

    setLoading(true);

    try {
      await register({ email, password, nickname: nickname || '用户', instrument: 'other' });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="elevated">
      <CardContent>
        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label={t.user.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.user.email}
            required
          />

          <Input
            label="昵称"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="请输入昵称"
          />

          <Input
            label={t.user.password}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码（至少8位）"
            required
          />

          <Input
            label="确认密码"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入密码"
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <Button
            variant="primary"
            fullWidth
            loading={loading}
            type="submit"
          >{t.user.register}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
