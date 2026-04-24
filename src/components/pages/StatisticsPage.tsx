import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, Tabs, TabItem, Button } from '../UI';
import { ThemeToggle } from '../Theme';
import { useStatisticsStore } from '@/services/statistics';
import { useReportStore } from '@/services/report';
import { ProgressTrend, SkillLevel, ReportPeriod } from '@/services/statistics/types';

export interface StatisticsPageProps {}

export function StatisticsPage({}: StatisticsPageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [progressTrend, setProgressTrend] = useState<ProgressTrend[]>([]);
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([]);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('week');
  const [showExportModal, setShowExportModal] = useState(false);
  
  const { stats, getProgressTrend, getSkillLevels, calculateDailyStats, getStreakDays } = useStatisticsStore();
  const { generateReport, downloadReport, isGenerating } = useReportStore();

  useEffect(() => {
    setProgressTrend(getProgressTrend(30));
    setSkillLevels(getSkillLevels());
  }, [getProgressTrend, getSkillLevels]);

  const handleExportReport = async () => {
    generateReport({ period: reportPeriod });
    await downloadReport('pdf');
    setShowExportModal(false);
  };

  const handleExportCSV = async () => {
    generateReport({ period: reportPeriod });
    await downloadReport('csv');
    setShowExportModal(false);
  };

  const handleExportJSON = async () => {
    generateReport({ period: reportPeriod });
    await downloadReport('json');
    setShowExportModal(false);
  };

  const tabs: TabItem[] = [
    { id: 'overview', label: '概览' },
    { id: 'trends', label: '趋势' },
    { id: 'skills', label: '技能' },
    { id: 'history', label: '历史' },
  ];

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const todayStats = calculateDailyStats(new Date().toISOString().split('T')[0]);
  const streakDays = getStreakDays();

  const skillLabels = {
    pitch: '音准',
    rhythm: '节拍',
    duration: '时长',
  };

  const renderOverview = () => (
    <div className="stats-overview">
      <div className="stats-summary-grid">
        <Card variant="elevated">
          <CardContent>
            <div className="summary-stat">
              <span className="summary-stat-value">{formatDuration(stats.totalDuration)}</span>
              <span className="summary-stat-label">总练习时长</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <div className="summary-stat">
              <span className="summary-stat-value">{stats.totalSessions}</span>
              <span className="summary-stat-label">练习次数</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <div className="summary-stat">
              <span className="summary-stat-value">{stats.totalPieces}</span>
              <span className="summary-stat-label">练习曲目</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <div className="summary-stat">
              <span className="summary-stat-value">{stats.averageAccuracy.toFixed(1)}%</span>
              <span className="summary-stat-label">平均准确率</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <div className="summary-stat">
              <span className="summary-stat-value">{streakDays}</span>
              <span className="summary-stat-label">连续练习天数</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <div className="summary-stat">
              <span className="summary-stat-value">{formatDuration(todayStats.durationSeconds)}</span>
              <span className="summary-stat-label">今日练习</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="今日详情" />
        <CardContent>
          <div className="today-details">
            <div className="today-detail-item">
              <span className="today-detail-label">练习次数</span>
              <span className="today-detail-value">{todayStats.sessionsCount}</span>
            </div>
            <div className="today-detail-item">
              <span className="today-detail-label">练习曲目</span>
              <span className="today-detail-value">{todayStats.piecesCount}</span>
            </div>
            <div className="today-detail-item">
              <span className="today-detail-label">平均准确率</span>
              <span className="today-detail-value">{todayStats.averageAccuracy.toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTrends = () => (
    <div className="stats-trends">
      <Card>
        <CardHeader title="准确率趋势" subtitle="最近30天" />
        <CardContent>
          <div className="trend-chart">
            {progressTrend.map((trend, index) => (
              <div key={index} className="trend-bar-container">
                <div
                  className="trend-bar"
                  style={{
                    height: `${trend.accuracy}%`,
                    backgroundColor: trend.accuracy > 80
                      ? 'var(--color-status-success)'
                      : trend.accuracy > 60
                        ? 'var(--color-status-warning)'
                        : 'var(--color-status-error)',
                  }}
                />
                <span className="trend-label">{trend.date.slice(-2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="练习时长趋势" subtitle="最近30天" />
        <CardContent>
          <div className="trend-chart">
            {progressTrend.map((trend, index) => {
              const maxDuration = Math.max(...progressTrend.map(t => t.duration), 1);
              const heightPercent = (trend.duration / maxDuration) * 100;
              return (
                <div key={index} className="trend-bar-container">
                  <div
                    className="trend-bar duration-bar"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="trend-label">{trend.date.slice(-2)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSkills = () => (
    <div className="stats-skills">
      {skillLevels.map((skill) => (
        <Card key={skill.skill}>
          <CardHeader title={skillLabels[skill.skill]} />
          <CardContent>
            <div className="skill-level-display">
              <div className="skill-level-number">Lv.{skill.level}</div>
              <div className="skill-progress-bar">
                <div
                  className="skill-progress-fill"
                  style={{ width: `${skill.progress * 100}%` }}
                />
              </div>
              <div className="skill-progress-text">
                {Math.round(skill.progress * 100)}% 至下一等级
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderHistory = () => (
    <div className="stats-history">
      <Card>
        <CardHeader title="练习记录" />
        <CardContent>
          <div className="history-list">
            {useStatisticsStore.getState().sessions.slice(-10).reverse().map((session) => (
              <div key={session.id} className="history-item">
                <div className="history-item-left">
                  <span className="history-piece-title">{session.pieceTitle}</span>
                  <span className="history-date">
                    {new Date(session.startTime).toLocaleDateString()}
                  </span>
                </div>
                <div className="history-item-right">
                  <span className="history-accuracy">{session.accuracy.toFixed(1)}%</span>
                  <span className="history-duration">{formatDuration(session.durationSeconds)}</span>
                </div>
              </div>
            ))}
            {useStatisticsStore.getState().sessions.length === 0 && (
              <div className="history-empty">暂无练习记录</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="statistics-page">
      <header className="statistics-header">
        <div className="statistics-header-left">
          <h1 className="statistics-title">统计分析</h1>
          <p className="statistics-subtitle">追踪您的练习进度</p>
        </div>
        <div className="statistics-header-right">
          <ThemeToggle />
          <Button variant="secondary" onClick={() => setShowExportModal(true)}>
            导出报告
          </Button>
        </div>
      </header>

      <main className="statistics-content">
        <Tabs
          items={tabs}
          activeId={activeTab}
          onChange={setActiveTab}
          variant="underline"
        />

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'trends' && renderTrends()}
        {activeTab === 'skills' && renderSkills()}
        {activeTab === 'history' && renderHistory()}
      </main>

      {showExportModal && (
        <div className="export-modal-overlay">
          <div className="export-modal">
            <div className="export-modal-header">
              <h2 className="export-modal-title">导出练习报告</h2>
              <Button variant="ghost" size="small" onClick={() => setShowExportModal(false)}>
                关闭
              </Button>
            </div>
            
            <div className="export-modal-body">
              <div className="export-period-select">
                <label className="export-label">选择报告周期:</label>
                <div className="export-period-options">
                  <Button
                    variant={reportPeriod === 'week' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setReportPeriod('week')}
                  >
                    本周
                  </Button>
                  <Button
                    variant={reportPeriod === 'month' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setReportPeriod('month')}
                  >
                    本月
                  </Button>
                  <Button
                    variant={reportPeriod === 'quarter' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setReportPeriod('quarter')}
                  >
                    本季度
                  </Button>
                </div>
              </div>

              <div className="export-format-select">
                <label className="export-label">选择导出格式:</label>
                <div className="export-format-options">
                  <Button
                    variant="primary"
                    onClick={handleExportReport}
                    loading={isGenerating}
                  >
                    PDF 报告
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleExportCSV}
                    loading={isGenerating}
                  >
                    CSV 数据
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleExportJSON}
                    loading={isGenerating}
                  >
                    JSON 数据
                  </Button>
                </div>
              </div>

              <div className="export-preview">
                <Card variant="outlined">
                  <CardHeader title="报告预览" subtitle={`周期: ${reportPeriod === 'daily' ? '今日' : reportPeriod === 'weekly' ? '本周' : '本月'}`} />
                  <CardContent>
                    <div className="export-preview-stats">
                      <div className="export-preview-item">
                        <span className="export-preview-label">练习次数</span>
                        <span className="export-preview-value">{stats.totalSessions}</span>
                      </div>
                      <div className="export-preview-item">
                        <span className="export-preview-label">总时长</span>
                        <span className="export-preview-value">{formatDuration(stats.totalDuration)}</span>
                      </div>
                      <div className="export-preview-item">
                        <span className="export-preview-label">平均准确率</span>
                        <span className="export-preview-value">{stats.averageAccuracy.toFixed(1)}%</span>
                      </div>
                      <div className="export-preview-item">
                        <span className="export-preview-label">连续天数</span>
                        <span className="export-preview-value">{streakDays}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}