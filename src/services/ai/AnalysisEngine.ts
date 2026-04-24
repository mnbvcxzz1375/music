import { PracticeSession } from '@/services/statistics/types';

export interface WeaknessAnalysis {
  type: 'pitch' | 'rhythm' | 'tempo' | 'consistency';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedPieces: string[];
  recommendations: string[];
}

export interface PracticeRecommendation {
  id: string;
  type: 'piece' | 'technique' | 'schedule' | 'mode';
  priority: number;
  title: string;
  description: string;
  estimatedImprovement: number;
  suggestedDuration: number;
  suggestedMode: string;
}

export interface AIAnalysisResult {
  overallScore: number;
  weaknesses: WeaknessAnalysis[];
  recommendations: PracticeRecommendation[];
  predictedProgress: {
    weeklyAccuracyGain: number;
    weeklyDurationGain: number;
    milestonePredictions: { milestone: string; estimatedDate: Date }[];
  };
}

export class AnalysisEngine {
  analyzeSessions(sessions: PracticeSession[]): AIAnalysisResult {
    if (sessions.length === 0) {
      return this.getEmptyResult();
    }

    const weaknesses = this.identifyWeaknesses(sessions);
    const recommendations = this.generateRecommendations(sessions, weaknesses);
    const overallScore = this.calculateOverallScore(sessions);
    const predictedProgress = this.predictProgress(sessions);

    return {
      overallScore,
      weaknesses,
      recommendations,
      predictedProgress,
    };
  }

  identifyWeaknesses(sessions: PracticeSession[]): WeaknessAnalysis[] {
    const weaknesses: WeaknessAnalysis[] = [];

    const pitchErrors = sessions.reduce((sum, s) => sum + (s.pitchErrors || 0), 0);
    const rhythmErrors = sessions.reduce((sum, s) => sum + (s.rhythmErrors || 0), 0);
    const totalErrors = pitchErrors + rhythmErrors;

    if (totalErrors === 0) {
      return weaknesses;
    }

    const pitchRatio = pitchErrors / totalErrors;
    const rhythmRatio = rhythmErrors / totalErrors;

    if (pitchRatio > 0.6) {
      weaknesses.push({
        type: 'pitch',
        severity: pitchRatio > 0.8 ? 'high' : pitchRatio > 0.7 ? 'medium' : 'low',
        description: '音准问题较为突出，需要加强音准训练',
        affectedPieces: this.getAffectedPieces(sessions, 'pitch'),
        recommendations: [
          '建议使用慢速练习模式，专注于音准准确性',
          '尝试分段练习，逐段攻克难点',
          '使用音准反馈功能，实时监控音准偏差',
        ],
      });
    }

    if (rhythmRatio > 0.6) {
      weaknesses.push({
        type: 'rhythm',
        severity: rhythmRatio > 0.8 ? 'high' : rhythmRatio > 0.7 ? 'medium' : 'low',
        description: '节奏问题较为突出，需要加强节奏训练',
        affectedPieces: this.getAffectedPieces(sessions, 'rhythm'),
        recommendations: [
          '建议使用节拍器辅助练习',
          '专注于节奏稳定性，减少抢拍或拖拍',
          '尝试节奏专项练习模式',
        ],
      });
    }

    const accuracyVariance = this.calculateVariance(sessions.map(s => s.accuracy));
    if (accuracyVariance > 15) {
      weaknesses.push({
        type: 'consistency',
        severity: accuracyVariance > 25 ? 'high' : 'medium',
        description: '练习表现波动较大，稳定性需要提升',
        affectedPieces: sessions.map(s => s.pieceId),
        recommendations: [
          '建议保持规律的练习时间',
          '每次练习前进行基础热身',
          '记录每次练习状态，分析波动原因',
        ],
      });
    }

    const tempoVariance = this.calculateVariance(sessions.map(s => s.tempo || 120));
    if (tempoVariance > 20) {
      weaknesses.push({
        type: 'tempo',
        severity: 'low',
        description: '练习速度波动较大',
        affectedPieces: sessions.map(s => s.pieceId),
        recommendations: [
          '建议固定练习速度，逐步提升',
          '使用节拍器保持稳定速度',
        ],
      });
    }

    return weaknesses;
  }

  generateRecommendations(
    sessions: PracticeSession[],
    weaknesses: WeaknessAnalysis[]
  ): PracticeRecommendation[] {
    const recommendations: PracticeRecommendation[] = [];

    const recentSessions = sessions.slice(-10);
    const avgAccuracy = recentSessions.length > 0
      ? recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / recentSessions.length
      : 0;

    if (avgAccuracy < 70) {
      recommendations.push({
        id: 'rec-001',
        type: 'mode',
        priority: 1,
        title: '使用慢速练习模式',
        description: '当前准确率偏低，建议降低速度专注于准确性',
        estimatedImprovement: 15,
        suggestedDuration: 30,
        suggestedMode: 'slow',
      });
    }

    if (avgAccuracy > 85) {
      recommendations.push({
        id: 'rec-002',
        type: 'mode',
        priority: 2,
        title: '尝试挑战模式',
        description: '准确率表现优秀，可以尝试更高难度',
        estimatedImprovement: 5,
        suggestedDuration: 20,
        suggestedMode: 'challenge',
      });
    }

    const pieceFrequency: Record<string, number> = {};
    sessions.forEach(s => {
      pieceFrequency[s.pieceId] = (pieceFrequency[s.pieceId] || 0) + 1;
    });

    const leastPracticed = Object.entries(pieceFrequency)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3);

    leastPracticed.forEach(([pieceId, count], index) => {
      if (count < 3) {
        const piece = sessions.find(s => s.pieceId === pieceId);
        recommendations.push({
          id: `rec-piece-${index}`,
          type: 'piece',
          priority: 3 + index,
          title: `练习 "${piece?.pieceTitle || pieceId}"`,
          description: '此曲目练习次数较少，建议增加练习',
          estimatedImprovement: 10,
          suggestedDuration: 15,
          suggestedMode: 'normal',
        });
      }
    });

    weaknesses.forEach((weakness, index) => {
      recommendations.push({
        id: `rec-weakness-${index}`,
        type: 'technique',
        priority: weakness.severity === 'high' ? 1 : weakness.severity === 'medium' ? 2 : 3,
        title: `改善${weakness.type === 'pitch' ? '音准' : weakness.type === 'rhythm' ? '节奏' : '稳定性'}`,
        description: weakness.description,
        estimatedImprovement: weakness.severity === 'high' ? 20 : weakness.severity === 'medium' ? 10 : 5,
        suggestedDuration: 20,
        suggestedMode: weakness.type === 'pitch' ? 'slow' : weakness.type === 'rhythm' ? 'normal' : 'loop',
      });
    });

    recommendations.push({
      id: 'rec-schedule',
      type: 'schedule',
      priority: 4,
      title: '建议练习计划',
      description: '每天练习30分钟，保持规律性',
      estimatedImprovement: 8,
      suggestedDuration: 30,
      suggestedMode: 'normal',
    });

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  calculateOverallScore(sessions: PracticeSession[]): number {
    if (sessions.length === 0) return 0;

    const avgAccuracy = sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length;
    const avgDuration = sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / sessions.length;
    const consistencyScore = 100 - this.calculateVariance(sessions.map(s => s.accuracy));
    const frequencyScore = Math.min(100, sessions.length * 5);

    return Math.round(
      avgAccuracy * 0.4 +
      Math.min(100, avgDuration / 60 * 10) * 0.2 +
      consistencyScore * 0.2 +
      frequencyScore * 0.2
    );
  }

  predictProgress(sessions: PracticeSession[]): {
    weeklyAccuracyGain: number;
    weeklyDurationGain: number;
    milestonePredictions: { milestone: string; estimatedDate: Date }[];
  } {
    const recentSessions = sessions.slice(-14);
    
    if (recentSessions.length < 7) {
      return {
        weeklyAccuracyGain: 0,
        weeklyDurationGain: 0,
        milestonePredictions: [],
      };
    }

    const firstWeek = recentSessions.slice(0, 7);
    const secondWeek = recentSessions.slice(-7);

    const firstWeekAccuracy = firstWeek.reduce((sum, s) => sum + s.accuracy, 0) / firstWeek.length;
    const secondWeekAccuracy = secondWeek.reduce((sum, s) => sum + s.accuracy, 0) / secondWeek.length;

    const firstWeekDuration = firstWeek.reduce((sum, s) => sum + s.durationSeconds, 0);
    const secondWeekDuration = secondWeek.reduce((sum, s) => sum + s.durationSeconds, 0);

    const weeklyAccuracyGain = secondWeekAccuracy - firstWeekAccuracy;
    const weeklyDurationGain = secondWeekDuration - firstWeekDuration;

    const milestonePredictions: { milestone: string; estimatedDate: Date }[] = [];

    const avgAccuracy = secondWeekAccuracy;
    if (avgAccuracy < 80) {
      const daysTo80 = Math.ceil((80 - avgAccuracy) / (weeklyAccuracyGain / 7 || 1));
      milestonePredictions.push({
        milestone: '准确率达到80%',
        estimatedDate: new Date(Date.now() + daysTo80 * 24 * 60 * 60 * 1000),
      });
    }

    if (avgAccuracy < 90) {
      const daysTo90 = Math.ceil((90 - avgAccuracy) / (weeklyAccuracyGain / 7 || 0.5));
      milestonePredictions.push({
        milestone: '准确率达到90%',
        estimatedDate: new Date(Date.now() + daysTo90 * 24 * 60 * 60 * 1000),
      });
    }

    const totalSessions = sessions.length;
    if (totalSessions < 100) {
      const sessionsPerWeek = recentSessions.length / 2;
      const weeksTo100 = Math.ceil((100 - totalSessions) / sessionsPerWeek);
      milestonePredictions.push({
        milestone: '完成100次练习',
        estimatedDate: new Date(Date.now() + weeksTo100 * 7 * 24 * 60 * 60 * 1000),
      });
    }

    return {
      weeklyAccuracyGain,
      weeklyDurationGain,
      milestonePredictions,
    };
  }

  private getAffectedPieces(sessions: PracticeSession[], errorType: 'pitch' | 'rhythm'): string[] {
    const pieceErrors: Record<string, number> = {};
    
    sessions.forEach(s => {
      const errors = errorType === 'pitch' ? s.pitchErrors : s.rhythmErrors;
      if (errors > 0) {
        pieceErrors[s.pieceId] = (pieceErrors[s.pieceId] || 0) + errors;
      }
    });

    return Object.entries(pieceErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
  }

  private getEmptyResult(): AIAnalysisResult {
    return {
      overallScore: 0,
      weaknesses: [],
      recommendations: [],
      predictedProgress: {
        weeklyAccuracyGain: 0,
        weeklyDurationGain: 0,
        milestonePredictions: [],
      },
    };
  }
}

export const analysisEngine = new AnalysisEngine();