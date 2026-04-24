# 曲目库管理模块需求规格

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联PRD | PRD-music-practice-app-v2.md |
| 关联架构 | backend-architecture.md |

---

## 1. 曲目上传功能

### 1.1 功能描述

用户上传MusicXML文件，系统解析并存储曲目信息。

### 1.2 支持格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| MusicXML | .xml, .musicxml | 标准乐谱格式 |
| Compressed MusicXML | .mxl | 压缩格式 |

### 1.3 上传流程

```
上传流程:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ 选择文件 │ -> │ 格式验证 │ -> │ 解析处理 │ -> │ 保存曲目 │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     v              v              v              v
  文件选择      格式检查      MusicXML解析   存储到数据库
  拖拽上传      大小限制      提取元数据     返回曲目ID
```

### 1.4 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 文件上传成功 | 正确格式文件上传成功 | E2E测试 |
| 格式验证 | 错误格式显示提示 | E2E测试 |
| 解析准确率 | >95%解析成功 | 单元测试 |
| 大小限制 | >10MB文件拒绝 | 单元测试 |

### 1.5 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /pieces | POST | 上传曲目 |
| /pieces/:id | GET | 获取曲目详情 |
| /pieces/:id | PUT | 更新曲目信息 |
| /pieces/:id | DELETE | 删除曲目 |

---

## 2. 曲目检索功能

### 2.1 功能描述

用户通过分类、风格、难度筛选曲目，支持搜索和排序。

### 2.2 分类维度

| 维度 | 选项 |
|------|------|
| 乐器类型 | piano, guitar, violin, cello, flute, other |
| 风格 | classical, pop, jazz, folk, rock, other |
| 难度 | 1-10级 |
| 来源 | official, user-uploaded |

### 2.3 搜索功能

- 标题搜索
- 作曲家搜索
- 标签搜索
- 组合搜索

### 2.4 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 分类筛选 | 正确筛选结果 | E2E测试 |
| 搜索功能 | 搜索结果正确 | E2E测试 |
| 排序功能 | 排序结果正确 | E2E测试 |
| 分页功能 | 分页正确显示 | E2E测试 |

### 2.5 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /pieces | GET | 获取曲目列表 |
| /pieces/search | GET | 搜索曲目 |

---

## 3. OCR导入功能

### 3.1 功能描述

用户上传乐谱图片，系统通过OCR识别生成MusicXML。

### 3.2 OCR流程

```
OCR导入流程:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ 上传图片 │ -> │ 图像处理 │ -> │ OCR识别 │ -> │ 校对编辑 │ -> │ 保存曲目 │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
     v              v              v              v              v
  选择文件      去噪/校正      Audiveris      并排显示      生成MusicXML
  或拍照        倾斜校正       识别音符       错误高亮      保存到曲库
  多页支持      二值化处理     生成结构       手动修正      可直接练习
```

### 3.3 置信度评估

| 置信度 | 处理方式 | 用户操作 |
|--------|----------|----------|
| ≥90% | 直接导入 | 可选校对 |
| 80-89% | 强制校对 | 必须校对 |
| <80% | 拒绝导入 | 建议重新扫描 |

### 3.4 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 图片上传 | 图片正确上传 | E2E测试 |
| OCR识别 | MusicXML生成 | 单元测试 |
| 置信度报告 | 置信度正确计算 | 单元测试 |
| 校对流程 | 校对后正确保存 | E2E测试 |

### 3.5 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /pieces/ocr | POST | 上传图片进行OCR |
| /pieces/ocr/:sessionId | GET | 获取校对会话 |
| /pieces/ocr/:sessionId/correct | POST | 提交修正 |
| /pieces/ocr/:sessionId/complete | POST | 完成校对 |

---

## 4. 收藏管理功能

### 4.1 功能描述

用户收藏喜欢的曲目，管理收藏列表。

### 4.2 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 添加收藏 | 收藏成功添加 | E2E测试 |
| 取消收藏 | 收藏成功取消 | E2E测试 |
| 收藏列表 | 收藏列表正确显示 | E2E测试 |

### 4.3 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /pieces/:id/favorite | POST | 添加收藏 |
| /pieces/:id/favorite | DELETE | 取消收藏 |
| /users/me/favorites | GET | 获取收藏列表 |

---

## 5. 数据结构

### 5.1 Piece类型

```typescript
interface Piece {
  id: string;
  userId?: string;
  title: string;
  composer?: string;
  difficulty: number;
  instrumentTypes: InstrumentType[];
  genres: MusicGenre[];
  durationSeconds: number;
  musicXmlUrl: string;
  audioDemoUrl?: string;
  tags: string[];
  isOfficial: boolean;
  isPremium: boolean;
  playCount: number;
  favoriteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

type MusicGenre = 'classical' | 'pop' | 'jazz' | 'folk' | 'rock' | 'other';
```

### 5.2 OCRSession类型

```typescript
interface OCRSession {
  id: string;
  userId: string;
  imageUrl: string;
  status: 'processing' | 'review' | 'completed' | 'rejected';
  confidence: number;
  musicXmlDraft?: string;
  errors: OCRError[];
  createdAt: Date;
}

interface OCRError {
  measureIndex: number;
  noteIndex: number;
  errorType: 'pitch' | 'duration' | 'missing' | 'extra';
  suggestion?: string;
}
```

---

## 6. 测试用例清单

| 用例ID | 用例名称 | 测试类型 | 状态 |
|--------|----------|----------|------|
| TC-L01 | 曲目上传测试 | E2E测试 | ⏳待开发 |
| TC-L02 | 曲目格式验证 | 单元测试 | ⏳待开发 |
| TC-L03 | 曲目列表显示 | E2E测试 | ⏳待开发 |
| TC-L04 | 曲目搜索测试 | E2E测试 | ⏳待开发 |
| TC-O01 | 图像上传测试 | E2E测试 | ⏳待开发 |
| TC-O02 | OCR识别测试 | 单元测试 | ⏳待开发 |
| TC-O03 | 置信度报告测试 | 单元测试 | ⏳待开发 |
| TC-O04 | 校对界面测试 | E2E测试 | ⏳待开发 |
| TC-O05 | 修正保存测试 | E2E测试 | ⏳待开发 |
| TC-FC01 | 添加收藏测试 | E2E测试 | ⏳待开发 |
| TC-FC02 | 取消收藏测试 | E2E测试 | ⏳待开发 |

---

*文档结束*