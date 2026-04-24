import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, Button } from '../UI';
import { ThemeToggle } from '../Theme';
import { usePerformanceStore, initWebVitals } from '@/services/performance';
import { fpsMonitor } from '@/services/performance/FPSMonitor';
import { networkMonitor } from '@/services/performance/NetworkMonitor';
import { degradationManager } from '@/services/performance/DegradationManager';
import type { MetricCategory, PerformanceReport } from '@/services/performance/types';

export interface PerformancePageProps {}

export function PerformancePage({}: PerformancePageProps) {
  const { metrics, violations, generateReport, clearMetrics } = usePerformanceStore();
  const [fpsStats, setFpsStats] = useState(fpsMonitor.getStats());
  const [networkStats, setNetworkStats] = useState(networkMonitor.getStats());
  const [degradationLevel, setDegradationLevel] = useState(degradationManager.getCurrentLevel());
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  useEffect(() => {
    initWebVitals();
    
    fpsMonitor.setOnLowFps((duration) => {
      degradationManager.handleLowFps(duration);
      setDegradationLevel(degradationManager.getCurrentLevel());
    });
    
    fpsMonitor.setOnFpsRecovered(() => {
      degradationManager.handleFpsRecovered();
      setDegradationLevel(degradationManager.getCurrentLevel());
    });
    
    return () => {
      fpsMonitor.stop();
    };
  }, []);
  
  useEffect(() => {
    if (!isMonitoring) return;
    
    const interval = setInterval(() => {
      setFpsStats(fpsMonitor.getStats());
      setNetworkStats(networkMonitor.getStats());
      setDegradationLevel(degradationManager.getCurrentLevel());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isMonitoring]);
  
  const handleStartMonitoring = () => {
    fpsMonitor.start();
    networkMonitor.start();
    setIsMonitoring(true);
  };
  
  const handleStopMonitoring = () => {
    fpsMonitor.stop();
    networkMonitor.stop();
    setIsMonitoring(false);
  };
  
  const handleGenerateReport = () => {
    setReport(generateReport());
  };
  
  const handleClearMetrics = () => {
    clearMetrics();
    setReport(null);
  };
  
  const categoryLabels: Record<MetricCategory, string> = {
    loading: '加载性能',
    rendering: '渲染性能',
    audio: '音频性能',
    interaction: '交互性能',
  };
  
  const categoryMetrics = (category: MetricCategory) => 
    metrics.filter(m => m.category === category);
  
  const degradationLabels = {
    none: '正常',
    low: '轻度降级',
    medium: '中度降级',
    high: '重度降级',
  };
  
  const degradationColors = {
    none: 'var(--color-status-success)',
    low: 'var(--color-status-warning)',
    medium: 'var(--color-status-error)',
    high: 'var(--color-status-error)',
  };
  
  const renderFPSCard = () => (
    <Card>
      <CardHeader title="FPS监控" subtitle="实时帧率统计" />
      <CardContent>
        <div className="fps-stats">
          <div className="fps-stat-item">
            <span className="fps-stat-label">当前FPS</span>
            <span className="fps-stat-value">{fpsStats.current.toFixed(1)}</span>
          </div>
          <div className="fps-stat-item">
            <span className="fps-stat-label">平均FPS</span>
            <span className="fps-stat-value">{fpsStats.average.toFixed(1)}</span>
          </div>
          <div className="fps-stat-item">
            <span className="fps-stat-label">最低FPS</span>
            <span className="fps-stat-value">{fpsStats.min.toFixed(1)}</span>
          </div>
          <div className="fps-stat-item">
            <span className="fps-stat-label">最高FPS</span>
            <span className="fps-stat-value">{fpsStats.max.toFixed(1)}</span>
          </div>
        </div>
        <div className="fps-status">
          <span className={`fps-status-badge ${fpsStats.isLowFps ? 'low' : 'normal'}`}>
            {fpsStats.isLowFps ? '低帧率警告' : '帧率正常'}
          </span>
          {fpsStats.lowFpsDuration > 0 && (
            <span className="fps-low-duration">
              低帧率持续: {(fpsStats.lowFpsDuration / 1000).toFixed(1)}秒
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
  
  const renderNetworkCard = () => (
    <Card>
      <CardHeader title="网络监控" subtitle="网络状态统计" />
      <CardContent>
        <div className="network-stats">
          <div className="network-stat-item">
            <span className="network-stat-label">在线状态</span>
            <span className={`network-stat-value ${networkStats.isOnline ? 'online' : 'offline'}`}>
              {networkStats.isOnline ? '在线' : '离线'}
            </span>
          </div>
          <div className="network-stat-item">
            <span className="network-stat-label">连接类型</span>
            <span className="network-stat-value">{networkStats.connectionType || '未知'}</span>
          </div>
          <div className="network-stat-item">
            <span className="network-stat-label">下行速度</span>
            <span className="network-stat-value">
              {networkStats.downlink ? `${networkStats.downlink} Mbps` : '未知'}
            </span>
          </div>
          <div className="network-stat-item">
            <span className="network-stat-label">RTT延迟</span>
            <span className="network-stat-value">
              {networkStats.rtt ? `${networkStats.rtt} ms` : '未知'}
            </span>
          </div>
        </div>
        <div className="network-status">
          <span className={`network-status-badge ${networkStats.isSlow ? 'slow' : 'normal'}`}>
            {networkStats.isSlow ? '网络较慢' : '网络正常'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
  
  const renderDegradationCard = () => (
    <Card>
      <CardHeader title="降级策略" subtitle="性能降级状态" />
      <CardContent>
        <div className="degradation-status">
          <span className="degradation-level-label">当前降级级别</span>
          <span 
            className="degradation-level-value"
            style={{ color: degradationColors[degradationLevel] }}
          >
            {degradationLabels[degradationLevel]}
          </span>
        </div>
        <div className="degradation-actions">
          <span className="degradation-actions-label">已启用降级措施:</span>
          <ul className="degradation-actions-list">
            {degradationLevel !== 'none' && (
              <>
                {degradationLevel === 'low' && <li>降低动画帧率</li>}
                {degradationLevel === 'medium' && <li>简化乐谱渲染</li>}
                {degradationLevel === 'high' && <li>禁用实时反馈</li>}
              </>
            )}
            {degradationLevel === 'none' && <li>全部功能正常</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
  
  const renderMetricsCard = (category: MetricCategory) => (
    <Card key={category}>
      <CardHeader title={categoryLabels[category]} />
      <CardContent>
        <div className="metrics-list">
          {categoryMetrics(category).slice(-10).map((metric, i) => (
            <div key={i} className="metric-item">
              <span className="metric-name">{metric.name}</span>
              <span className="metric-value">
                {metric.value.toFixed(2)} {metric.unit}
              </span>
              <span className="metric-time">
                {metric.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))}
          {categoryMetrics(category).length === 0 && (
            <div className="metrics-empty">暂无数据</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
  
  const renderViolationsCard = () => (
    <Card>
      <CardHeader title="性能违规" subtitle="超出预算的指标" />
      <CardContent>
        <div className="violations-list">
          {violations.slice(-10).map((v, i) => (
            <div key={i} className={`violation-item ${v.severity}`}>
              <span className="violation-name">{v.metric.name}</span>
              <span className="violation-value">
                {v.metric.value.toFixed(2)} {v.metric.unit}
              </span>
              <span className="violation-budget">
                预算: {v.budget.budget} {v.budget.unit}
              </span>
              <span className="violation-exceeded">
                超出: {v.exceededBy.toFixed(2)}
              </span>
            </div>
          ))}
          {violations.length === 0 && (
            <div className="violations-empty">无性能违规</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
  
  const renderReportCard = () => (
    <Card>
      <CardHeader title="性能报告" subtitle="综合性能评分" />
      <CardContent>
        {report ? (
          <div className="performance-report">
            <div className="report-score">
              <span className="report-score-value">{report.score}</span>
              <span className="report-score-label">综合评分</span>
            </div>
            <div className="report-summary">
              <span className="report-metrics-count">
                收集指标: {report.metrics.length}个
              </span>
              <span className="report-violations-count">
                性能违规: {report.violations.length}个
              </span>
            </div>
            <div className="report-time">
              报告时间: {report.timestamp.toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="report-empty">
            点击"生成报告"查看综合性能评分
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  return (
    <div className="performance-page">
      <header className="performance-header">
        <div className="performance-header-left">
          <h1>性能监控</h1>
          <p className="performance-subtitle">实时性能指标与优化建议</p>
        </div>
        <div className="performance-header-right">
          <ThemeToggle />
        </div>
      </header>
      
      <main className="performance-content">
        <div className="performance-controls">
          <Button
            variant={isMonitoring ? 'danger' : 'primary'}
            onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
          >
            {isMonitoring ? '停止监控' : '开始监控'}
          </Button>
          <Button variant="secondary" onClick={handleGenerateReport}>
            生成报告
          </Button>
          <Button variant="ghost" onClick={handleClearMetrics}>
            清除数据
          </Button>
        </div>
        
        <div className="performance-realtime">
          {renderFPSCard()}
          {renderNetworkCard()}
          {renderDegradationCard()}
        </div>
        
        <div className="performance-metrics">
          {renderMetricsCard('loading')}
          {renderMetricsCard('rendering')}
          {renderMetricsCard('audio')}
          {renderMetricsCard('interaction')}
        </div>
        
        <div className="performance-analysis">
          {renderViolationsCard()}
          {renderReportCard()}
        </div>
      </main>
    </div>
  );
}