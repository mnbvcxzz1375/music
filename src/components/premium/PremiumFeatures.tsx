import { Button, Card, CardContent, CardHeader } from '../UI';
import { useSubscriptionStore } from '@/services/subscription';
import { usePermission } from '@/services/permission';
import { useStatisticsStore } from '@/services/statistics';

export interface PremiumFeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PremiumFeatureGate({ feature, children, fallback }: PremiumFeatureGateProps) {
  const { checkFeature } = usePermission();
  const { isPremium } = useSubscriptionStore();
  
  const result = checkFeature(feature as any);
  
  if (result.allowed || isPremium()) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <div className="premium-feature-gate">
      <Card variant="outlined">
        <CardContent>
          <div className="premium-gate-content">
            <span className="premium-gate-icon">🔒</span>
            <h3 className="premium-gate-title">Premium功能</h3>
            <p className="premium-gate-message">{result.upgradeMessage}</p>
            <Button variant="primary" onClick={() => window.location.href = '/subscription'}>
              升级到Premium
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
}

export function PremiumBadge({ size = 'medium' }: PremiumBadgeProps) {
  const sizeClass = `premium-badge-${size}`;
  
  return (
    <span className={`premium-feature-badge ${sizeClass}`}>
      Premium
    </span>
  );
}

export interface AdvancedStatisticsPageProps {}

export function AdvancedStatisticsPage({}: AdvancedStatisticsPageProps) {
  const { isPremium } = useSubscriptionStore();
  const { sessions, getProgressTrend, getSkillLevels } = useStatisticsStore();
  
  const progressTrend = getProgressTrend(30);
  const skillLevels = getSkillLevels();
  
  if (!isPremium()) {
    return (
      <PremiumFeatureGate feature="advanced_analysis">
        <div />
      </PremiumFeatureGate>
    );
  }

  const averagePitchDeviation = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.pitchErrors || 0), 0) / sessions.length
    : 0;

  const averageRhythmDeviation = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.rhythmErrors || 0), 0) / sessions.length
    : 0;

  const weeklyTrend = progressTrend.slice(-7);
  const weeklyAccuracyChange = weeklyTrend.length >= 2
    ? weeklyTrend[weeklyTrend.length - 1].accuracy - weeklyTrend[0].accuracy
    : 0;

  const weeklyDurationChange = weeklyTrend.length >= 2
    ? weeklyTrend[weeklyTrend.length - 1].duration - weeklyTrend[0].duration
    : 0;

  const mostPracticedPieces = Object.entries(
    sessions.reduce((acc, s) => {
      acc[s.pieceId] = (acc[s.pieceId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="advanced-statistics-page">
      <header className="advanced-stats-header">
        <h1>高级统计分析</h1>
        <PremiumBadge />
      </header>

      <div className="advanced-stats-grid">
        <Card>
          <CardHeader title="音准分析" subtitle="详细音准偏差统计" />
          <CardContent>
            <div className="advanced-stat-detail">
              <div className="stat-detail-item">
                <span className="stat-detail-label">平均音准偏差</span>
                <span className="stat-detail-value">{averagePitchDeviation.toFixed(2)} 音分</span>
              </div>
              <div className="stat-detail-item">
                <span className="stat-detail-label">音准稳定性</span>
                <span className="stat-detail-value">
                  {averagePitchDeviation < 10 ? '优秀' : averagePitchDeviation < 20 ? '良好' : '需改进'}
                </span>
              </div>
              <div className="stat-detail-item">
                <span className="stat-detail-label">音准错误总数</span>
                <span className="stat-detail-value">
                  {sessions.reduce((sum, s) => sum + (s.pitchErrors || 0), 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="节奏分析" subtitle="详细节奏偏差统计" />
          <CardContent>
            <div className="advanced-stat-detail">
              <div className="stat-detail-item">
                <span className="stat-detail-label">平均节奏偏差</span>
                <span className="stat-detail-value">{averageRhythmDeviation.toFixed(2)} ms</span>
              </div>
              <div className="stat-detail-item">
                <span className="stat-detail-label">节奏稳定性</span>
                <span className="stat-detail-value">
                  {averageRhythmDeviation < 25 ? '优秀' : averageRhythmDeviation < 50 ? '良好' : '需改进'}
                </span>
              </div>
              <div className="stat-detail-item">
                <span className="stat-detail-label">节奏错误总数</span>
                <span className="stat-detail-value">
                  {sessions.reduce((sum, s) => sum + (s.rhythmErrors || 0), 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="周度变化" subtitle="本周vs上周对比" />
          <CardContent>
            <div className="advanced-stat-detail">
              <div className="stat-detail-item">
                <span className="stat-detail-label">准确率变化</span>
                <span className={`stat-detail-value ${weeklyAccuracyChange >= 0 ? 'positive' : 'negative'}`}>
                  {weeklyAccuracyChange >= 0 ? '+' : ''}{weeklyAccuracyChange.toFixed(1)}%
                </span>
              </div>
              <div className="stat-detail-item">
                <span className="stat-detail-label">时长变化</span>
                <span className={`stat-detail-value ${weeklyDurationChange >= 0 ? 'positive' : 'negative'}`}>
                  {weeklyDurationChange >= 0 ? '+' : ''}{weeklyDurationChange}秒
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="技能等级" subtitle="各技能维度评估" />
          <CardContent>
            <div className="skill-levels-display">
              {skillLevels.map(skill => (
                <div key={skill.skill} className="skill-level-item">
                  <span className="skill-level-name">
                    {skill.skill === 'pitch' ? '音准' : skill.skill === 'rhythm' ? '节奏' : '时长'}
                  </span>
                  <div className="skill-level-bar">
                    <div 
                      className="skill-level-fill" 
                      style={{ width: `${skill.progress * 100}%` }}
                    />
                  </div>
                  <span className="skill-level-number">Lv.{skill.level}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="最常练习曲目" subtitle="练习次数Top 5" />
        <CardContent>
          <div className="most-practiced-list">
            {mostPracticedPieces.map(([pieceId, count], index) => {
              const piece = sessions.find(s => s.pieceId === pieceId);
              return (
                <div key={pieceId} className="most-practiced-item">
                  <span className="most-practiced-rank">{index + 1}</span>
                  <span className="most-practiced-title">{piece?.pieceTitle || pieceId}</span>
                  <span className="most-practiced-count">{count}次</span>
                </div>
              );
            })}
            {mostPracticedPieces.length === 0 && (
              <div className="most-practiced-empty">暂无练习记录</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="练习效率分析" subtitle="每次练习平均效果" />
        <CardContent>
          <div className="efficiency-analysis">
            <div className="efficiency-item">
              <span className="efficiency-label">平均练习时长</span>
              <span className="efficiency-value">
                {sessions.length > 0 
                  ? Math.round(sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / sessions.length)
                  : 0}秒
              </span>
            </div>
            <div className="efficiency-item">
              <span className="efficiency-label">平均准确率</span>
              <span className="efficiency-value">
                {sessions.length > 0
                  ? (sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="efficiency-item">
              <span className="efficiency-label">练习效率评分</span>
              <span className="efficiency-value">
                {sessions.length > 0
                  ? Math.round(
                    (sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length) * 
                    (sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / sessions.length / 60) / 10
                  )
                  : 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}