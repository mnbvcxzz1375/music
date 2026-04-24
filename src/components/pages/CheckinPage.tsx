import { useState, useMemo } from 'react';
import { Button, Card, CardContent, CardHeader } from '../UI';
import { ThemeToggle } from '../Theme';
import { useCheckinStore } from '@/services/checkin';

export interface CheckinPageProps {}

export function CheckinPage({}: CheckinPageProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const {
    records,
    rewards,
    currentStreak,
    longestStreak,
    totalCheckins,
    isCheckedToday,
    getTodayRecord,
    getMonthRecords,
  } = useCheckinStore();

  const todayRecord = getTodayRecord();
  const monthRecords = getMonthRecords(currentMonth);
  const checkedToday = isCheckedToday();

  const calendarDays = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();
    
    const days: Array<{
      date: string;
      day: number;
      isCurrentMonth: boolean;
      isChecked: boolean;
      isToday: boolean;
      isFuture: boolean;
    }> = [];
    
    for (let i = 0; i < startWeekday; i++) {
      const prevDate = new Date(year, month - 1, -startWeekday + i + 1);
      days.push({
        date: formatDate(prevDate),
        day: prevDate.getDate(),
        isCurrentMonth: false,
        isChecked: records.some(r => r.date === formatDate(prevDate)),
        isToday: false,
        isFuture: false,
      });
    }
    
    const today = formatDate(new Date());
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date,
        day: i,
        isCurrentMonth: true,
        isChecked: records.some(r => r.date === date),
        isToday: date === today,
        isFuture: date > today,
      });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month, i);
      days.push({
        date: formatDate(nextDate),
        day: nextDate.getDate(),
        isCurrentMonth: false,
        isChecked: false,
        isToday: false,
        isFuture: formatDate(nextDate) > today,
      });
    }
    
    return days;
  }, [currentMonth, records]);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const goToPrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const prevMonth = new Date(year, month - 2, 1);
    setCurrentMonth(`${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`);
  };

  const goToNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const nextMonth = new Date(year, month, 1);
    setCurrentMonth(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const monthLabel = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    return `${year}年${month}月`;
  }, [currentMonth]);

  return (
    <div className="checkin-page">
      <header className="checkin-header">
        <div className="checkin-header-left">
          <h1 className="checkin-title">每日打卡</h1>
          <p className="checkin-subtitle">
            {checkedToday ? '今日已打卡 ✓' : '今日尚未打卡'}
          </p>
        </div>
        <div className="checkin-header-right">
          <ThemeToggle />
        </div>
      </header>

      <main className="checkin-content">
        <div className="checkin-stats">
          <Card variant="elevated">
            <CardContent>
              <div className="checkin-stat-card">
                <div className="checkin-stat-value">{currentStreak}</div>
                <div className="checkin-stat-label">当前连续</div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent>
              <div className="checkin-stat-card">
                <div className="checkin-stat-value">{longestStreak}</div>
                <div className="checkin-stat-label">最长连续</div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent>
              <div className="checkin-stat-card">
                <div className="checkin-stat-value">{totalCheckins}</div>
                <div className="checkin-stat-label">总打卡天数</div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent>
              <div className="checkin-stat-card">
                <div className="checkin-stat-value">
                  {todayRecord ? formatDuration(todayRecord.practiceDuration) : '0分钟'}
                </div>
                <div className="checkin-stat-label">今日练习</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {currentStreak > 0 && (
          <div className="checkin-streak-badge">
            <span className="checkin-streak-icon">🔥</span>
            <span className="checkin-streak-text">
              已连续打卡 {currentStreak} 天
            </span>
          </div>
        )}

        <Card>
          <CardHeader title="打卡日历" />
          <CardContent>
            <div className="checkin-calendar">
              <div className="checkin-calendar-header">
                <h3 className="checkin-calendar-title">{monthLabel}</h3>
                <div className="checkin-calendar-nav">
                  <Button variant="ghost" size="small" onClick={goToPrevMonth}>
                    上月
                  </Button>
                  <Button variant="ghost" size="small" onClick={goToToday}>
                    今日
                  </Button>
                  <Button variant="ghost" size="small" onClick={goToNextMonth}>
                    下月
                  </Button>
                </div>
              </div>

              <div className="checkin-calendar-grid">
                {weekDays.map(day => (
                  <div key={day} className="checkin-calendar-day-header">
                    {day}
                  </div>
                ))}
                
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`checkin-calendar-day ${day.isChecked ? 'checked' : ''} ${day.isToday ? 'today' : ''} ${day.isFuture ? 'future' : ''} ${!day.isCurrentMonth ? 'other-month' : ''}`}
                  >
                    <span className="checkin-day-number">{day.day}</span>
                    {day.isChecked && <span className="checkin-day-icon">✓</span>}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="打卡奖励" subtitle="连续打卡解锁奖励" />
          <CardContent>
            <div className="checkin-rewards">
              {rewards.map(reward => (
                <div
                  key={reward.id}
                  className={`checkin-reward-item ${reward.isUnlocked ? 'unlocked' : ''}`}
                >
                  <span className="checkin-reward-icon">{reward.icon}</span>
                  <div className="checkin-reward-info">
                    <span className="checkin-reward-title">{reward.name}</span>
                    <span className="checkin-reward-description">{reward.description}</span>
                  </div>
                  <span className={`checkin-reward-status ${reward.isUnlocked ? 'unlocked' : 'locked'}`}>
                    {reward.isUnlocked ? '已解锁' : `${reward.requiredStreak}天`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {monthRecords.length > 0 && (
          <Card>
            <CardHeader title={`${monthLabel}打卡详情`} />
            <CardContent>
              <div className="month-stats-summary">
                <div className="month-stat-item">
                  <span className="month-stat-label">打卡天数</span>
                  <span className="month-stat-value">{monthRecords.length}</span>
                </div>
                <div className="month-stat-item">
                  <span className="month-stat-label">练习时长</span>
                  <span className="month-stat-value">
                    {formatDuration(monthRecords.reduce((sum, r) => sum + r.practiceDuration, 0))}
                  </span>
                </div>
                <div className="month-stat-item">
                  <span className="month-stat-label">练习次数</span>
                  <span className="month-stat-value">
                    {monthRecords.reduce((sum, r) => sum + r.sessionsCount, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}