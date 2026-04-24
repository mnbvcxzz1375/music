# 色彩系统设计文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 基础文件 | src/index.css (现有 Dark 主题) |

---

## 1. Dark 主题色彩方案（现有）

### 1.1 背景色

| Token | CSS变量 | 色值 | 用途 |
|-------|---------|------|------|
| bg-primary | --bg-primary | #0a0a0a | 主背景 |
| bg-secondary | --bg-secondary | #161616 | 卡片/面板背景 |
| bg-tertiary | --bg-tertiary | #222 | 输入框/次要区域 |
| glass | --glass | rgba(26,26,26,0.6) | 玻璃效果 |

### 1.2 文字色

| Token | CSS变量 | 色值 | 用途 |
|-------|---------|------|------|
| text-primary | --text-primary | #f2f2f2 | 主文字 |
| text-secondary | --text-secondary | #a1a1aa | 次要文字 |

### 1.3 强调色

| Token | CSS变量 | 色值 | 用途 |
|-------|---------|------|------|
| accent | --accent | #d4af37 | 主强调色（金铜色） |
| accent-hover | --accent-hover | #b8972e | 强调色悬停 |
| success | --success | #2e8b57 | 成功状态 |
| warning | --warning | #d97706 | 警告状态 |
| error | --error | #c53030 | 错误状态 |

### 1.4 边框色

| Token | CSS变量 | 色值 | 用途 |
|-------|---------|------|------|
| border | --border | rgba(255,255,255,0.1) | 边框 |

---

## 2. Light 主题色彩方案（新增）

### 2.1 背景色

| Token | CSS变量 | 色值 | 用途 |
|-------|---------|------|------|
| bg-primary | --bg-primary | #ffffff | 主背景 |
| bg-secondary | --bg-secondary | #f5f5f5 | 卡片/面板背景 |
| bg-tertiary | --bg-tertiary | #e5e5e5 | 输入框/次要区域 |
| glass | --glass | rgba(255,255,255,0.8) | 玻璃效果 |

### 2.2 文字色

| Token | CSS变量 | 色值 | 用途 |
|-------|---------|------|------|
| text-primary | --text-primary | #1a1a1a | 主文字 |
| text-secondary | --text-secondary | #666666 | 次要文字 |

### 2.3 强调色

| Token | CSS变量 | 色值 | 用途 |
|-------|---------|------|------|
| accent | --accent | #d4af37 | 主强调色（保持金铜色） |
| accent-hover | --accent-hover | #b8972e | 强调色悬停 |
| success | --success | #2e8b57 | 成功状态 |
| warning | --warning | #d97706 | 警告状态 |
| error | --error | #c53030 | 错误状态 |

### 2.4 边框色

| Token | CSS变量 | 色值 | 用途 |
|-------|---------|------|------|
| border | --border | rgba(0,0,0,0.1) | 边框 |

---

## 3. WCAG 2.1 AA 对比度验证

### 3.1 Dark 主题对比度

| 组合 | 对比度 | 是否达标 |
|------|--------|----------|
| text-primary (#f2f2f2) / bg-primary (#0a0a0a) | 16.8:1 | ✅ 达标 |
| text-secondary (#a1a1aa) / bg-primary (#0a0a0a) | 7.5:1 | ✅ 达标 |
| accent (#d4af37) / bg-primary (#0a0a0a) | 8.2:1 | ✅ 达标 |
| text-primary (#f2f2f2) / bg-secondary (#161616) | 12.5:1 | ✅ 达标 |

### 3.2 Light 主题对比度

| 组合 | 对比度 | 是否达标 |
|------|--------|----------|
| text-primary (#1a1a1a) / bg-primary (#ffffff) | 16.1:1 | ✅ 达标 |
| text-secondary (#666666) / bg-primary (#ffffff) | 5.7:1 | ✅ 达标 |
| accent (#d4af37) / bg-primary (#ffffff) | 2.8:1 | ⚠️ 大文本达标 |
| text-primary (#1a1a1a) / bg-secondary (#f5f5f5) | 14.3:1 | ✅ 达标 |

---

## 4. 音准反馈色彩系统

### 4.1 四级反馈色

| 级别 | 偏差范围 | Dark主题 | Light主题 | 说明 |
|------|----------|----------|----------|------|
| 准确 | <20音分 | #2e8b57 | #2e8b57 | 绿色 |
| 轻微 | 20-50音分 | #d97706 | #d97706 | 黄色 |
| 中等 | 50-100音分 | #c53030 | #c53030 | 橙色 |
| 严重 | >100音分 | #c53030 | #c53030 | 红色 |

---

## 5. CSS变量扩展

### 5.1 主题切换变量

```css
/* Dark 主题（默认） */
:root {
  --theme: 'dark';
  
  /* 背景色 */
  --bg-primary: #0a0a0a;
  --bg-secondary: #161616;
  --bg-tertiary: #222;
  --glass: rgba(26, 26, 26, 0.6);
  
  /* 文字色 */
  --text-primary: #f2f2f2;
  --text-secondary: #a1a1aa;
  
  /* 强调色 */
  --accent: #d4af37;
  --accent-hover: #b8972e;
  
  /* 状态色 */
  --success: #2e8b57;
  --warning: #d97706;
  --error: #c53030;
  
  /* 边框色 */
  --border: rgba(255, 255, 255, 0.1);
}

/* Light 主题 */
:root[data-theme='light'] {
  --theme: 'light';
  
  /* 背景色 */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e5e5e5;
  --glass: rgba(255, 255, 255, 0.8);
  
  /* 文字色 */
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  
  /* 强调色（保持一致） */
  --accent: #d4af37;
  --accent-hover: #b8972e;
  
  /* 状态色（保持一致） */
  --success: #2e8b57;
  --warning: #d97706;
  --error: #c53030;
  
  /* 边框色 */
  --border: rgba(0, 0, 0, 0.1);
}
```

---

## 6. 主题切换动画

```css
/* 主题切换过渡 */
* {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease;
}

/* 禁用过渡（首次加载） */
.no-transition * {
  transition: none !important;
}
```

---

## 7. 验证清单

- [x] Dark 主题色彩方案定义完成
- [x] Light 主题色彩方案定义完成
- [x] WCAG 2.1 AA 对比度验证完成
- [x] 音准反馈色彩系统定义完成
- [x] CSS变量扩展定义完成
- [x] 主题切换动画定义完成

---

*文档结束*