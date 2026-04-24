# 音乐练习助手 - 启动指南

## 项目概述

音乐练习助手是一个基于 React + TypeScript 的音乐练习应用，支持乐谱显示、音准检测、节奏评估等功能。

---

## 快速启动

### 1. 环境要求

- **Node.js**: v18.0.0 或更高版本
- **npm**: v9.0.0 或更高版本
- **浏览器**: Chrome 100+ / Safari 13+ / Firefox 100+

### 2. 安装依赖

```bash
# 进入项目目录
cd music

# 安装所有依赖
npm install
```

### 3. 启动开发服务器

```bash
# 启动前端开发服务器
npm run dev
```

启动成功后，浏览器会自动打开 `http://localhost:5174`

---

## 可用命令

### 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (端口 5174) |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |

### 测试命令

| 命令 | 说明 |
|------|------|
| `npm test` | 运行单元测试 |
| `npm test:ui` | 运行测试界面 |
| `npm test:coverage` | 运行测试覆盖率报告 |
| `npm run e2e` | 运行端到端测试 |

### 代码质量命令

| 命令 | 说明 |
|------|------|
| `npm run type-check` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |
| `npm run lint:fix` | 自动修复 ESLint 问题 |
| `npm run format` | Prettier 格式化代码 |

### Docker 命令

| 命令 | 说明 |
|------|------|
| `npm run docker:build` | 构建 Docker 镜像 |
| `npm run docker:run` | 运行 Docker 容器 |
| `npm run docker:compose` | 启动完整服务编排 |

---

## 项目结构

```
music/
├── src/                    # 源代码目录
│   ├── components/         # React 组件
│   │   ├── pages/          # 页面组件
│   │   ├── UI/             # 基础 UI 组件
│   │   └── Theme/          # 主题系统
│   ├── services/           # 业务服务
│   ├── backend/            # 后端服务 (模拟)
│   ├── audio/              # 音频处理
│   ├── engine/             # 核心引擎
│   ├── router/             # 路由配置
│   └── hooks/              # React Hooks
│
├── public/                 # 静态资源
├── e2e/                    # 端到端测试
├── Dockerfile              # Docker 配置
├── docker-compose.yml      # Docker 编排
└── package.json            # 项目配置
```

---

## 主要页面

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 应用入口 |
| `/practice` | 练习页 | 核心练习功能 |
| `/library` | 曲库页 | 曲目管理 |
| `/statistics` | 统计页 | 练习数据统计 |
| `/achievements` | 成就页 | 成就系统 |
| `/checkin` | 签到页 | 每日签到 |
| `/leaderboard` | 排行榜 | 用户排名 |
| `/ai-analysis` | AI分析 | AI练习建议 (Premium) |
| `/performance` | 性能监控 | 性能指标 |
| `/subscription` | 订阅页 | Premium订阅 |
| `/settings` | 设置页 | 用户设置 |

---

## 功能特性

### 核心功能
- ✅ MusicXML 乐谱解析与渲染
- ✅ 实时音准检测 (YIN 算法)
- ✅ 节奏评估与反馈
- ✅ 多声部支持
- ✅ 练习模式 (慢速/快速/循环/挑战)

### 社交功能
- ✅ 成就系统
- ✅ 每日签到
- ✅ 排行榜
- ✅ 分享功能

### Premium 功能
- ✅ 高级统计分析
- ✅ AI 练习建议
- ✅ 官方曲库
- ✅ 无限制 OCR 导入

---

## 环境配置

### 开发环境

项目使用 `.env.development` 配置开发环境：

```bash
# 开发环境配置 (已预置)
VITE_APP_NAME=Music Practice Assistant (Dev)
VITE_API_BASE_URL=http://localhost:3001/api
VITE_DEBUG_MODE=true
```

### 生产环境

项目使用 `.env.production` 配置生产环境：

```bash
# 生产环境配置 (已预置)
VITE_APP_NAME=Music Practice Assistant
VITE_API_BASE_URL=https://api.musicpractice.app/api
VITE_DEBUG_MODE=false
```

---

## 后端服务 (可选)

### 启动模拟后端

```bash
# 使用 Docker 启动完整服务
npm run docker:compose

# 或手动启动后端
cd src/backend
node server.ts
```

### 后端服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | 5174 | React 开发服务器 |
| 后端 API | 3001 | Express 服务器 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存服务 |

---

## 常见问题

### Q: 麦克风无法使用？

**解决方案**:
1. 确保浏览器有麦克风权限
2. 在 Chrome 中访问 `chrome://settings/content/microphone`
3. 添加 `localhost:5174` 到允许列表

### Q: 乐谱无法加载？

**解决方案**:
1. 检查 MusicXML 文件格式是否正确
2. 确保文件编码为 UTF-8
3. 使用示例文件测试: `src/assets/sampleXml.ts`

### Q: 音准检测不准确？

**解决方案**:
1. 运行校准流程 (`/calibration`)
2. 确保环境安静
3. 调整麦克风灵敏度

### Q: 构建失败？

**解决方案**:
```bash
# 清除缓存重新安装
rm -rf node_modules
rm -rf dist
npm install
npm run build
```

---

## 技术支持

### 文档资源
- [开发进度](v2.0-progress.md) - 详细开发记录
- [需求矩阵](spec/requirements/requirements-matrix.md) - 功能需求追踪
- [API规范](docs/api-spec.md) - API接口文档

### 问题反馈
- 在项目仓库提交 Issue
- 查看 `.trae/specs/` 目录下的详细文档

---

## 版本信息

- **当前版本**: v1.0.0
- **最后更新**: 2026-04-21
- **完成进度**: 100%

---

*祝您使用愉快！* 🎵