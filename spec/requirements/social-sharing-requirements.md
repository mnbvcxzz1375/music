# 社交分享模块需求规格

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-17 |
| 关联PRD | PRD-music-practice-app-v2.md |
| 关联文档 | backend-architecture.md, api-spec.md |

---

## 1. 成就系统功能

### 1.1 功能描述

用户在练习过程中达成特定条件时，自动触发成就徽章奖励，增强用户粘性和成就感。

### 1.2 成就类型定义

| 成就ID | 成就名称 | 成就类型 | 触发条件 | 徽章图标 | 奖励 |
|--------|----------|----------|----------|----------|------|
| AC001 | 初学者 | practice | 完成首次练习 | 🎵 starter | 无 |
| AC002 | 坚持者 | practice | 连续打卡7天 | 🔥 streak-7 | 无 |
| AC003 | 坚持达人 | practice | 连续打卡30天 | 🔥🔥 streak-30 | Premium试用7天 |
| AC004 | 百小时 | duration | 累计练习100小时 | ⏱️ 100h | 专属徽章 |
| AC005 | 千小时 | duration | 累计练习1000小时 | ⏱️⏱️ 1000h | Pro试用30天 |
| AC006 | 完美主义 | accuracy | 单曲准确率100% | 💯 perfect | 无 |
| AC007 | 音准大师 | accuracy | 音准准确率连续30天>90% | 🎯 pitch-master | 无 |
| AC008 | 节拍大师 | accuracy | 节拍准确率连续30天>90% | 🥁 rhythm-master | 无 |
| AC009 | 曲库达人 | practice | 练习50首不同曲目 | 📚 50-songs | 无 |
| AC010 | 曲库大师 | practice | 练习100首不同曲目 | 📚📚 100-songs | Premium试用14天 |
| AC011 | 首次OCR | special | 首次成功导入OCR乐谱 | 📷 ocr-first | 无 |
| AC012 | 社交达人 | social | 分享练习成果10次 | 📤 share-10 | 无 |
| AC013 | 周冠军 | special | 周练习时长排行榜第1名 | 🏆 week-champ | Pro试用7天 |
| AC014 | 月冠军 | special | 月练习时长排行榜第1名 | 🏆🏆 month-champ | Pro试用30天 |

### 1.3 成就触发逻辑

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  condition: AchievementCondition;
  iconUrl: string;
  reward?: AchievementReward;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  createdAt: Date;
}

enum AchievementCategory {
  Practice = 'practice',
  Accuracy = 'accuracy',
  Duration = 'duration',
  Social = 'social',
  Special = 'special',
}

interface AchievementCondition {
  type: 'count' | 'streak' | 'percentage' | 'duration' | 'rank';
  targetValue: number;
  timeWindow?: 'daily' | 'weekly' | 'monthly' | 'lifetime';
  prerequisite?: string;
}

interface AchievementReward {
  type: 'premium_trial' | 'pro_trial' | 'badge' | 'discount';
  value: number;
  unit: 'days' | 'percent' | 'badge_id';
}
```

### 1.4 成就触发流程

```
成就触发流程:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 用户行为    │ -> │ 条件检查    │ -> │ 成就触发    │ -> │ 通知用户    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     │                  │                  │                  │
     v                  v                  v                  v
  练习完成          检查成就条件       创建成就记录       弹窗通知
  打卡记录          查询用户数据       更新用户成就       推送通知
  分享行为          计算达成状态       发放奖励          更新徽章列表
```

### 1.5 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 成就触发准确性 | 条件满足时100%触发 | 单元测试 |
| 成就唯一性 | 同一成就不重复触发 | 单元测试 |
| 成就通知显示 | 弹窗正确显示成就信息 | E2E测试 |
| 成就列表显示 | 成就页面正确展示所有成就 | E2E测试 |
| 奖励发放 | 奖励正确发放到用户账户 | 单元测试 |

### 1.6 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /achievements | GET | 获取所有成就定义 |
| /users/me/achievements | GET | 获取用户已获得成就 |
| /users/me/achievements/{id} | GET | 获取单个成就详情 |
| /achievements/check | POST | 检查成就触发条件 |

---

## 2. 分享功能

### 2.1 功能描述

用户可将练习成果、成就获得、打卡记录等内容分享到社交平台，增强社交传播和用户增长。

### 2.2 分享内容类型

| 分享类型 | 内容描述 | 触发时机 | 分享卡片模板 |
|----------|----------|----------|--------------|
| 练习成果 | 练习报告卡片 | 练习结束后 | practice-result |
| 成就获得 | 成就徽章获得通知 | 成就触发时 | achievement-unlock |
| 打卡记录 | 每日/连续打卡记录 | 打卡完成时 | daily-checkin |
| 周报分享 | 周练习统计报告 | 周末生成时 | weekly-report |
| 曲目完成 | 曲目首次完成通知 | 曲目完成时 | piece-complete |

### 2.3 分享卡片设计规范

```
分享卡片设计:
┌─────────────────────────────────────────────┐
│ 🎵 MusicMaster                              │
│                                             │
│ 今日练习: 小步舞曲 - Bach                   │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 准确率: 92% ⭐⭐⭐⭐⭐                   │ │
│ │ 时长: 30分钟                            │ │
│ │ 错误: 3处                               │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 连续打卡: 7天 🔥                            │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [扫码加入练习]                          │ │
│ │ QR Code: xxx                            │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ musicmaster.app/share/xxx                   │
└─────────────────────────────────────────────┘
```

### 2.4 分享渠道

| 渠道 | 平台 | 分享方式 | 图片格式 |
|------|------|----------|----------|
| 微信 | WeChat | 微信SDK分享 | PNG 1080x1920 |
| 朋友圈 | WeChat Moments | 微信SDK分享 | PNG 1080x1920 |
| 微博 | Sina Weibo | 微博SDK分享 | PNG 1080x1920 |
| Facebook | Facebook | Facebook SDK | PNG 1080x1920 |
| Twitter | Twitter | Twitter SDK | PNG 1080x1920 |
| 链接分享 | Universal | 生成分享链接 | 无 |
| 保存图片 | Local | 保存到本地 | PNG 1080x1920 |

### 2.5 分享数据结构

```typescript
interface ShareContent {
  id: string;
  userId: string;
  type: ShareType;
  templateId: string;
  data: ShareData;
  imageUrl?: string;
  shareUrl: string;
  createdAt: Date;
  expiresAt?: Date;
}

enum ShareType {
  PracticeResult = 'practice_result',
  AchievementUnlock = 'achievement_unlock',
  DailyCheckin = 'daily_checkin',
  WeeklyReport = 'weekly_report',
  PieceComplete = 'piece_complete',
}

interface ShareData {
  pieceTitle?: string;
  pieceComposer?: string;
  accuracy?: number;
  duration?: number;
  errors?: number;
  streakDays?: number;
  achievementName?: string;
  achievementIcon?: string;
  weeklyStats?: WeeklyStats;
}

interface ShareTemplate {
  id: string;
  name: string;
  type: ShareType;
  backgroundUrl: string;
  layout: TemplateLayout;
  active: boolean;
}
```

### 2.6 分享流程

```
分享流程:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 触发分享    │ -> │ 生成卡片    │ -> │ 选择渠道    │ -> │ 完成分享    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     │                  │                  │                  │
     v                  v                  v                  v
  练习结束          渲染分享卡片       显示分享选项       调用SDK分享
  成就获得          生成图片URL        用户选择渠道       记录分享行为
  打卡完成          创建分享链接       确认分享内容       更新统计数据
```

### 2.7 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 卡片生成 | 卡片内容正确渲染 | E2E测试 |
| 图片生成 | 图片清晰度符合规范 | 单元测试 |
| 分享SDK集成 | 各平台SDK正确调用 | E2E测试 |
| 分享链接生成 | 链接可正常访问 | 单元测试 |
| 分享统计 | 分享行为正确记录 | 单元测试 |

### 2.8 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /share/generate | POST | 生成分享卡片 |
| /share/{id}/image | GET | 获取分享图片 |
| /share/{id}/url | GET | 获取分享链接 |
| /share/templates | GET | 获取分享模板列表 |
| /share/log | POST | 记录分享行为 |

---

## 3. 打卡系统

### 3.1 功能描述

用户每日完成练习后自动打卡，记录连续打卡天数，提供打卡奖励激励。

### 3.2 打卡规则

| 规则项 | 规则内容 |
|--------|----------|
| 打卡条件 | 每日练习时长≥15分钟 |
| 打卡时间 | 当日首次满足条件时自动打卡 |
| 连续打卡 | 连续天数计算，中断后重置为0 |
| 补卡机制 | Premium用户可补卡1次/周 |
| 打卡奖励 | 连续7天/30天/100天触发成就 |

### 3.3 打卡数据结构

```typescript
interface CheckinRecord {
  id: string;
  userId: string;
  date: Date;
  practiceDuration: number;
  streakDays: number;
  isMakeup: boolean;
  createdAt: Date;
}

interface CheckinStats {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
  lastCheckinDate: Date;
  makeupAvailable: number;
}
```

### 3.4 打卡流程

```
打卡流程:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 练习完成    │ -> │ 条件检查    │ -> │ 自动打卡    │ -> │ 更新统计    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     │                  │                  │                  │
     v                  v                  v                  v
  记录练习时长      检查≥15分钟        创建打卡记录       更新连续天数
  结束练习          检查当日是否打卡   计算连续天数       检查成就触发
  保存数据          检查中断情况       发送打卡通知       更新打卡统计
```

### 3.5 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 打卡触发准确性 | 条件满足时自动打卡 | 单元测试 |
| 连续天数计算 | 正确计算连续打卡天数 | 单元测试 |
| 中断重置 | 中断后连续天数重置为0 | 单元测试 |
| 补卡功能 | Premium用户补卡功能正常 | E2E测试 |
| 打卡通知 | 打卡成功通知正确显示 | E2E测试 |

### 3.6 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /checkin | POST | 创建打卡记录 |
| /checkin/today | GET | 获取今日打卡状态 |
| /checkin/stats | GET | 获取打卡统计 |
| /checkin/makeup | POST | 补卡操作 |

---

## 4. 排行榜功能

### 4.1 功能描述

展示用户练习时长、准确率等指标的排名，激励用户竞争和持续练习。

### 4.2 排行榜类型

| 排行榜ID | 排行榜名称 | 排名指标 | 时间范围 | 更新频率 |
|----------|----------|----------|----------|----------|
| LB001 | 周练习时长榜 | 练习总时长(分钟) | 本周 | 每小时 |
| LB002 | 月练习时长榜 | 练习总时长(分钟) | 本月 | 每小时 |
| LB003 | 周准确率榜 | 平均准确率 | 本周 | 每小时 |
| LB004 | 月准确率榜 | 平均准确率 | 本月 | 每小时 |
| LB005 | 连续打卡榜 | 连续打卡天数 | 全时间 | 每日 |
| LB006 | 曲目完成榜 | 完成曲目数 | 全时间 | 每日 |

### 4.3 排行榜数据结构

```typescript
interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  value: number;
  unit: string;
  isAnonymous: boolean;
}

interface Leaderboard {
  id: string;
  name: string;
  type: LeaderboardType;
  timeRange: TimeRange;
  entries: LeaderboardEntry[];
  myRank?: number;
  myValue?: number;
  updatedAt: Date;
}

enum LeaderboardType {
  PracticeDuration = 'practice_duration',
  Accuracy = 'accuracy',
  StreakDays = 'streak_days',
  PieceComplete = 'piece_complete',
}

enum TimeRange {
  Weekly = 'weekly',
  Monthly = 'monthly',
  AllTime = 'all_time',
}
```

### 4.4 排行榜隐私设置

| 设置项 | 说明 |
|--------|------|
| 显示昵称 | 用户可选择显示昵称或匿名 |
| 显示头像 | 用户可选择显示头像或默认头像 |
| 排行榜参与 | 用户可选择不参与排行榜 |
| 数据公开 | 用户可选择公开哪些数据 |

### 4.5 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 排名计算准确性 | 排名正确计算 | 单元测试 |
| 排行榜更新 | 按设定频率更新 | 单元测试 |
| 隐私设置 | 隐私设置正确生效 | E2E测试 |
| 我的排名显示 | 正确显示用户排名 | E2E测试 |
| 分页加载 | 排行榜分页正常 | E2E测试 |

### 4.6 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /leaderboards | GET | 获取排行榜列表 |
| /leaderboards/{id} | GET | 获取排行榜详情 |
| /leaderboards/{id}/me | GET | 获取我的排名 |
| /users/me/leaderboard-settings | PUT | 更新排行榜隐私设置 |

---

## 5. 数据结构汇总

### 5.1 核心类型定义

```typescript
interface SocialUserStats {
  userId: string;
  achievements: UserAchievement[];
  checkinStats: CheckinStats;
  leaderboardSettings: LeaderboardSettings;
  shareCount: number;
}

interface UserAchievement {
  achievementId: string;
  unlockedAt: Date;
  isDisplayed: boolean;
  rewardClaimed: boolean;
}

interface LeaderboardSettings {
  participate: boolean;
  showNickname: boolean;
  showAvatar: boolean;
  publicData: LeaderboardType[];
}
```

---

## 6. 测试用例清单

| 用例ID | 用例名称 | 测试类型 | 状态 |
|--------|----------|----------|------|
| TC-AC01 | 成就触发测试 | 单元测试 | ⏳待开发 |
| TC-AC02 | 成就列表显示测试 | E2E测试 | ⏳待开发 |
| TC-AC03 | 成就通知测试 | E2E测试 | ⏳待开发 |
| TC-AC04 | 成就奖励发放测试 | 单元测试 | ⏳待开发 |
| TC-AC05 | 成就唯一性测试 | 单元测试 | ⏳待开发 |
| TC-SH01 | 分享卡片生成测试 | 单元测试 | ⏳待开发 |
| TC-SH02 | 分享功能测试 | E2E测试 | ⏳待开发 |
| TC-SH03 | 分享SDK集成测试 | E2E测试 | ⏳待开发 |
| TC-SH04 | 分享链接测试 | 单元测试 | ⏳待开发 |
| TC-CK01 | 打卡触发测试 | 单元测试 | ⏳待开发 |
| TC-CK02 | 连续天数计算测试 | 单元测试 | ⏳待开发 |
| TC-CK03 | 补卡功能测试 | E2E测试 | ⏳待开发 |
| TC-LB01 | 排名计算测试 | 单元测试 | ⏳待开发 |
| TC-LB02 | 排行榜显示测试 | E2E测试 | ⏳待开发 |
| TC-LB03 | 隐私设置测试 | E2E测试 | ⏳待开发 |

---

## 7. 依赖关系

### 7.1 模块依赖

| 模块 | 依赖模块 | 依赖说明 |
|------|----------|----------|
| 成就系统 | 练习引擎 | 需要练习数据触发成就 |
| 成就系统 | 用户体系 | 需要用户数据检查条件 |
| 分享功能 | 练习引擎 | 需要练习数据生成卡片 |
| 分享功能 | 成就系统 | 需要成就数据生成卡片 |
| 打卡系统 | 练习引擎 | 需要练习时长触发打卡 |
| 排行榜 | 练习引擎 | 需要练习数据计算排名 |
| 排行榜 | 用户体系 | 需要用户隐私设置 |

### 7.2 外部依赖

| 依赖项 | 说明 | 版本要求 |
|--------|------|----------|
| 微信SDK | 微信分享功能 | 最新稳定版 |
| 微博SDK | 微博分享功能 | 最新稳定版 |
| Facebook SDK | Facebook分享功能 | v12.0+ |
| Twitter SDK | Twitter分享功能 | v2.0+ |

---

*文档结束*