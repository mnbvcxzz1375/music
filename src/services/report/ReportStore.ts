import { create } from 'zustand';
import {
  ReportFormat,
  ReportPeriod,
  ReportConfig,
  ReportData,
  ReportSection,
  ExportResult,
} from './types';
import { useStatisticsStore } from '@/services/statistics';
import { useAchievementStore } from '@/services/achievements';

interface ReportStore {
  config: ReportConfig;
  lastReport: ReportData | null;
  isGenerating: boolean;
  
  generateReport: (config?: Partial<ReportConfig>) => ReportData;
  exportReport: (format?: ReportFormat) => Promise<ExportResult>;
  downloadReport: (format?: ReportFormat) => Promise<void>;
  
  setConfig: (config: Partial<ReportConfig>) => void;
  setPeriod: (period: ReportPeriod) => void;
  setFormat: (format: ReportFormat) => void;
  toggleSection: (section: ReportSection) => void;
}

const defaultConfig: ReportConfig = {
  format: 'pdf',
  period: 'weekly',
  includeSections: ['summary', 'accuracy', 'duration', 'pieces', 'errors', 'trends', 'achievements'],
};

function getPeriodDates(period: ReportPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);
  
  switch (period) {
    case 'daily':
      start.setDate(start.getDate() - 1);
      break;
    case 'weekly':
      start.setDate(start.getDate() - 7);
      break;
    case 'monthly':
      start.setMonth(start.getMonth() - 1);
      break;
    default:
      start = new Date(0);
  }
  
  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
}

export const useReportStore = create<ReportStore>()(
  (set, get) => ({
    config: defaultConfig,
    lastReport: null,
    isGenerating: false,

    generateReport: (newConfig) => {
      set({ isGenerating: true });
      
      const config = newConfig ? { ...get().config, ...newConfig } : get().config;
      const periodDates = getPeriodDates(config.period);
      
      const statsStore = useStatisticsStore.getState();
      const achievementStore = useAchievementStore.getState();
      
      const sessions = statsStore.sessions.filter(s => {
        const sessionDate = new Date(s.startTime);
        return sessionDate >= periodDates.start && sessionDate <= periodDates.end;
      });
      
      const totalDuration = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
      const totalSessions = sessions.length;
      const averageAccuracy = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length
        : 0;
      const uniquePieces = new Set(sessions.map(s => s.pieceId)).size;
      
      const byPieceAccuracy: Record<string, number> = {};
      const pieces: Record<string, { count: number; accuracy: number[]; duration: number; lastDate: Date }> = {};
      
      sessions.forEach(s => {
        if (!pieces[s.pieceId]) {
          pieces[s.pieceId] = { count: 0, accuracy: [], duration: 0, lastDate: new Date(s.startTime) };
        }
        pieces[s.pieceId].count++;
        pieces[s.pieceId].accuracy.push(s.accuracy);
        pieces[s.pieceId].duration += s.durationSeconds;
        if (new Date(s.startTime) > pieces[s.pieceId].lastDate) {
          pieces[s.pieceId].lastDate = new Date(s.startTime);
        }
      });
      
      const pieceAnalysis = Object.entries(pieces).map(([id, data]) => ({
        id,
        title: sessions.find(s => s.pieceId === id)?.pieceTitle || 'Unknown',
        practiceCount: data.count,
        averageAccuracy: data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length,
        totalDuration: data.duration,
        lastPracticeDate: data.lastDate,
      }));
      
      const byDate: Record<string, { accuracy: number[]; duration: number; sessions: number }> = {};
      sessions.forEach(s => {
        const dateKey = formatDate(new Date(s.startTime));
        if (!byDate[dateKey]) {
          byDate[dateKey] = { accuracy: [], duration: 0, sessions: 0 };
        }
        byDate[dateKey].accuracy.push(s.accuracy);
        byDate[dateKey].duration += s.durationSeconds;
        byDate[dateKey].sessions++;
      });
      
      const trends = Object.entries(byDate).map(([date, data]) => ({
        date,
        accuracy: data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length,
        duration: data.duration,
        sessions: data.sessions,
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      const unlockedAchievements = achievementStore.getUnlockedAchievements();
      
      const report: ReportData = {
        generatedAt: new Date(),
        period: periodDates,
        summary: {
          totalSessions,
          totalDuration,
          averageAccuracy,
          totalPieces: uniquePieces,
          streakDays: statsStore.getStreakDays(),
        },
        accuracy: {
          overall: averageAccuracy,
          byPiece: byPieceAccuracy,
          byDate: Object.fromEntries(
            Object.entries(byDate).map(([k, v]) => [k, v.accuracy.reduce((a, b) => a + b, 0) / v.accuracy.length])
          ),
          improvementRate: trends.length >= 2
            ? ((trends[trends.length - 1].accuracy - trends[0].accuracy) / trends[0].accuracy) * 100
            : 0,
        },
        duration: {
          total: totalDuration,
          averagePerSession: totalSessions > 0 ? totalDuration / totalSessions : 0,
          byDate: Object.fromEntries(Object.entries(byDate).map(([k, v]) => [k, v.duration])),
          peakDay: Object.entries(byDate).reduce((a, b) => b[1].duration > a[1].duration ? b : a)[0] || '',
        },
        pieces: pieceAnalysis,
        errors: {
          totalErrors: sessions.reduce((sum, s) => sum + s.pitchErrors + s.rhythmErrors, 0),
          byType: {
            pitch: sessions.reduce((sum, s) => sum + s.pitchErrors, 0),
            rhythm: sessions.reduce((sum, s) => sum + s.rhythmErrors, 0),
          },
          byPiece: {},
          commonErrors: [],
        },
        trends,
        achievements: unlockedAchievements.map(a => ({
          id: a.id,
          name: a.name,
          unlockedAt: a.unlockedAt || new Date(),
        })),
      };
      
      set({ lastReport: report, config, isGenerating: false });
      return report;
    },

    exportReport: async (format) => {
      const report = get().lastReport;
      if (!report) {
        return { success: false, error: 'No report generated' };
      }
      
      const exportFormat = format || get().config.format;
      const filename = `practice-report-${formatDate(report.period.start)}-${formatDate(report.period.end)}`;
      
      switch (exportFormat) {
        case 'json':
          return {
            success: true,
            data: JSON.stringify(report, null, 2),
            filename: `${filename}.json`,
          };
        
        case 'csv': {
          const csvData = generateCSV(report);
          return {
            success: true,
            data: csvData,
            filename: `${filename}.csv`,
          };
        }
        
        case 'html': {
          const htmlData = generateHTML(report);
          return {
            success: true,
            data: htmlData,
            filename: `${filename}.html`,
          };
        }
        
        case 'pdf': {
          const pdfHtml = generatePDFHTML(report);
          return {
            success: true,
            data: pdfHtml,
            filename: `${filename}.pdf`,
          };
        }
        
        default:
          return { success: false, error: 'Unknown format' };
      }
    },

    downloadReport: async (format) => {
      const result = await get().exportReport(format);
      
      if (!result.success || !result.data || !result.filename) {
        alert(result.error || '导出失败');
        return;
      }
      
      const exportFormat = format || get().config.format;
      
      if (exportFormat === 'pdf') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(String(result.data));
          printWindow.document.close();
          printWindow.onload = () => {
            printWindow.print();
          };
        }
        return;
      }
      
      const blob = new Blob([String(result.data)], { 
        type: exportFormat === 'json' ? 'application/json' 
             : exportFormat === 'csv' ? 'text/csv' 
             : 'text/html' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    setConfig: (newConfig) => {
      set((state) => ({
        config: { ...state.config, ...newConfig },
      }));
    },

    setPeriod: (period) => {
      set((state) => ({
        config: { ...state.config, period },
      }));
    },

    setFormat: (format) => {
      set((state) => ({
        config: { ...state.config, format },
      }));
    },

    toggleSection: (section) => {
      set((state) => {
        const sections = state.config.includeSections;
        const newSections = sections.includes(section)
          ? sections.filter(s => s !== section)
          : [...sections, section];
        return {
          config: { ...state.config, includeSections: newSections },
        };
      });
    },
  })
);

function generateCSV(report: ReportData): string {
  const rows = [
    ['Metric', 'Value'],
    ['Total Sessions', report.summary.totalSessions],
    ['Total Duration (min)', Math.round(report.summary.totalDuration / 60)],
    ['Average Accuracy', report.summary.averageAccuracy.toFixed(2)],
    ['Total Pieces', report.summary.totalPieces],
    ['Streak Days', report.summary.streakDays],
    [''],
    ['Pieces Practiced'],
    ['Title', 'Count', 'Accuracy', 'Duration (min)'],
  ];
  
  report.pieces.forEach(p => {
    rows.push([p.title, p.practiceCount, p.averageAccuracy.toFixed(2), Math.round(p.totalDuration / 60)]);
  });
  
  return rows.map(row => row.join(',')).join('\n');
}

function generateHTML(report: ReportData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Practice Report</title>
  <style>
    body { font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    h1 { color: #d4af37; }
    h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .metric-value { font-weight: bold; color: #d4af37; }
    .positive { color: green; }
    .negative { color: red; }
  </style>
</head>
<body>
  <h1>🎵 MusicMaster Practice Report</h1>
  <p>Period: ${formatDate(report.period.start)} - ${formatDate(report.period.end)}</p>
  
  <h2>Summary</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total Sessions</td><td class="metric-value">${report.summary.totalSessions}</td></tr>
    <tr><td>Total Duration</td><td class="metric-value">${formatDuration(report.summary.totalDuration)}</td></tr>
    <tr><td>Average Accuracy</td><td class="metric-value">${report.summary.averageAccuracy.toFixed(2)}%</td></tr>
    <tr><td>Total Pieces</td><td class="metric-value">${report.summary.totalPieces}</td></tr>
    <tr><td>Streak Days</td><td class="metric-value">${report.summary.streakDays}</td></tr>
  </table>
  
  <h2>Pieces Practiced</h2>
  <table>
    <tr><th>Title</th><th>Count</th><th>Accuracy</th><th>Duration</th></tr>
    ${report.pieces.map(p => `
      <tr>
        <td>${p.title}</td>
        <td>${p.practiceCount}</td>
        <td>${p.averageAccuracy.toFixed(2)}%</td>
        <td>${formatDuration(p.totalDuration)}</td>
      </tr>
    `).join('')}
  </table>
  
  <h2>Accuracy Analysis</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Overall Accuracy</td><td>${report.accuracy.overall.toFixed(2)}%</td></tr>
    <tr><td>Improvement Rate</td><td class="${report.accuracy.improvementRate >= 0 ? 'positive' : 'negative'}">${report.accuracy.improvementRate.toFixed(2)}%</td></tr>
  </table>
  
  <h2>Error Analysis</h2>
  <table>
    <tr><th>Error Type</th><th>Count</th></tr>
    <tr><td>Pitch Errors</td><td>${report.errors.byType.pitch}</td></tr>
    <tr><td>Rhythm Errors</td><td>${report.errors.byType.rhythm}</td></tr>
    <tr><td>Total Errors</td><td>${report.errors.totalErrors}</td></tr>
  </table>
  
  ${report.achievements.length > 0 ? `
    <h2>Achievements Unlocked</h2>
    <ul>
      ${report.achievements.map(a => `<li>${a.name} - ${formatDate(a.unlockedAt)}</li>`).join('')}
    </ul>
  ` : ''}
  
  <p style="color: #666; font-size: 12px;">Generated: ${new Date().toLocaleString()}</p>
</body>
</html>
`;
}

function generatePDFHTML(report: ReportData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Practice Report - MusicMaster</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { 
      font-family: 'Helvetica', 'Arial', sans-serif; 
      padding: 0;
      color: #333;
      line-height: 1.5;
    }
    .header { 
      text-align: center; 
      border-bottom: 2px solid #d4af37; 
      padding-bottom: 20px; 
      margin-bottom: 30px;
    }
    .header h1 { 
      color: #d4af37; 
      font-size: 24px; 
      margin: 0;
    }
    .header p { 
      color: #666; 
      margin: 10px 0 0;
    }
    .section { 
      margin-bottom: 25px; 
    }
    .section-title { 
      font-size: 16px; 
      color: #d4af37; 
      border-bottom: 1px solid #ddd; 
      padding-bottom: 8px; 
      margin-bottom: 15px;
    }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin-bottom: 15px;
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 10px; 
      text-align: left;
    }
    th { 
      background: #f5f5f5; 
      font-weight: bold;
    }
    .metric-highlight { 
      font-weight: bold; 
      color: #d4af37;
    }
    .positive { color: #28a745; }
    .negative { color: #dc3545; }
    .footer { 
      text-align: center; 
      color: #999; 
      font-size: 10px; 
      margin-top: 30px;
      border-top: 1px solid #ddd;
      padding-top: 15px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .summary-item {
      text-align: center;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 5px;
    }
    .summary-value {
      font-size: 20px;
      font-weight: bold;
      color: #d4af37;
    }
    .summary-label {
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎵 MusicMaster Practice Report</h1>
    <p>练习报告 | ${formatDate(report.period.start)} - ${formatDate(report.period.end)}</p>
  </div>
  
  <div class="section">
    <div class="section-title">练习概览</div>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-value">${report.summary.totalSessions}</div>
        <div class="summary-label">练习次数</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${formatDuration(report.summary.totalDuration)}</div>
        <div class="summary-label">总时长</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${report.summary.averageAccuracy.toFixed(1)}%</div>
        <div class="summary-label">平均准确率</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${report.summary.totalPieces}</div>
        <div class="summary-label">练习曲目</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${report.summary.streakDays}</div>
        <div class="summary-label">连续天数</div>
      </div>
      <div class="summary-item">
        <div class="summary-value ${report.accuracy.improvementRate >= 0 ? 'positive' : 'negative'}">${report.accuracy.improvementRate.toFixed(1)}%</div>
        <div class="summary-label">进步率</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">曲目练习详情</div>
    <table>
      <tr>
        <th>曲目名称</th>
        <th>练习次数</th>
        <th>平均准确率</th>
        <th>练习时长</th>
      </tr>
      ${report.pieces.map(p => `
        <tr>
          <td>${p.title}</td>
          <td>${p.practiceCount}</td>
          <td class="metric-highlight">${p.averageAccuracy.toFixed(1)}%</td>
          <td>${formatDuration(p.totalDuration)}</td>
        </tr>
      `).join('')}
    </table>
  </div>
  
  <div class="section">
    <div class="section-title">错误分析</div>
    <table>
      <tr>
        <th>错误类型</th>
        <th>数量</th>
        <th>占比</th>
      </tr>
      <tr>
        <td>音准错误</td>
        <td>${report.errors.byType.pitch}</td>
        <td>${report.errors.totalErrors > 0 ? ((report.errors.byType.pitch / report.errors.totalErrors) * 100).toFixed(1) : 0}%</td>
      </tr>
      <tr>
        <td>节奏错误</td>
        <td>${report.errors.byType.rhythm}</td>
        <td>${report.errors.totalErrors > 0 ? ((report.errors.byType.rhythm / report.errors.totalErrors) * 100).toFixed(1) : 0}%</td>
      </tr>
      <tr>
        <td>总计</td>
        <td class="metric-highlight">${report.errors.totalErrors}</td>
        <td>100%</td>
      </tr>
    </table>
  </div>
  
  ${report.achievements.length > 0 ? `
    <div class="section">
      <div class="section-title">解锁成就</div>
      <table>
        <tr>
          <th>成就名称</th>
          <th>解锁时间</th>
        </tr>
        ${report.achievements.map(a => `
          <tr>
            <td>${a.name}</td>
            <td>${formatDate(a.unlockedAt)}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  ` : ''}
  
  <div class="footer">
    <p>Generated by MusicMaster | ${new Date().toLocaleString()}</p>
    <p>https://musicmaster.app</p>
  </div>
</body>
</html>
`;
}

export function getReportStore() {
  return useReportStore.getState();
}