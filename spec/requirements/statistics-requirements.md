# 练习数据统计模块需求规格

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联PRD | PRD-music-practice-app-v2.md |
| 关联架构 | backend-architecture.md |

---

## 1. 练习记录功能

### 1.1 功能描述

记录每次练习的详细数据，包括时长、准确率、错误详情。

### 1.2 记录内容

| 数据项 | 类型 | 说明 |
|--------|------|------|
| startTime | Date | 开始时间 |
| endTime | Date | 结束时间 |
| durationSeconds | number | 练习时长 |
| totalNotes | number | 总音符数 |
| correctNotes | number | 正确音符数 |
| accuracy | number | 准确率（百分比） |
| pitchErrors | number | 音准错误数 |
| rhythmErrors | number | 节拍错误数 |
| retries | number | 重试次数 |
| averagePitchDeviation | number | 平均音准偏差（音分） |
| averageTimingDeviation | number | 平均节拍偏差（毫秒） |
| errors | PracticeError[] | 错误详情列表 |

### 1.3 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 记录保存 | 练习记录正确保存 | 单元测试 |
| 数据准确 | 统计数据计算正确 | 单元测试 |
| 错误记录 | 错误详情正确记录 | 单元测试 |

### 1.4 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /practice/sessions | GET | 获取练习记录列表 |
| /practice/sessions | POST | 创建练习记录 |
| /practice/sessions/:id | GET | 获取练习记录详情 |

---

## 2. 进度分析功能

### 2.1 功能描述

分析用户练习进度，提供趋势图表和技能评估。

### 2.2 统计维度

| 维度 | 说明 |
|------|------|
| 日统计 | 今日练习时长、曲目数、准确率 |
| 周统计 | 本周累计、日均、趋势图 |
| 月统计 | 月度报告、进步曲线 |
| 年度统计 | 年度总结、里程碑 |

### 2.3 技能评估

| 技能 | 评估指标 |
|------|----------|
| 音准技能 | 音准准确率趋势 |
| 节拍技能 | 节拍准确率趋势 |
| 曲目掌握 | 每首曲目掌握程度 |
| 练习频率 | 练习频率和时长 |

### 2.4 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 统计计算 | 统计数据正确计算 | 单元测试 |
| 图表渲染 | 图表正确渲染 | E2E测试 |
| 趋势分析 | 趋势正确显示 | E2E测试 |

### 2.5 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /practice/stats | GET | 获取统计数据 |
| /practice/stats/daily | GET | 获取日统计 |
| /practice/stats/weekly | GET | 获取周统计 |
| /practice/stats/monthly | GET | 获取月统计 |

---

## 3. 报告导出功能

### 3.1 功能描述

导出练习报告为PDF格式，包含详细分析和图表。

### 3.2 报告内容

| 内容 | 说明 |
|------|------|
| 练习概览 | 总时长、曲目数、平均准确率 |
| 曲目进度 | 每首曲目掌握程度 |
| 错误分析 | 常见错误类型和位置 |
| 趋势图表 | 准确率趋势、练习时长趋势 |
| 建议 | 基于数据的练习建议 |

### 3.3 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| PDF生成 | PDF正确生成 | E2E测试 |
| 内容完整 | 报告内容完整 | E2E测试 |
| 图表嵌入 | 图表正确嵌入 | E2E测试 |

### 3.4 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /practice/report | GET | 生成练习报告 |
| /practice/report/download | GET | 下载PDF报告 |

---

## 4. 数据结构

### 4.1 PracticeSession类型

```typescript
interface PracticeSession {
  id: string;
  userId: string;
  pieceId: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  totalNotes: number;
  correctNotes: number;
  accuracy: number;
  pitchErrors: number;
  rhythmErrors: number;
  retries: number;
  averagePitchDeviation: number;
  averageTimingDeviation: number;
  errors: PracticeError[];
  settings: PracticeSettings;
  createdAt: Date;
}

interface PracticeError {
  measureIndex: number;
  noteIndex: number;
  errorType: 'pitch' | 'rhythm';
  deviation: number;
  timestamp: Date;
}

interface PracticeSettings {
  tempo: number;
  mode: 'normal' | 'slow' | 'segment' | 'loop';
  partId: string;
}
```

### 4.2 PracticeStats类型

```typescript
interface PracticeStats {
  totalDuration: number;
  totalSessions: number;
  totalPieces: number;
  averageAccuracy: number;
  streakDays: number;
  skillLevels: SkillLevel[];
}

interface SkillLevel {
  skill: 'pitch' | 'rhythm' | 'duration';
  level: number;
  progress: number;
}
```

---

## 5. 测试用例清单

| 用例ID | 用例名称 | 测试类型 | 状态 |
|--------|----------|----------|------|
| TC-H01 | 练习记录测试 | 单元测试 | ⏳待开发 |
| TC-H02 | 统计计算测试 | 单元测试 | ⏳待开发 |
| TC-H03 | 图表渲染测试 | E2E测试 | ⏳待开发 |
| TC-H04 | 数据导出测试 | E2E测试 | ⏳待开发 |
| TC-PA01 | 进度分析测试 | 单元测试 | ⏳待开发 |
| TC-PA02 | 技能评估测试 | 单元测试 | ⏳待开发 |
| TC-RE01 | 报告生成测试 | E2E测试 | ⏳待开发 |

---

*文档结束*