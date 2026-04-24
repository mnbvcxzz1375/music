# CI/CD流水线设计

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-15 |
| 适用范围 | Resonance 音乐练习应用 |

---

## 1. CI/CD架构概览

### 1.1 流水线架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Code    │───▶│  Build   │───▶│  Test    │───▶│  Deploy  │  │
│  │  Commit  │    │  Stage   │    │  Stage   │    │  Stage   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │              │              │              │            │
│       ▼              ▼              ▼              ▼            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Lint    │    │  Bundle  │    │  Unit    │    │  Preview │  │
│  │  Check   │    │  Size    │    │  Tests   │    │  Deploy  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │              │              │              │            │
│       ▼              ▼              ▼              ▼            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Type    │    │  Analyze │    │  E2E     │    │  Prod    │  │
│  │  Check   │    │  Bundle  │    │  Tests   │    │  Deploy  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 流水线阶段

| 阶段 | 说明 | 触发条件 | 执行时间 |
|------|------|----------|----------|
| Code | 代码提交检查 | Push/PR | ~30s |
| Build | 构建打包 | Code通过后 | ~2min |
| Test | 测试执行 | Build通过后 | ~5min |
| Deploy | 部署发布 | Test通过后 | ~1min |

---

## 2. 代码检查阶段

### 2.1 Lint检查

```yaml
lint:
  name: Lint Check
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run ESLint
      run: npm run lint
      
    - name: Check for errors
      if: failure()
      run: echo "Lint errors found, please fix before merging"
```

### 2.2 TypeScript检查

```yaml
typecheck:
  name: TypeScript Check
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run TypeScript check
      run: npm run type-check
```

### 2.3 格式检查

```yaml
format:
  name: Format Check
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Check formatting
      run: npm run format -- --check
```

---

## 3. 构建阶段

### 3.1 构建配置

```yaml
build:
  name: Build
  runs-on: ubuntu-latest
  needs: [lint, typecheck, format]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build production bundle
      run: npm run build
      env:
        NODE_ENV: production
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v4
      with:
        name: build-output
        path: dist/
        retention-days: 7
```

### 3.2 Bundle分析

```yaml
analyze:
  name: Bundle Analysis
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Analyze bundle size
      run: npx vite-bundle-visualizer
    
    - name: Check bundle size budget
      run: |
        SIZE=$(du -sb dist/ | cut -f1)
        BUDGET=1048576  # 1MB
        if [ $SIZE -gt $BUDGET ]; then
          echo "Bundle size exceeds budget: $SIZE > $BUDGET"
          exit 1
        fi
```

---

## 4. 测试阶段

### 4.1 单元测试

```yaml
unit-test:
  name: Unit Tests
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm test -- --coverage
    
    - name: Upload coverage report
      uses: codecov/codecov-action@v4
      with:
        files: ./coverage/lcov.info
        fail_ci_if_error: true
```

### 4.2 E2E测试

```yaml
e2e-test:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright browsers
      run: npx playwright install --with-deps
    
    - name: Run E2E tests
      run: npm run e2e
    
    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```

### 4.3 性能测试

```yaml
performance:
  name: Performance Tests
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Run Lighthouse CI
      run: npx lhci autorun
      env:
        LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

---

## 5. 部署阶段

### 5.1 Preview部署

```yaml
deploy-preview:
  name: Deploy Preview
  runs-on: ubuntu-latest
  needs: [unit-test, e2e-test]
  if: github.event_name == 'pull_request'
  steps:
    - uses: actions/checkout@v4
    - uses: actions/download-artifact@v4
      with:
        name: build-output
        path: dist/
    
    - name: Deploy to preview environment
      uses: vercel-action@v1
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        scope: ${{ secrets.VERCEL_SCOPE }}
    
    - name: Comment PR with preview URL
      uses: actions/github-script@v7
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: 'Preview deployed to: ${process.env.PREVIEW_URL}'
          })
```

### 5.2 生产部署

```yaml
deploy-production:
  name: Deploy Production
  runs-on: ubuntu-latest
  needs: [unit-test, e2e-test, performance]
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/checkout@v4
    - uses: actions/download-artifact@v4
      with:
        name: build-output
        path: dist/
    
    - name: Deploy to production
      uses: vercel-action@v1
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
        scope: ${{ secrets.VERCEL_SCOPE }}
    
    - name: Notify deployment
      run: |
        echo "Production deployment completed"
        curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
          -d '{"text": "Production deployment completed for Resonance"}'
```

---

## 6. 完整流水线配置

### 6.1 GitHub Actions配置

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  unit-test:
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v4

  e2e-test:
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run e2e

  deploy-preview:
    runs-on: ubuntu-latest
    needs: [unit-test, e2e-test]
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - name: Deploy Preview
        run: echo "Deploy to preview environment"

  deploy-production:
    runs-on: ubuntu-latest
    needs: [unit-test, e2e-test]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - name: Deploy Production
        run: echo "Deploy to production environment"
```

---

## 7. 分支策略

### 7.1 分支模型

| 分支 | 说明 | 保护规则 |
|------|------|----------|
| main | 生产分支 | 必须通过CI，禁止直接push |
| develop | 开发分支 | 必须通过CI |
| feature/* | 功能分支 | 无保护 |
| hotfix/* | 紧急修复分支 | 必须通过CI |

### 7.2 合并策略

| 场景 | 策略 | 说明 |
|------|------|------|
| feature → develop | Squash merge | 保持历史整洁 |
| develop → main | Merge commit | 保留完整历史 |
| hotfix → main | Merge commit | 紧急修复 |

---

## 8. 环境管理

### 8.1 环境配置

| 环境 | 说明 | URL | 自动部署 |
|------|------|-----|----------|
| Preview | PR预览 | pr-{number}.preview.resonance.app | PR创建时 |
| Staging | 测试环境 | staging.resonance.app | develop分支 |
| Production | 生产环境 | resonance.app | main分支 |

### 8.2 环境变量

```yaml
environments:
  preview:
    NODE_ENV: development
    API_URL: https://api-staging.resonance.app
    
  staging:
    NODE_ENV: staging
    API_URL: https://api-staging.resonance.app
    
  production:
    NODE_ENV: production
    API_URL: https://api.resonance.app
```

---

## 9. 发布管理

### 9.1 版本号规范

```
版本格式: MAJOR.MINOR.PATCH

MAJOR: 重大功能变更或架构调整
MINOR: 新功能添加
PATCH: Bug修复或小改进
```

### 9.2 发布流程

1. 创建release分支
2. 更新版本号
3. 更新CHANGELOG
4. 执行CI/CD
5. 合并到main
6. 创建GitHub Release
7. 部署到生产环境

---

## 10. 监控与告警

### 10.1 CI/CD监控

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| 构建成功率 | 成功构建比例 | < 90% |
| 构建时间 | 平均构建时间 | > 10min |
| 测试覆盖率 | 代码覆盖率 | < 80% |
| 部署成功率 | 成功部署比例 | < 95% |

### 10.2 告警配置

```yaml
alerts:
  - name: build_failure
    condition: build_status == 'failure'
    notify: [slack, email]
    
  - name: test_failure
    condition: test_status == 'failure'
    notify: [slack]
    
  - name: deploy_failure
    condition: deploy_status == 'failure'
    notify: [slack, email, sms]
```

---

*文档结束*