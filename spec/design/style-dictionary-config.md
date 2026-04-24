# Style Dictionary 配置文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 基础文件 | src/index.css |

---

## 1. Style Dictionary 安装

```bash
npm install style-dictionary --save-dev
```

---

## 2. 配置文件结构

```
src/styles/
├── tokens/
│   ├── colors.json
│   ├── typography.json
│   ├── spacing.json
│   └── shadows.json
├── config.js
└── build/
    ├── css/
    │   └── variables.css
    └── js/
    │   └── tokens.js
    └── json/
    │   └── tokens.json
```

---

## 3. Token 定义文件

### 3.1 colors.json

```json
{
  "color": {
    "bg": {
      "primary": {
        "dark": { "value": "#0a0a0a" },
        "light": { "value": "#ffffff" }
      },
      "secondary": {
        "dark": { "value": "#161616" },
        "light": { "value": "#f5f5f5" }
      },
      "tertiary": {
        "dark": { "value": "#222222" },
        "light": { "value": "#e5e5e5" }
      }
    },
    "text": {
      "primary": {
        "dark": { "value": "#f2f2f2" },
        "light": { "value": "#1a1a1a" }
      },
      "secondary": {
        "dark": { "value": "#a1a1aa" },
        "light": { "value": "#666666" }
      }
    },
    "accent": {
      "default": { "value": "#d4af37" },
      "hover": { "value": "#b8972e" }
    },
    "status": {
      "success": { "value": "#2e8b57" },
      "warning": { "value": "#d97706" },
      "error": { "value": "#c53030" }
    },
    "border": {
      "dark": { "value": "rgba(255, 255, 255, 0.1)" },
      "light": { "value": "rgba(0, 0, 0, 0.1)" }
    }
  }
}
```

### 3.2 typography.json

```json
{
  "font": {
    "family": {
      "display": { "value": "'Cormorant Garamond', serif" },
      "sans": { "value": "'Plus Jakarta Sans', sans-serif" },
      "mono": { "value": "'Fira Code', monospace" }
    },
    "size": {
      "xs": { "value": "0.75rem" },
      "sm": { "value": "0.875rem" },
      "base": { "value": "1rem" },
      "lg": { "value": "1.125rem" },
      "xl": { "value": "1.25rem" },
      "2xl": { "value": "1.5rem" },
      "3xl": { "value": "2rem" },
      "4xl": { "value": "2.5rem" }
    },
    "weight": {
      "light": { "value": "300" },
      "normal": { "value": "400" },
      "medium": { "value": "500" },
      "semibold": { "value": "600" },
      "bold": { "value": "700" }
    },
    "lineHeight": {
      "tight": { "value": "1.2" },
      "normal": { "value": "1.6" },
      "relaxed": { "value": "1.75" }
    }
  }
}
```

### 3.3 spacing.json

```json
{
  "spacing": {
    "0": { "value": "0" },
    "1": { "value": "0.25rem" },
    "2": { "value": "0.5rem" },
    "3": { "value": "0.75rem" },
    "4": { "value": "1rem" },
    "5": { "value": "1.25rem" },
    "6": { "value": "1.5rem" },
    "8": { "value": "2rem" },
    "10": { "value": "2.5rem" },
    "12": { "value": "3rem" },
    "16": { "value": "4rem" },
    "20": { "value": "5rem" },
    "24": { "value": "6rem" }
  }
}
```

### 3.4 shadows.json

```json
{
  "shadow": {
    "sm": { "value": "0 1px 2px rgba(0, 0, 0, 0.1)" },
    "md": { "value": "0 4px 6px rgba(0, 0, 0, 0.1)" },
    "lg": { "value": "0 10px 15px rgba(0, 0, 0, 0.1)" },
    "xl": { "value": "0 20px 40px rgba(0, 0, 0, 0.3)" }
  }
}
```

---

## 4. Style Dictionary 配置文件

### 4.1 config.js

```javascript
module.exports = {
  source: ['src/styles/tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/build/css/',
      files: [{
        destination: 'variables.css',
        format: 'css/variables',
        options: {
          outputReferences: true
        }
      }]
    },
    js: {
      transformGroup: 'js',
      buildPath: 'src/styles/build/js/',
      files: [{
        destination: 'tokens.js',
        format: 'javascript/es6'
      }]
    },
    json: {
      transformGroup: 'js',
      buildPath: 'src/styles/build/json/',
      files: [{
        destination: 'tokens.json',
        format: 'json'
      }]
    }
  }
};
```

---

## 5. 构建命令

### 5.1 package.json 添加

```json
{
  "scripts": {
    "build:tokens": "style-dictionary build --config=src/styles/config.js"
  }
}
```

### 5.2 构建输出

```bash
npm run build:tokens
```

---

## 6. 生成的 CSS 变量文件示例

### 6.1 variables.css

```css
:root {
  /* Color */
  --color-bg-primary-dark: #0a0a0a;
  --color-bg-primary-light: #ffffff;
  --color-bg-secondary-dark: #161616;
  --color-bg-secondary-light: #f5f5f5;
  --color-text-primary-dark: #f2f2f2;
  --color-text-primary-light: #1a1a1a;
  --color-accent-default: #d4af37;
  --color-accent-hover: #b8972e;
  --color-status-success: #2e8b57;
  --color-status-warning: #d97706;
  --color-status-error: #c53030;
  
  /* Font */
  --font-family-display: 'Cormorant Garamond', serif;
  --font-family-sans: 'Plus Jakarta Sans', sans-serif;
  --font-family-mono: 'Fira Code', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;
  --font-size-4xl: 2.5rem;
  
  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-10: 2.5rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;
  
  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.3);
}
```

---

## 7. 验证清单

- [x] Style Dictionary 安装说明完成
- [x] 配置文件结构定义完成
- [x] Token 定义文件完成（colors、typography、spacing、shadows）
- [x] Style Dictionary 配置文件完成
- [x] 构建命令定义完成
- [x] 生成的 CSS 变量文件示例完成

---

*文档结束*