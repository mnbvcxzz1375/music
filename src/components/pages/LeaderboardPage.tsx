import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, Tabs, TabItem } from '../UI';
import { useLeaderboardStore } from '@/services/leaderboard';
import type { LeaderboardEntry } from '@/services/leaderboard/types';

export interface LeaderboardPageProps {}

export function LeaderboardPage({}: LeaderboardPageProps) {
  const {
    period,
    metric,
    loading,
    getCurrentLeaderboard,
    getUserRank,
    setPeriod,
    setMetric,
    fetchLeaderboard,
  } = useLeaderboardStore();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState(0);

  useEffect(() => {
    fetchLeaderboard(period, metric);
  }, [period, metric, fetchLeaderboard]);

  useEffect(() => {
    setLeaderboard(getCurrentLeaderboard());
    setUserRank(getUserRank());
  }, [getCurrentLeaderboard, getUserRank, period, metric]);

  const periodTabs: TabItem[] = [
    { id: 'weekly', label: '本周' },
    { id: 'monthly', label: '本月' },
  ];

  const metricTabs: TabItem[] = [
    { id: 'duration', label: '练习时长' },
    { id: 'accuracy', label: '准确率' },
    { id: 'streak', label: '连续天数' },
  ];

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const formatValue = (entry: LeaderboardEntry): string => {
    if (metric === 'duration') {
      return formatDuration(entry.value);
    } else if (metric === 'accuracy') {
      return `${entry.value.toFixed(1)}%`;
    } else {
      return `${entry.value}天`;
    }
  };

  const getRankClass = (rank: number): string => {
    if (rank === 1) return 'top-1';
    if (rank === 2) return 'top-2';
    if (rank === 3) return 'top-3';
    return 'other';
  };

  const getRankIcon = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  const currentUserId = 'current';

  return (
    <div className="leaderboard-page">
      <header className="leaderboard-header">
        <div className="leaderboard-header-left">
          <h1 className="leaderboard-title">排行榜</h1>
          <p className="leaderboard-subtitle">
            {period === 'weekly' ? '本周排名' : '本月排名'}
          </p>
        </div>
      </header>

      <main className="leaderboard-content">
        <div className="leaderboard-tabs">
          <Tabs
            items={periodTabs}
            activeId={period}
            onChange={(id) => setPeriod(id as 'weekly' | 'monthly')}
            variant="pills"
          />
          <Tabs
            items={metricTabs}
            activeId={metric}
            onChange={(id) => setMetric(id as 'duration' | 'accuracy' | 'streak')}
            variant="underline"
          />
        </div>

        <Card>
          <CardHeader 
            title={`${period === 'weekly' ? '本周' : '本月'}${metric === 'duration' ? '练习时长' : metric === 'accuracy' ? '准确率' : '连续打卡'}排行榜`}
            subtitle={`您的排名: 第${userRank}名`}
          />
          <CardContent>
            {loading ? (
              <div className="leaderboard-loading">加载中...</div>
            ) : (
              <ol className="leaderboard-list">
                {leaderboard.map((entry) => (
                  <li
                    key={entry.userId}
                    className={`leaderboard-item ${entry.userId === currentUserId ? 'current-user' : ''}`}
                  >
                    <div className={`leaderboard-rank ${getRankClass(entry.rank)}`}>
                      {getRankIcon(entry.rank) || entry.rank}
                    </div>
                    
                    <div className="leaderboard-user-info">
                      <span className="leaderboard-user-name">{entry.userName}</span>
                      <span className="leaderboard-user-stats">
                        {entry.sessions && `${entry.sessions}次练习`}
                        {entry.streak && entry.streak > 0 && ` · 连续${entry.streak}天`}
                      </span>
                    </div>
                    
                    <div className="leaderboard-value">
                      <span className="leaderboard-value-main">{formatValue(entry)}</span>
                      {metric === 'duration' && (
                        <span className="leaderboard-value-sub">
                          {Math.floor(entry.value / 60)}分钟
                        </span>
                      )}
                      </div>
                    </li>
                  ))}
                  
                  {leaderboard.length === 0 && (
                    <div className="leaderboard-empty">暂无排名数据</div>
                  )}
                </ol>
            )}
          </CardContent>
        </Card>

        <div className="leaderboard-my-rank">
          <Card variant="elevated">
            <CardHeader title="我的排名" />
            <CardContent>
              <div className="my-rank-stats">
                <div className="my-rank-item">
                  <span className="my-rank-label">本周时长排名</span>
                  <span className="my-rank-value">第{useLeaderboardStore.getState().currentUserRank.weeklyDuration}名</span>
                </div>
                <div className="my-rank-item">
                  <span className="my-rank-label">本周准确率排名</span>
                  <span className="my-rank-value">第{useLeaderboardStore.getState().currentUserRank.weeklyAccuracy}名</span>
                </div>
                <div className="my-rank-item">
                  <span className="my-rank-label">本月时长排名</span>
                  <span className="my-rank-value">第{useLeaderboardStore.getState().currentUserRank.monthlyDuration}名</span>
                </div>
                <div className="my-rank-item">
                  <span className="my-rank-label">本月准确率排名</span>
                  <span className="my-rank-value">第{useLeaderboardStore.getState().currentUserRank.monthlyAccuracy}名</span>
                </div>
                <div className="my-rank-item">
                  <span className="my-rank-label">连续打卡排名</span>
                  <span className="my-rank-value">第{useLeaderboardStore.getState().currentUserRank.streak}名</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}