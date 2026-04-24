# 🎵 音乐练习应用 (Music Practice App)

一个基于 Web 的智能音乐练习助手，支持实时音高检测、节奏评估和乐谱渲染。

## ✨ 功能特性

### 核心功能

- **🎼 乐谱渲染** - 基于 OSMD 的乐谱显示，支持 MusicXML 格式
- **🎤 实时音高检测** - YIN 算法实现高精度单音检测（延迟 < 80ms）
- **⏱️ 节奏评估** - 自动检测音符起始时间，评估演奏时值
- **🔄 反复处理** - 支持 MusicXML 中的反复记号、D.C./D.S./Coda/Fine

### 练习功能

- **纠错练习流程** - 错误位置标记、重试机制、通过/失败判定
- **多声部选择** - 支持多声部乐曲的声部切换
- **校准引导** - 首次使用的音频校准向导

### 个性化

- **设置持久化** - 自动保存用户偏好设置
- **多乐器支持** - 钢琴、吉他、小提琴、长笛等多种乐器配置

---

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **浏览器**: Chrome/Edge/Firefox 最新版（需要 Web Audio API 支持）

### 一键启动

#### Windows 用户

双击运行项目根目录下的 `start.bat` 文件：

```batch
start.bat
```

#### Mac/Linux 用户

```bash
chmod +x start.sh
./start.sh
```

### 手动启动

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器访问
# http://localhost:5174
```

### 停止服务

#### Windows 用户

双击运行 `stop.bat` 文件，或在命令行按 `Ctrl+C`

```batch
stop.bat
```

#### Mac/Linux 用户

```bash
./stop.sh
```

或直接在终端按 `Ctrl+C` 停止服务

---

## 📖 使用指南

### 1. 首次使用 - 校准

首次打开应用时，需要进行音频校准：

1. 点击 **开始校准** 进入校准向导
2. 选择您的乐器类型（钢琴、吉他等）
3. 保持安静，系统会测量环境噪声
4. 按提示演奏测试音符，调整输入增益
5. 完成校准后设置会自动保存

### 2. 加载乐谱

#### 方式一：上传 MusicXML 文件

```
点击 "打开乐谱" → 选择 .xml 或 .musicxml 文件
```

#### 方式二：使用测试乐谱

应用内置了测试乐谱，可直接加载体验。

### 3. 开始练习

1. **选择声部** - 如果乐曲有多个声部，点击声部选择器切换
2. **调整速度** - 使用速度滑块设置练习速度（BPM）
3. **开始演奏** - 点击开始按钮，跟随乐谱演奏
4. **实时反馈** - 系统会实时显示音高准确度和节奏偏差

### 4. 练习反馈

#### 音高指示器

- 🟢 **绿色** - 音准正确（偏差 < 20 音分）
- 🟡 **黄色** - 轻微偏差（20-50 音分）
- 🟠 **橙色** - 中等偏差（50-100 音分）
- 🔴 **红色** - 严重偏差（> 100 音分）

#### 节奏评估

- ✅ 正确 - 时间偏差 < 25ms
- ⚠️ 轻微 - 时间偏差 25-50ms
- ⚠️ 中等 - 时间偏差 50-100ms
- ❌ 严重 - 时间偏差 > 100ms

### 5. 练习结果

练习结束后会显示：

- 正确音符数量
- 准确率百分比
- 错误详情（音高/节奏）
- 是否通过（默认 80% 准确率及格）

---

## ⚙️ 配置选项

### 音频设置

```typescript
{
  inputGain: 0.5,      // 输入增益 (0-1)
  outputVolume: 0.8,   // 输出音量 (0-1)
  sampleRate: 44100,   // 采样率
  bufferSize: 1024,    // 缓冲区大小
  monitorInput: false  // 是否监听输入
}
```

### 练习设置

```typescript
{
  defaultTempo: 120,       // 默认速度 (BPM)
  pitchTolerance: 50,      // 音高容差 (音分)
  timingTolerance: 100,    // 时间容差 (ms)
  passThreshold: 0.8,      // 通过阈值 (0-1)
  maxRetries: 3,           // 最大重试次数
  showHints: true,         // 显示提示
  autoAdvance: false       // 自动前进
}
```

### 显示设置

```typescript
{
  theme: 'auto',           // 主题: 'light' | 'dark' | 'auto'
  language: 'zh',          // 语言: 'zh' | 'en'
  showNoteNames: true,     // 显示音符名称
  showFingerPositions: false, // 显示指法
  animationSpeed: 0.5      // 动画速度 (0-1)
}
```

---

## 🎹 支持的乐器

| 乐器类型 | 代码        | 默认增益 | 噪声底 |
| -------- | ----------- | -------- | ------ |
| 钢琴     | `piano`     | 0.4      | -50 dB |
| 吉他     | `guitar`    | 0.5      | -45 dB |
| 小提琴   | `violin`    | 0.6      | -45 dB |
| 长笛     | `flute`     | 0.5      | -50 dB |
| 单簧管   | `clarinet`  | 0.5      | -45 dB |
| 小号     | `trumpet`   | 0.4      | -40 dB |
| 萨克斯   | `saxophone` | 0.5      | -45 dB |
| 人声     | `voice`     | 0.6      | -40 dB |

---

## 🔧 开发命令

```bash
# 开发模式
npm run dev

# 类型检查
npm run type-check

# 运行测试
npm test

# 运行测试（监视模式）
npm test

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

---

## 📁 项目结构

```
music/
├── src/
│   ├── audio/              # 音频处理模块
│   │   ├── capture/        # 音频采集
│   │   ├── detection/      # 音高检测 (YIN 算法)
│   │   └── rhythm/         # 节奏评估
│   │
│   ├── components/         # React 组件
│   │   ├── PitchIndicator/ # 音高指示器
│   │   ├── PartSelector/   # 声部选择器
│   │   └── ScoreRenderer/  # 乐谱渲染
│   │
│   ├── engine/             # 核心引擎
│   │   ├── practice/       # 练习流程引擎
│   │   ├── position-tracker/ # 位置追踪
│   │   └── score-graph/    # 乐谱图结构
│   │
│   ├── models/             # 数据模型
│   │   └── part/           # 声部模型
│   │
│   ├── services/           # 服务层
│   │   ├── calibration/    # 校准服务
│   │   ├── parser/         # MusicXML 解析
│   │   └── settings/       # 设置管理
│   │
│   └── types/              # TypeScript 类型定义
│
├── test/
│   └── fixtures/           # 测试用例文件
│
└── public/                 # 静态资源
```

---

## 🧪 测试

项目包含完整的单元测试：

```bash
# 运行所有测试
npm test

# 运行特定模块测试
npm test src/audio/detection
npm test src/engine/practice

# 查看测试覆盖率
npm test -- --coverage
```

### 测试统计

- **测试文件**: 21 个
- **测试用例**: 226 个
- **覆盖率**: 核心模块 90%+

---

## ❓ 常见问题

### Q: 检测不到声音？

1. 检查浏览器是否授权麦克风权限
2. 确认麦克风设备选择正确
3. 尝试调高输入增益

### Q: 音高检测不准确？

1. 确保环境安静，减少背景噪音
2. 重新运行校准流程
3. 检查乐器是否调音正确

### Q: 乐谱显示不正常？

1. 确认 MusicXML 文件格式正确
2. 检查浏览器控制台是否有错误信息
3. 尝试使用测试乐谱验证

### Q: 如何导入自己的乐谱？

1. 准备 MusicXML 格式的乐谱文件
2. 点击"打开乐谱"按钮上传
3. 支持从 MuseScore、Finale 等软件导出的 MusicXML

---

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **测试框架**: Vitest + @testing-library/react
- **乐谱渲染**: OSMD (OpenSheetMusicDisplay)
- **音频处理**: Web Audio API + AudioWorklet
- **音高检测**: YIN 算法

---

## 📝 更新日志

### v1.0.0 (当前版本)

- ✅ MusicXML 解析器
- ✅ OSMD 乐谱渲染
- ✅ YIN 单音检测算法
- ✅ 节拍评估模块
- ✅ 反复/跳转处理
- ✅ 多声部选择
- ✅ 练习纠错流程
- ✅ 音频校准向导
- ✅ 设置持久化

### 计划功能 (v2.0+)

- ⏳ 复音检测 (Basic Pitch)
- ⏳ OCR 乐谱扫描
- ⏳ AI 练习建议

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [OSMD](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay) - 乐谱渲染
- [YIN Algorithm](https://github.com/peterkhayes/pitchfinder) - 音高检测参考
- [Vite](https://vitejs.dev/) - 构建工具
