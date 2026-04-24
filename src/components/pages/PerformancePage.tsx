import { useState } from 'react';
import { Card, CardContent, CardHeader, Button } from '../UI';
import { fpsMonitor } from '@/services/performance/FPSMonitor';
import { networkMonitor } from '@/services/performance/NetworkMonitor';

export interface PerformancePageProps {}

export function PerformancePage({}: PerformancePageProps) {
  const [fps, setFps] = useState<number | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const handleToggleMonitor = () => {
    if (isMonitoring) {
      fpsMonitor.stop();
      setIsMonitoring(false);
      setFps(null);
    } else {
      fpsMonitor.start();
      setIsMonitoring(true);
      // Poll FPS at 1s interval
      const timer = setInterval(() => {
        const stats = fpsMonitor.getStats();
        setFps(Math.round(stats.current));
      }, 1000);
      return () => clearInterval(timer);
    }
  };

  const networkStatus = networkMonitor.getStatus();

  return (
    <div className="performance-page">
      <header className="performance-header">
        <div className="performance-header-left">
          <h1 className="performance-title">性能监控</h1>
          <p className="performance-subtitle">实时查看应用性能指标</p>
        </div>
      </header>

      <main className="performance-content">
        <Card variant="elevated">
          <CardHeader title="FPS 监控" subtitle={isMonitoring ? '监控中' : '已停止'} />
          <CardContent>
            <div className="fps-display">
              {fps !== null ? (
                <>
                  <span className={`fps-value ${fps < 30 ? 'fps-low' : fps < 50 ? 'fps-medium' : 'fps-good'}`}>
                    {fps}
                  </span>
                  <span className="fps-label">FPS</span>
                </>
              ) : (
                <span className="fps-placeholder">点击开始监控</span>
              )}
            </div>
            <Button
              variant={isMonitoring ? 'danger' : 'primary'}
              fullWidth
              onClick={handleToggleMonitor}
            >
              {isMonitoring ? '停止监控' : '开始监控'}
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="网络状态" />
          <CardContent>
            <div className="network-stats">
              <div className="network-stat">
                <span className="network-stat-label">连接状态</span>
                <span className="network-stat-value">
                  {networkStatus.online ? '在线' : '离线'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
