# CI/CD流水线设计文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联Spec | music-practice-app-refactor/spec.md |
| 责任人 | DevOps工程师 |

---

## 1. CI流程设计

### 1.1 CI流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    CI流程                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                                            │
│  │ 代码提交    │                                            │
│  │ Git Push    │                                            │
│  └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────┐                                            │
│  │ 触发CI      │                                            │
│  │ GitHub/GitLab│                                            │
│  └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              并行执行                                │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │   │
│  │  │代码检查 │  │单元测试 │  │构建打包 │  │安全扫描 │ │   │
│  │  │ESLint   │  │Vitest   │  │Vite     │  │Snyk     │ │   │
│  │  │TypeScript│ │         │  │         │  │         │ │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────┐                                            │
│  │ 结果汇总    │                                            │
│  └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────┐     ┌─────────────┐                        │
│  │ 通过        │────>│ 触发CD      │                        │
│  └─────────────┘     └─────────────┘                        │
│        │                                                   │
│        ▼                                                   │
│  ┌─────────────┐                                          │
│  │ 失败        │                                          │
│  │ 阻止合并    │                                          │
│  └─────────────┘                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 GitHub Actions配置

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  security:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      - uses: github/codeql-action/init@v2
        with:
          languages: javascript
      - uses: github/codeql-action/analyze@v2

  e2e:
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### 1.3 代码检查配置

```typescript
const eslintConfig = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};

const typescriptConfig = {
  compilerOptions: {
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: true,
    noUncheckedIndexedAccess: true,
  },
};
```

---

## 2. CD流程设计

### 2.1 CD流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    CD流程                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                                            │
│  │ CI通过     │                                             │
│  └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────┐                                            │
│  │ 环境选择    │                                            │
│  │ staging/prod│                                            │
│  └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              部署流程                                │   │
│  │                                                      │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │   │
│  │  │构建镜像 │  │推送镜像 │  │部署应用 │             │   │
│  │  │Docker   │  │Registry │  │K8s      │             │   │
│  │  └─────────┘  └─────────┘  └─────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────┐                                            │
│  │ 健康检查    │                                            │
│  └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────┐     ┌─────────────┐                        │
│  │ 成功        │────>│ 发布通知    │                        │
│  └─────────────┘     └─────────────┘                        │
│        │                                                   │
│        ▼                                                   │
│  ┌─────────────┐     ┌─────────────┐                        │
│  │ 失败        │────>│ 自动回滚    │                        │
│  └─────────────┘     └─────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Web部署配置

```yaml
name: Deploy Web

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment || 'staging' }}
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}
      
      - name: Health Check
        run: |
          curl -f https://${{ inputs.environment }}.music-practice.app/health || exit 1
      
      - name: Notify Deployment
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: 'success'
          fields: 'repo,message,commit,author,action,eventName,ref,workflow'
          text: 'Deployment to ${{ inputs.environment }} succeeded'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 2.3 Docker镜像构建

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --production

EXPOSE 3000

CMD ["npm", "run", "preview"]
```

### 2.4 Kubernetes部署配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: music-practice-api
  labels:
    app: music-practice-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: music-practice-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: music-practice-api
    spec:
      containers:
        - name: api
          image: registry.music-practice.app/api:${{ github.sha }}
          ports:
            - containerPort: 3000
          resources:
            limits:
              cpu: '500m'
              memory: '512Mi'
            requests:
              cpu: '250m'
              memory: '256Mi'
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
      imagePullSecrets:
        - name: registry-secret

---
apiVersion: v1
kind: Service
metadata:
  name: music-practice-api
spec:
  selector:
    app: music-practice-api
  ports:
    - port: 80
      targetPort: 3000
  type: LoadBalancer
```

---

## 3. 发布失败自动回滚机制

### 3.1 回滚触发条件

| 条件 | 阈值 | 检测方式 | 回滚动作 |
|------|------|----------|----------|
| 错误率 | >5% | Sentry监控 | 自动回滚 |
| 响应时间 | >1s | Prometheus | 自动回滚 |
| 健康检查失败 | 连续3次 | K8s探针 | 自动回滚 |
| 关键功能不可用 | 检测失败 | E2E测试 | 手动回滚 |

### 3.2 Kubernetes回滚配置

```yaml
rollbackPolicy:
  autoRollback:
    enabled: true
    conditions:
      - errorRate: '> 5%'
        window: '5m'
      - responseTime: '> 1000ms'
        window: '5m'
      - healthCheckFailed: true
        consecutiveFailures: 3
  
  manualRollback:
    enabled: true
    maxVersions: 5

rollbackProcedure:
  steps:
    - name: 'Detect Failure'
      action: 'monitor.checkConditions'
    - name: 'Stop New Deployment'
      action: 'kubectl.scale --replicas=0'
    - name: 'Restore Previous Version'
      action: 'kubectl rollout undo'
    - name: 'Verify Rollback'
      action: 'health.check'
    - name: 'Notify Team'
      action: 'slack.notify'
```

### 3.3 回滚脚本实现

```bash
#!/bin/bash

DEPLOYMENT_NAME="music-practice-api"
NAMESPACE="default"
MAX_RETRIES=3

check_health() {
  for i in $(seq 1 $MAX_RETRIES); do
    if curl -f https://api.music-practice.app/health; then
      return 0
    fi
    sleep 5
  done
  return 1
}

rollback() {
  echo "Initiating rollback..."
  
  kubectl rollout undo deployment/$DEPLOYMENT_NAME -n $NAMESPACE
  
  echo "Waiting for rollback to complete..."
  kubectl rollout status deployment/$DEPLOYMENT_NAME -n $NAMESPACE
  
  if check_health; then
    echo "Rollback successful"
    notify_success
  else
    echo "Rollback failed, manual intervention required"
    notify_failure
    exit 1
  fi
}

notify_success() {
  curl -X POST $SLACK_WEBHOOK \
    -H 'Content-type: application/json' \
    --data '{"text":"Rollback successful for $DEPLOYMENT_NAME"}'
}

notify_failure() {
  curl -X POST $SLACK_WEBHOOK \
    -H 'Content-type: application/json' \
    --data '{"text":"Rollback failed for $DEPLOYMENT_NAME, requires manual intervention"}'
}

if ! check_health; then
  rollback
fi
```

---

## 4. 服务中断应急预案

### 4.1 应急响应流程

```
┌─────────────────────────────────────────────────────────────┐
│                    服务中断应急流程                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                                            │
│  │ 服务中断    │                                            │
│  │ 检测       │                                             │
│  └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────┐                                            │
│  │ 自动告警    │                                            │
│  │ Sentry/PagerDuty│                                         │
│  └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────┐                                            │
│  │ 15分钟响应 │                                             │
│  │ 工程师确认 │                                             │
│  └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              故障评估                                │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │   │
│  │  │严重程度 │  │影响范围 │  │根因分析 │             │   │
│  │  └─────────┘  └─────────┘  └─────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────┐     ┌─────────────┐                        │
│  │ 启用降级    │────>│ 用户通知    │                        │
│  │ 页面       │     │ 状态页面    │                        │
│  └─────────────┘     └─────────────┘                        │
│        │                                                   │
│        ▼                                                   │
│  ┌─────────────┐                                          │
│  │ 修复问题    │                                          │
│  └─────────────┘                                          │
│        │                                                   │
│        ▼                                                   │
│  ┌─────────────┐                                          │
│  │ 恢复服务    │                                          │
│  └─────────────┘                                          │
│        │                                                   │
│        ▼                                                   │
│  ┌─────────────┐                                          │
│  │ 事后复盘    │                                          │
│  └─────────────┘                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 告警配置

```typescript
const sentryAlertConfig = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  alerts: {
    errorRate: {
      threshold: 5,
      window: '5m',
      severity: 'critical',
      notify: ['pagerduty', 'slack'],
    },
    
    latency: {
      threshold: 1000,
      window: '5m',
      severity: 'warning',
      notify: ['slack'],
    },
    
    downtime: {
      threshold: 1,
      window: '1m',
      severity: 'critical',
      notify: ['pagerduty', 'slack', 'email'],
    },
  },
  
  pagerduty: {
    serviceKey: process.env.PAGERDUTY_KEY,
    escalationPolicy: 'engineering-on-call',
  },
};

const pagerdutyAlert = async (severity: string, message: string): void => {
  await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routing_key: process.env.PAGERDUTY_KEY,
      event_action: 'trigger',
      dedup_key: `${Date.now()}`,
      payload: {
        summary: message,
        severity: severity,
        source: 'music-practice-api',
      },
    }),
  });
};
```

### 4.3 降级页面实现

```typescript
const degradedPageHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Music Practice App - Service Degraded</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 50px; }
    .status { color: #f44336; font-size: 24px; }
    .message { margin: 20px 0; }
    .retry { padding: 10px 20px; background: #4CAF50; color: white; border: none; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Music Practice App</h1>
  <div class="status">Service Temporarily Unavailable</div>
  <div class="message">
    We're experiencing technical difficulties. Please try again later.
  </div>
  <button class="retry" onclick="location.reload()">Retry</button>
  <div>
    <a href="https://status.music-practice.app">Check Status Page</a>
  </div>
</body>
</html>
`;

const enableDegradedMode = async (): void => {
  await redis.set('service:status', 'degraded', 'EX', 3600);
  
  await kubectl.scale('deployment/music-practice-api', 0);
  
  await nginx.setFallbackPage(degradedPageHTML);
  
  await notifyUsers({
    type: 'service_degraded',
    message: '服务暂时不可用，请稍后重试',
  });
};
```

---

## 5. 数据备份和恢复方案

### 5.1 PostgreSQL备份策略

```bash
#!/bin/bash

BACKUP_DIR="/backup/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="music_practice"

mkdir -p $BACKUP_DIR

pg_dump -Fc $DB_NAME > $BACKUP_DIR/backup_$DATE.dump

find $BACKUP_DIR -name "*.dump" -mtime +30 -delete

aws s3 cp $BACKUP_DIR/backup_$DATE.dump s3://backup-bucket/postgresql/

echo "Backup completed: backup_$DATE.dump"
```

```yaml
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'

wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB
```

### 5.2 Redis备份策略

```conf
save 900 1
save 300 10
save 60 10000

appendonly yes
appendfsync everysec

dir /backup/redis
```

```bash
#!/bin/bash

REDIS_DIR="/backup/redis"
DATE=$(date +%Y%m%d_%H%M%S)

redis-cli BGSAVE

sleep 10

cp $REDIS_DIR/dump.rdb $REDIS_DIR/dump_$DATE.rdb

find $REDIS_DIR -name "dump_*.rdb" -mtime +7 -delete

aws s3 cp $REDIS_DIR/dump_$DATE.rdb s3://backup-bucket/redis/

echo "Redis backup completed: dump_$DATE.rdb"
```

### 5.3 恢复流程

```bash
#!/bin/bash

restore_postgresql() {
  BACKUP_FILE=$1
  
  pg_restore -d music_practice --clean $BACKUP_FILE
  
  echo "PostgreSQL restored from $BACKUP_FILE"
}

restore_redis() {
  BACKUP_FILE=$1
  
  redis-cli SHUTDOWN NOSAVE
  
  cp $BACKUP_FILE /var/lib/redis/dump.rdb
  
  redis-server /etc/redis/redis.conf
  
  echo "Redis restored from $BACKUP_FILE"
}

verify_restoration() {
  pg_isready
  
  redis-cli ping
  
  curl -f https://api.music-practice.app/health
}
```

---

## 6. 服务降级和熔断机制

### 6.1 API熔断配置

```typescript
import CircuitBreaker from 'opossum';

const circuitBreakerConfig = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

const createCircuitBreaker = (fn: Function) => {
  const breaker = new CircuitBreaker(fn, circuitBreakerConfig);
  
  breaker.fallback(() => ({
    success: false,
    error: { code: ErrorCode.EXTERNAL_SERVICE_ERROR, message: 'Service temporarily unavailable' }
  }));
  
  breaker.on('open', () => {
    logger.warn('Circuit breaker opened');
    notifyTeam('circuit_breaker_open');
  });
  
  breaker.on('halfOpen', () => {
    logger.info('Circuit breaker half-open, testing...');
  });
  
  breaker.on('close', () => {
    logger.info('Circuit breaker closed');
  });
  
  return breaker;
};
```

### 6.2 限流配置

```typescript
import rateLimit from '@fastify/rate-limit';

const rateLimitConfig = {
  global: {
    max: 1000,
    timeWindow: '1 minute',
  },
  
  user: {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.user?.userId || req.ip,
  },
  
  ocr: {
    max: 5,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.user?.userId,
  },
};

app.register(rateLimit, rateLimitConfig.global);

app.register(rateLimit, rateLimitConfig.user, { routePrefix: '/api/v1' });

app.register(rateLimit, rateLimitConfig.ocr, { routePrefix: '/pieces/ocr' });
```

---

## 7. 版本管理策略

### 7.1 SemVer规范

```typescript
interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

const parseVersion = (version: string): Version => {
  const [major, minor, patch, prerelease] = version.split(/[.-]/);
  return {
    major: parseInt(major),
    minor: parseInt(minor),
    patch: parseInt(patch),
    prerelease: prerelease,
  };
};

const incrementVersion = (version: Version, type: 'major' | 'minor' | 'patch'): Version => {
  switch (type) {
    case 'major':
      return { major: version.major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major: version.major, minor: version.minor + 1, patch: 0 };
    case 'patch':
      return { major: version.major, minor: version.minor, patch: version.patch + 1 };
  }
};
```

### 7.2 Git标签管理

```bash
#!/bin/bash

create_release() {
  VERSION=$1
  
  git tag -a v$VERSION -m "Release v$VERSION"
  
  git push origin v$VERSION
  
  gh release create v$VERSION \
    --title "Release v$VERSION" \
    --notes-file CHANGELOG.md \
    ./dist/*
}

changelog() {
  PREV_TAG=$(git describe --tags --abbrev=0 HEAD~1)
  CURR_TAG=$(git describe --tags --abbrev=0)
  
  git log $PREV_TAG..$CURR_TAG --pretty=format:'- %s' > CHANGELOG.md
}
```

---

## 8. 测试用例

| 用例ID | 测试内容 | 测试方法 | 预期结果 |
|--------|----------|----------|----------|
| CI-01 | 代码检查 | ESLint | 无错误 |
| CI-02 | 单元测试 | Vitest | 覆盖率>80% |
| CI-03 | 构建 | Vite | 成功 |
| CI-04 | 安全扫描 | Snyk | 无漏洞 |
| CI-05 | E2E测试 | Playwright | 通过 |
| CD-01 | 部署成功 | 健康检查 | 200 |
| CD-02 | 回滚 | 模拟失败 | 自动回滚 |
| CD-03 | 备份恢复 | 模拟恢复 | 数据完整 |
| CD-04 | 熔断 | 模拟错误率 | 熔断触发 |
| CD-05 | 限流 | 超限请求 | 429 |

---

*文档结束*