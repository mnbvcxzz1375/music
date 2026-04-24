import { useState, useEffect } from 'react';
import { Button, Card, CardContent, CardHeader, CardFooter, Tabs, TabItem } from '../UI';
import { useSubscriptionStore, FEATURE_LABELS } from '@/services/subscription';
import { usePermission } from '@/services/permission';
import type { SubscriptionPlan } from '@/services/subscription';

export interface SubscriptionPageProps {
  onSelectPlan?: (plan: SubscriptionPlan) => void;
}

export function SubscriptionPage({ onSelectPlan }: SubscriptionPageProps) {
  const [activeTab, setActiveTab] = useState('plans');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const { plans, currentStatus, loading, fetchPlans, fetchStatus, subscribe, cancel, renew, isPremium } = useSubscriptionStore();
  const { checkFeature } = usePermission();

  useEffect(() => {
    fetchPlans();
    fetchStatus();
  }, [fetchPlans, fetchStatus]);

  const tabs: TabItem[] = [
    { id: 'plans', label: '订阅方案' },
    { id: 'current', label: '当前订阅' },
    { id: 'features', label: '功能对比' },
  ];

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan.id === 'free') {
      return;
    }
    
    setSelectedPlanId(plan.id);
    setShowPaymentModal(true);
    onSelectPlan?.(plan);
  };

  const handlePayment = async (paymentMethodId: string) => {
    if (!selectedPlanId) return;
    
    await subscribe(selectedPlanId, paymentMethodId);
    setShowPaymentModal(false);
    setSelectedPlanId(null);
  };

  const handleCancelSubscription = async () => {
    const immediate = window.confirm('是否立即取消订阅？\n选择"确定"立即取消，选择"取消"将在当前周期结束后取消。');
    await cancel(immediate);
  };

  const handleRenewSubscription = async () => {
    await renew();
  };

  const formatPrice = (plan: SubscriptionPlan): string => {
    if (plan.price === 0) {
      return '免费';
    }
    const periodLabel = plan.interval === 'month' ? '/月' : '/年';
    return `$${plan.price}${periodLabel}`;
  };

  const getFeatureLabel = (featureId: string): string => {
    return FEATURE_LABELS[featureId] || featureId;
  };

  const renderPlans = () => (
    <div className="subscription-plans">
      <div className="plans-grid">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            variant={plan.isPremium ? 'elevated' : 'outlined'}
            hoverable
            className={plan.id === 'premium_yearly' ? 'plan-recommended' : ''}
          >
            <CardHeader
              title={plan.name}
              subtitle={formatPrice(plan)}
              action={
                plan.discount ? (
                  <span className="discount-badge">省${plan.discount}%</span>
                ) : plan.isPremium ? (
                  <span className="premium-badge">Premium</span>
                ) : undefined
              }
            />
            <CardContent>
              <ul className="plan-features">
                {plan.features.map((feature, index) => (
                  <li key={index} className="plan-feature">
                    <span className="feature-icon">✓</span>
                    {getFeatureLabel(feature)}
                  </li>
                ))}
              </ul>
              {plan.limits.ocrPerMonth && (
                <p className="plan-limit">
                  OCR导入限制: 每月{plan.limits.ocrPerMonth}次
                </p>
              )}
              {plan.limits.piecesPerMonth && (
                <p className="plan-limit">
                  曲目上传限制: 每月{plan.limits.piecesPerMonth}首
                </p>
              )}
            </CardContent>
            <CardFooter>
              {currentStatus?.plan.id === plan.id ? (
                <Button variant="secondary" fullWidth disabled>
                  当前方案
                </Button>
              ) : (
                <Button
                  variant={plan.isPremium ? 'primary' : 'secondary'}
                  fullWidth
                  loading={loading && selectedPlanId === plan.id}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {plan.price === 0 ? '免费使用' : '立即订阅'}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCurrentSubscription = () => (
    <div className="current-subscription">
      {currentStatus && currentStatus.status !== 'free' ? (
        <Card variant="elevated">
          <CardHeader title="当前订阅状态" />
          <CardContent>
            <div className="subscription-details">
              <div className="subscription-detail-item">
                <span className="detail-label">订阅方案</span>
                <span className="detail-value">{currentStatus.plan.name}</span>
              </div>
              <div className="subscription-detail-item">
                <span className="detail-label">状态</span>
                <span className={`detail-value status-${currentStatus.status}`}>
                  {currentStatus.isActive ? '活跃' : '已过期'}
                </span>
              </div>
              {currentStatus.expiresAt && (
                <div className="subscription-detail-item">
                  <span className="detail-label">到期日期</span>
                  <span className="detail-value">
                    {new Date(currentStatus.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {currentStatus.daysRemaining && (
                <div className="subscription-detail-item">
                  <span className="detail-label">剩余天数</span>
                  <span className="detail-value">{currentStatus.daysRemaining}天</span>
                </div>
              )}
              <div className="subscription-detail-item">
                <span className="detail-label">自动续费</span>
                <span className="detail-value">
                  {currentStatus.autoRenew ? '开启' : '关闭'}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {currentStatus.isActive && (
              <>
                {!currentStatus.autoRenew && (
                  <Button variant="primary" onClick={handleRenewSubscription} loading={loading}>
                    开启自动续费
                  </Button>
                )}
                <Button variant="danger" onClick={handleCancelSubscription} loading={loading}>
                  取消订阅
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="no-subscription">
              <p>您当前使用的是免费版本</p>
              <Button variant="primary" onClick={() => setActiveTab('plans')}>
                升级到Premium
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderFeatureComparison = () => (
    <div className="feature-comparison">
      <Card>
        <CardHeader title="功能对比" subtitle="免费版 vs Premium版" />
        <CardContent>
          <div className="comparison-table">
            <div className="comparison-header">
              <div className="comparison-col">功能</div>
              <div className="comparison-col">免费版</div>
              <div className="comparison-col">Premium</div>
            </div>
            {[
              { id: 'basic_practice', label: '基础练习' },
              { id: 'upload_piece', label: '曲目上传' },
              { id: 'ocr_limited', label: 'OCR导入' },
              { id: 'basic_statistics', label: '基础统计' },
              { id: 'advanced_analysis', label: '高级分析' },
              { id: 'unlimited_ocr', label: '无限OCR' },
              { id: 'premium_pieces', label: 'Premium曲目' },
              { id: 'advanced_reports', label: '高级报告' },
              { id: 'ai_analysis', label: 'AI建议' },
            ].map((feature) => {
              const freeResult = checkFeature(feature.id as any);

              return (
                <div key={feature.id} className="comparison-row">
                  <div className="comparison-col">{feature.label}</div>
                  <div className="comparison-col">
                    <span className={freeResult.allowed ? 'has-feature' : 'no-feature'}>
                      {freeResult.allowed ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="comparison-col">
                    <span className="has-feature">✓</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="subscription-page">
      <header className="subscription-header">
        <div className="subscription-header-left">
          <h1 className="subscription-title">订阅管理</h1>
          <p className="subscription-subtitle">
            {isPremium() ? 'Premium会员' : '选择适合您的订阅方案'}
          </p>
        </div>
      </header>

      <main className="subscription-content">
        <Tabs
          items={tabs}
          activeId={activeTab}
          onChange={setActiveTab}
          variant="underline"
        />

        {activeTab === 'plans' && renderPlans()}
        {activeTab === 'current' && renderCurrentSubscription()}
        {activeTab === 'features' && renderFeatureComparison()}
      </main>

      {showPaymentModal && selectedPlanId && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <div className="payment-modal-header">
              <h2>完成订阅</h2>
              <Button variant="ghost" size="small" onClick={() => setShowPaymentModal(false)}>
                关闭
              </Button>
            </div>
            <div className="payment-modal-body">
              <p>选择支付方式：</p>
              <div className="payment-methods">
                <Button variant="primary" onClick={() => handlePayment('stripe_card')}>
                  💳 信用卡支付
                </Button>
                <Button variant="secondary" onClick={() => handlePayment('alipay')}>
                  支付宝
                </Button>
                <Button variant="secondary" onClick={() => handlePayment('wechat')}>
                  微信支付
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}