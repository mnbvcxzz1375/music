# 设计交付物清单

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联设计 | color-system.md, style-dictionary-config.md |

---

## 1. Figma 源文件

### 1.1 文件结构

```
Figma文件结构:
MusicMaster Design System
│
├── 📁 Foundations
│   ├── Colors (Dark/Light)
│   ├── Typography
│   ├── Spacing
│   ├── Shadows
│   └── Icons
│
├── 📁 Components
│   ├── Buttons (Primary/Secondary/Icon)
│   ├── Cards (Piece Card/Stat Card)
│   ├── Navigation (Header/Sidebar)
│   ├── Forms (Input/Select/Slider)
│   ├── Feedback (Pitch Indicator/Progress Bar)
│   └── Modals (Error Modal/Settings Modal)
│
├── 📁 Pages
│   ├── Homepage
│   ├── Library
│   ├── Practice Mode
│   ├── Statistics
│   ├── Profile
│   └── Auth (Login/Register)
│
└── 📁 Variants
    ├── Dark Theme
    └── Light Theme
```

### 1.2 组件命名规范

| Figma命名 | 代码命名 | 说明 |
|-----------|----------|------|
| Button/Primary | ButtonPrimary | 主按钮 |
| Button/Secondary | ButtonSecondary | 次按钮 |
| Card/Piece | PieceCard | 曲目卡片 |
| Card/Stat | StatCard | 统计卡片 |
| Navigation/Header | Header | 顶部导航 |
| Feedback/PitchIndicator | PitchIndicator | 音准指示器 |
| Modal/Error | ErrorModal | 错误弹窗 |

### 1.3 权限控制

| 角色 | 权限 |
|------|------|
| 设计师 | 编辑、导出 |
| 开发者 | 查看、导出 |
| 产品经理 | 查看、评论 |

---

## 2. 切图资源

### 2.1 图标切图

| 图标名称 | 格式 | 尺寸 | 用途 |
|----------|------|------|------|
| logo | SVG/PNG | 1x/2x/3x | Logo |
| icon-play | SVG | 24px/48px | 播放图标 |
| icon-pause | SVG | 24px/48px | 暂停图标 |
| icon-retry | SVG | 24px/48px | 重试图标 |
| icon-settings | SVG | 24px/48px | 设置图标 |
| icon-close | SVG | 24px/48px | 关闭图标 |
| icon-search | SVG | 24px/48px | 搜索图标 |
| icon-upload | SVG | 24px/48px | 上传图标 |
| icon-favorite | SVG | 24px/48px | 收藏图标 |
| icon-share | SVG | 24px/48px | 分享图标 |

### 2.2 组件切图

| 组件名称 | 格式 | 尺寸 | 用途 |
|----------|------|------|------|
| button-primary | PNG | 1x/2x/3x | 主按钮背景 |
| button-secondary | PNG | 1x/2x/3x | 次按钮背景 |
| card-bg | PNG | 1x/2x/3x | 卡片背景 |
| pitch-indicator | PNG | 1x/2x/3x | 音准指示器 |
| progress-bar | PNG | 1x/2x/3x | 进度条 |

### 2.3 输出目录

```
assets/
├── icons/
│   ├── svg/
│   │   ├── logo.svg
│   │   ├── icon-play.svg
│   │   └── ...
│   └── png/
│       ├── 1x/
│       ├── 2x/
│       └── 3x/
│
├── components/
│   ├── buttons/
│   ├── cards/
│   └── feedback/
│
└── fonts/
    ├── CormorantGaramond/
    ├── PlusJakartaSans/
    └── FiraCode/
```

---

## 3. Style Dictionary JSON

### 3.1 输出文件

| 文件 | 格式 | 用途 |
|------|------|------|
| variables.css | CSS | CSS变量文件 |
| tokens.js | JavaScript | JS Token文件 |
| tokens.json | JSON | JSON Token文件 |

### 3.2 构建命令

```bash
npm run build:tokens
```

### 3.3 输出位置

```
src/styles/build/
├── css/
│   └── variables.css
├── js/
│   └── tokens.js
└── json/
    └── tokens.json
```

---

## 4. 动效规范文档

### 4.1 动效时长

| 类型 | 时长 | 缓动函数 | 用途 |
|------|------|----------|------|
| 快速 | 150ms | ease-out | 悬停反馈 |
| 正常 | 300ms | ease-in-out | 状态切换 |
| 慢速 | 500ms | ease-in-out | 页面过渡 |

### 4.2 微交互规范

| 交互 | 动效 | 说明 |
|------|------|------|
| 按钮悬停 | scale(1.02) + shadow | 悬停放大 |
| 按钮点击 | scale(0.98) | 点击缩小 |
| 卡片悬停 | translateY(-4px) + shadow | 卡片上浮 |
| 主题切换 | background-color fade | 背景渐变 |
| 音准反馈 | color fade + scale | 颜色渐变 |

---

## 5. 组件库文档

### 5.1 组件清单

| 组件 | Props | 状态 | 说明 |
|------|-------|------|------|
| Button | variant, size, disabled | default, hover, active, disabled | 按钮 |
| PieceCard | piece, onSelect | default, hover, selected | 曲目卡片 |
| StatCard | title, value, unit | default | 统计卡片 |
| Header | activeNav | default | 顶部导航 |
| PitchIndicator | deviation, status | accurate, slight, moderate, severe | 音准指示器 |
| ProgressBar | progress, color | default | 进度条 |
| Modal | title, content, onClose | open, closed | 弹窗 |

### 5.2 组件使用示例

```tsx
// Button组件
<Button variant="primary" size="large">
  开始练习
</Button>

// PieceCard组件
<PieceCard 
  piece={pieceData}
  onSelect={() => handleSelect()}
/>

// PitchIndicator组件
<PitchIndicator 
  deviation={15}
  status="accurate"
/>
```

---

## 6. 交付物验证清单

- [x] Figma文件结构定义完成
- [x] 组件命名规范定义完成
- [x] 图标切图清单定义完成
- [x] 组件切图清单定义完成
- [x] Style Dictionary输出定义完成
- [x] 动效规范文档定义完成
- [x] 组件库文档定义完成

---

## 7. 待执行项

- [ ] 创建Figma源文件
- [ ] 导出切图资源
- [ ] 构建Style Dictionary JSON
- [ ] 编写组件库文档
- [ ] 验证所有交付物完整

---

*文档结束*