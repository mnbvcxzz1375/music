import { useState, useEffect } from 'react';
import { Button, Card, CardContent, CardHeader } from '../UI';
import { useStatisticsStore } from '@/services/statistics';
import { useSubscriptionStore } from '@/services/subscription';
import { PremiumFeatureGate, PremiumBadge } from '../premium';
import { analysisEngine } from '@/services/ai/AnalysisEngine';
import type { AIAnalysisResult, WeaknessAnalysis, PracticeRecommendation } from '@/services/ai/AnalysisEngine';

export interface AIAnalysisPageProps {}

export function AIAnalysisPage({}: AIAnalysisPageProps) {
  const { sessions } = useStatisticsStore();
  const { isPremium } = useSubscriptionStore();
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const result = analysisEngine.analyzeSessions(sessions);
    setAnalysisResult(result);
    setLoading(false);
  }, [sessions]);

  if (!isPremium()) {
    return (
      <PremiumFeatureGate feature="ai_analysis">
        <div />
      </PremiumFeatureGate>
    );
  }

  const renderWeaknessCard = (weakness: WeaknessAnalysis) => {
    const severityColors = {
      low: 'var(--color-status-success)',
      medium: 'var(--color-status-warning)',
      high: 'var(--color-status-error)',
    };

    const typeLabels = {
      pitch: '音准',
      rhythm: '节奏',
      tempo: '速度',
      consistency: '稳定性',
    };

    return (
      <Card key={`${weakness.type}-${weakness.severity}`}>
        <CardHeader
          title={typeLabels[weakness.type]}
          action={
            <span 
              className="weakness-severity-badge"
              style={{ backgroundColor: severityColors[weakness.severity] }}
            >
              {weakness.severity === 'high' ? '高' : weakness.severity === 'medium' ? '中' : '低'}
            </span>
          }
        />
        <CardContent>
          <p className="weakness-description">{weakness.description}</p>
          
          {weakness.affectedPieces.length > 0 && (
            <div className="weakness-pieces">
              <span className="weakness-pieces-label">受影响曲目:</span>
              <span className="weakness-pieces-value">
                {weakness.affectedPieces.length}首
              </span>
            </div>
          )}
          
          <div className="weakness-recommendations">
            <span className="weakness-rec-label">建议:</span>
            <ul className="weakness-rec-list">
              {weakness.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRecommendationCard = (rec: PracticeRecommendation) => {
    const typeLabels: Record<string, string> = {
      piece: '曲目',
      technique: '技巧',
      schedule: '计划',
      mode: '模式',
    };

    const modeLabels: Record<string, string> = {
      normal: '正常',
      slow: '慢速',
      fast: '快速',
      loop: '循环',
      challenge: '挑战',
    };

    return (
      <Card key={rec.id}>
        <CardHeader
          title={rec.title}
          subtitle={typeLabels[rec.type]}
          action={
            <span className="recommendation-priority">
              优先级 {rec.priority}
            </span>
          }
        />
        <CardContent>
          <p className="recommendation-description">{rec.description}</p>
          
          <div className="recommendation-details">
            <div className="rec-detail-item">
              <span className="rec-detail-label">预计提升</span>
              <span className="rec-detail-value">+{rec.estimatedImprovement}%</span>
            </div>
            <div className="rec-detail-item">
              <span className="rec-detail-label">建议时长</span>
              <span className="rec-detail-value">{rec.suggestedDuration}分钟</span>
            </div>
            <div className="rec-detail-item">
              <span className="rec-detail-label">建议模式</span>
              <span className="rec-detail-value">{modeLabels[rec.suggestedMode] || rec.suggestedMode}</span>
            </div>
          </div>
          
          <Button variant="primary" fullWidth>
            开始练习
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="ai-analysis-page">
        <header className="ai-analysis-header">
          <div className="ai-header-left">
            <h1>AI练习分析</h1>
            <PremiumBadge />
          </div>
        </header>
        <main className="ai-analysis-content">
          <div className="ai-loading">正在分析您的练习数据...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="ai-analysis-page">
      <header className="ai-analysis-header">
        <div className="ai-header-left">
          <h1>AI练习分析</h1>
          <PremiumBadge />
        </div>
      </header>

      <main className="ai-analysis-content">
        <div className="ai-overall-score">
          <Card>
            <CardContent>
              <div className="overall-score-display">
                <span className="overall-score-value">
                  {analysisResult?.overallScore || 0}
                </span>
                <span className="overall-score-label">综合评分</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="ai-progress-prediction">
          <Card>
            <CardHeader title="进步预测" subtitle="基于近期练习数据" />
            <CardContent>
              <div className="prediction-grid">
                <div className="prediction-item">
                  <span className="prediction-label">周准确率提升</span>
                  <span className={`prediction-value ${(analysisResult?.predictedProgress?.weeklyAccuracyGain ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(analysisResult?.predictedProgress?.weeklyAccuracyGain ?? 0) >= 0 ? '+' : ''}
                    {(analysisResult?.predictedProgress?.weeklyAccuracyGain ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="prediction-item">
                  <span className="prediction-label">周时长提升</span>
                  <span className={`prediction-value ${(analysisResult?.predictedProgress?.weeklyDurationGain ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(analysisResult?.predictedProgress?.weeklyDurationGain ?? 0) >= 0 ? '+' : ''}
                    {analysisResult?.predictedProgress?.weeklyDurationGain ?? 0}秒
                  </span>
                </div>
              </div>

              {(analysisResult?.predictedProgress?.milestonePredictions?.length ?? 0) > 0 && (
                <div className="milestone-predictions">
                  <span className="milestone-label">里程碑预测:</span>
                  {analysisResult?.predictedProgress?.milestonePredictions?.map((milestone, i) => (
                    <div key={i} className="milestone-item">
                      <span className="milestone-name">{milestone.milestone}</span>
                      <span className="milestone-date">
                        {milestone.estimatedDate.toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="ai-weaknesses">
          <h2 className="ai-section-title">弱点分析</h2>
          {(analysisResult?.weaknesses?.length ?? 0) > 0 ? (
            <div className="weaknesses-grid">
              {analysisResult?.weaknesses?.map(renderWeaknessCard)}
            </div>
          ) : (
            <Card>
              <CardContent>
                <div className="no-weaknesses">
                  <span className="no-weaknesses-icon">🎉</span>
                  <p>暂无明显弱点，继续保持！</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="ai-recommendations">
          <h2 className="ai-section-title">练习建议</h2>
          {(analysisResult?.recommendations?.length ?? 0) > 0 ? (
            <div className="recommendations-grid">
              {analysisResult?.recommendations?.slice(0, 5).map(renderRecommendationCard)}
            </div>
          ) : (
            <Card>
              <CardContent>
                <div className="no-recommendations">
                  <p>暂无特别建议，继续按当前计划练习</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}