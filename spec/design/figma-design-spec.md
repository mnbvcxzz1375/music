# Figma 设计规范文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 目标 | 供设计师创建 Figma 源文件参考 |

---

## 1. Figma 文件创建指南

### 1.1 文件命名

**文件名**: `MusicMaster Design System v1.0`

### 1.2 文件结构

创建以下页面结构：

```
页面结构:
├── Page 1: Foundations
│   ├── Frame: Colors
│   ├── Frame: Typography
│   ├── Frame: Spacing
│   ├── Frame: Shadows
│   └── Frame: Icons
│
├── Page 2: Components
│   ├── Frame: Buttons
│   ├── Frame: Cards
│   ├── Frame: Navigation
│   ├── Frame: Forms
│   ├── Frame: Feedback
│   └── Frame: Modals
│
├── Page 3: Pages - Dark
│   ├── Frame: Homepage
│   ├── Frame: Library
│   ├── Frame: Practice
│   ├── Frame: Statistics
│   ├── Frame: Profile
│   └── Frame: Auth
│
├── Page 4: Pages - Light
│   ├── Frame: Homepage
│   ├── Frame: Library
│   ├── Frame: Practice
│   ├── Frame: Statistics
│   ├── Frame: Profile
│   └── Frame: Auth
│
└── Page 5: Documentation
    ├── Frame: Component Specs
    └── Frame: Usage Guidelines
```

---

## 2. 颜色定义

### 2.1 Dark 主题颜色

在 Figma 中创建以下 Local Styles：

| Style名称 | 色值 | 用途 |
|-----------|------|------|
| Dark/bg-primary | #0a0a0a | 主背景 |
| Dark/bg-secondary | #161616 | 卡片背景 |
| Dark/bg-tertiary | #222222 | 输入框背景 |
| Dark/text-primary | #f2f2f2 | 主文字 |
| Dark/text-secondary | #a1a1aa | 次要文字 |
| Dark/accent | #d4af37 | 强调色 |
| Dark/accent-hover | #b8972e | 强调色悬停 |
| Dark/success | #2e8b57 | 成功状态 |
| Dark/warning | #d97706 | 警告状态 |
| Dark/error | #c53030 | 错误状态 |
| Dark/border | rgba(255,255,255,0.1) | 边框 |

### 2.2 Light 主题颜色

| Style名称 | 色值 | 用途 |
|-----------|------|------|
| Light/bg-primary | #ffffff | 主背景 |
| Light/bg-secondary | #f5f5f5 | 卡片背景 |
| Light/bg-tertiary | #e5e5e5 | 输入框背景 |
| Light/text-primary | #1a1a1a | 主文字 |
| Light/text-secondary | #666666 | 次要文字 |
| Light/accent | #d4af37 | 强调色 |
| Light/accent-hover | #b8972e | 强调色悬停 |
| Light/success | #2e8b57 | 成功状态 |
| Light/warning | #d97706 | 警告状态 |
| Light/error | #c53030 | 错误状态 |
| Light/border | rgba(0,0,0,0.1) | 边框 |

---

## 3. 字体定义

### 3.1 字体样式

| Style名称 | 字体 | 字号 | 字重 | 行高 |
|-----------|------|------|------|------|
| Display/4xl | Cormorant Garamond | 40px | 600 | 1.2 |
| Display/3xl | Cormorant Garamond | 32px | 600 | 1.2 |
| Display/2xl | Cormorant Garamond | 24px | 600 | 1.2 |
| Display/xl | Cormorant Garamond | 20px | 600 | 1.2 |
| Sans/lg | Plus Jakarta Sans | 18px | 500 | 1.6 |
| Sans/base | Plus Jakarta Sans | 16px | 400 | 1.6 |
| Sans/sm | Plus Jakarta Sans | 14px | 400 | 1.6 |
| Sans/xs | Plus Jakarta Sans | 12px | 400 | 1.6 |
| Mono/base | Fira Code | 16px | 400 | 1.6 |
| Mono/sm | Fira Code | 14px | 400 | 1.6 |

---

## 4. 间距定义

### 4.1 间距样式

| Style名称 | 值 | 用途 |
|-----------|-----|------|
| Spacing/1 | 4px | 最小间距 |
| Spacing/2 | 8px | 小间距 |
| Spacing/3 | 12px | 中小间距 |
| Spacing/4 | 16px | 标准间距 |
| Spacing/6 | 24px | 中间距 |
| Spacing/8 | 32px | 大间距 |
| Spacing/12 | 48px | 超大间距 |
| Spacing/16 | 64px | 巨大间距 |

---

## 5. 组件规格

### 5.1 Button 组件

**Primary Button**:
- 高度: 48px (large), 40px (medium), 32px (small)
- 内边距: 16px 24px (large), 12px 20px (medium), 8px 16px (small)
- 圆角: 4px
- 背景: accent
- 文字: bg-primary (Dark), bg-primary (Light)
- 字体: Sans/base, weight: 500

**Secondary Button**:
- 高度: 同上
- 内边距: 同上
- 圆角: 4px
- 背景: transparent
- 边框: 1px accent
- 文字: accent
- 字体: Sans/base, weight: 500

### 5.2 PieceCard 组件

- 宽度: 280px
- 高度: 200px
- 圆角: 4px
- 背景: bg-secondary
- 边框: 1px border
- 内边距: 16px

**内部元素**:
- 封面区域: 280x120px
- 标题: Display/xl
- 作曲家: Mono/sm, text-secondary
- 难度星级: accent色
- 按钮: Primary Button (small)

### 5.3 PitchIndicator 组件

- 高度: 40px
- 背景: bg-tertiary
- 圆角: 4px

**状态颜色**:
- 准确: success (#2e8b57)
- 轻微: warning (#d97706)
- 中等: warning (#d97706)
- 严重: error (#c53030)

---

## 6. 页面布局规格

### 6.1 Homepage

**整体布局**:
- 最大宽度: 1400px
- Header高度: 80px
- Hero高度: 400px
- 继续练习区: 200px
- 推荐曲目区: 300px
- 练习概览区: 200px
- Footer高度: 60px

**Hero Section**:
- 标题: Display/4xl
- 副标题: Sans/lg
- 主按钮: Primary Button (large)
- 次按钮: Secondary Button (large)

### 6.2 Practice Page

**整体布局**:
- Header高度: 60px
- 乐谱区高度: 500px
- 音准反馈区: 120px
- 控制栏: 80px

**乐谱容器**:
- 背景: #ffffff
- 边框: 1px border
- 圆角: 4px
- 顶部装饰: 4px accent

---

## 7. 图标规格

### 7.1 图标尺寸

| 用途 | 尺寸 | 说明 |
|------|------|------|
| 导航图标 | 24px | Header导航 |
| 按钮图标 | 20px | 按钮内图标 |
| 状态图标 | 16px | 状态指示 |
| Logo | 40px | 品牌Logo |

### 7.2 图标列表

需要创建的图标：
- logo (品牌Logo)
- icon-play (播放)
- icon-pause (暂停)
- icon-retry (重试)
- icon-settings (设置)
- icon-close (关闭)
- icon-search (搜索)
- icon-upload (上传)
- icon-favorite (收藏)
- icon-share (分享)
- icon-home (首页)
- icon-library (曲库)
- icon-practice (练习)
- icon-stats (统计)
- icon-profile (个人中心)

---

## 8. 导出设置

### 8.1 切图导出

- SVG格式: 用于图标
- PNG格式: 1x/2x/3x 用于组件背景

### 8.2 导出命名

- 图标: `icon-{name}.svg`
- 组件: `{component}-{variant}.png`

---

## 9. 验证清单

- [ ] 创建 Figma 文件
- [ ] 定义颜色 Styles
- [ ] 定义字体 Styles
- [ ] 定义间距 Styles
- [ ] 创建 Button 组件
- [ ] 创建 PieceCard 组件
- [ ] 创建 PitchIndicator 组件
- [ ] 创建 Homepage 页面
- [ ] 创建 Practice 页面
- [ ] 创建 Light 主题变体
- [ ] 导出切图资源

---

*文档结束*