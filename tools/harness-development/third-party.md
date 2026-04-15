# Harness 体系第三方开源项目分析

## 目录

- [一、核心编排层](#一核心编排层)
- [二、输入治理层](#二输入治理层)
- [三、行为约束层](#三行为约束层)
- [四、执行层](#四执行层)
- [五、验证层](#五验证层)
- [六、基础设施层](#六基础设施层)
- [七、引入项目总览表](#七引入项目总览表)

---

## 一、核心编排层

### 1. GSD 2 (Agentic Loop)

**引入环节：** Agent 入口层、整体架构的核心状态机

**引入原因：**
- 传统 LLM 自循环存在不可控风险（无限循环、状态混乱）
- 需要确定性的任务编排和流程控制
- 需要内置死锁检测和资源限制机制

**带来能力：**
| 能力 | 说明 |
|------|------|
| 状态机驱动 | 用确定性的状态转换替代 LLM 自决策 |
| 死锁检测 | 检测同一状态停留次数，防止无限循环 |
| 资源限制 | 总执行时间上限、单状态循环次数限制 |
| 状态可观测 | 每个状态转换可追踪、可记录 |
| 失败恢复 | 失败时自动回退到指定状态 |

**技术实现建议：**
```typescript
// 手写状态机（推荐）
import { StateMachine } from 'javascript-state-machine'
// 或用 xstate、automata 等状态机库

// 关键配置
const config = {
  max_total_time: 3600,      // 总执行时间上限
  max_state_cycles: 10,      // 单状态最大循环次数
  deadlock_detection: true,
  on_deadlock: "escalate_to_human"
}
```

---

## 二、输入治理层

### 2.1 OpenSpec / OpenAPI Specification

**引入环节：** Inform 输入治理层

**引入原因：**
- 需要一种标准化的方式描述需求和接口规范
- 减少自然语言描述的歧义性
- 便于工具自动化解析和验证

**带来能力：**
| 能力 | 说明 |
|------|------|
| 结构化需求描述 | 标准化的 API/功能定义格式 |
| 类型安全 | 明确的参数、返回值类型定义 |
| 文档自动生成 | 可直接生成 API 文档 |
| 工具互操作性 | 广泛支持的行业标准 |

**典型使用：**
```yaml
# OpenAPI 3.0 规范
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string, minLength: 3 }
                email: { type: string, format: email }
```

---

### 2.2 Context Manager

**引入环节：** Inform 输入治理层

**引入原因：**
- LLM 上下文窗口有限（几万到几十万 tokens）
- 大型代码库上下文会爆炸，成本不可控
- 需要智能选择最相关的代码片段

**带来能力：**
| 能力 | 说明 |
|------|------|
| 上下文压缩 | Claude 风格、滑动窗口等多种压缩策略 |
| 相关性过滤 | 基于 embedding 的相关性计算，只保留高相关文件 |
| Token 预算管理 | 实时追踪 token 消耗，超限自动裁剪 |
| 历史管理 | 压缩历史对话，保留关键信息 |

**技术实现建议：**
```javascript
// 依赖库
import OpenAI from 'openai'  // 用于 embedding 计算
import tiktoken from 'tiktoken'  // 用于 token 计数

// 压缩策略
const compressionMethods = {
  'claude-style': '保留最近完整交互，早期历史压缩为摘要',
  'sliding-window': '滑动窗口保留最近 N 轮对话',
  'none': '不压缩'
}
```

---

### 2.3 Token Budget Planner

**引入环节：** Inform 输入治理层

**引入原因：**
- LLM 调用成本随 token 数线性增长
- 需要预测和控制每次调用的成本
- 避免上下文过大导致成本失控

**带来能力：**
| 能力 | 说明 |
|------|------|
| Token 计数 | 准确计算 text 占用的 token 数 |
| 成本预估 | 根据模型定价预估调用成本 |
| 动态裁剪 | 根据预算动态调整上下文大小 |
| 成本追踪 | 实时记录每次调用的 token 消耗 |

**技术实现建议：**
```typescript
import { Tiktoken } from 'tiktoken'

class TokenBudgetPlanner {
  private encoder = Tiktoken.get_encoding('cl100k_base')

  countTokens(text: string): number {
    return this.encoder.encode(text).length
  }

  estimateCost(tokens: number, model: string): number {
    // 根据模型定价计算成本
    const pricing = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
    }
    return tokens * pricing[model].input / 1000
  }
}
```

---

## 三、行为约束层

### 3.1 Guardrails

**引入环节：** Constrain 行为约束层

**引入原因：**
- LLM 可能执行危险操作（如 `rm -rf`、强制推送到主分支）
- 需要细粒度的权限控制机制
- 防止 AI 系统造成不可逆的破坏

**带来能力：**
| 能力 | 说明 |
|------|------|
| Allow/Deny/Ask | 三级权限控制模式 |
| 规则插件化 | 支持动态注册自定义规则verdict |
| 危险操作拦截 | 自动识别并阻止高危命令 |
| 预算强制检查 | 预算不足时拒绝新任务 |

**典型规则示例：**
```typescript
// 阻止强制推送到主分支
const blockForcePushRule = {
  appliesTo: (tool) => tool === 'git_push_force',
  decision: (args) => {
    if (['main', 'master'].includes(args.branch)) {
      return { allowed: false, reason: '不能强制推送到受保护分支' }
    }
    return { allowed: true }
  }
}

// 开源实现参考
// - Guardrails AI: https://github.com/guardrails-ai/guardrails
// - LLM Guard: https://github.com/laiyer-ai/llm-guard
```

---

### 3.2 Hooks

**引入环节：** Constrain 行为约束层

**引入原因：**
- 需要在关键执行节点进行拦截和守卫
- 防止敏感信息泄露（如提交 .env 文件）
- 失败时自动清理资源（如删除临时 worktree）

**带来能力：**
| 能力 | 说明 |
|------|------|
| 前置拦截 | 在工具执行前进行安全检查 |
| 后置处理 | 工具执行后进行日志记录、状态更新 |
| 失败处理 | 任务失败时自动清理资源 |
| 横切面逻辑 | 实现日志、监控、审计等横切关注点 |

**典型 Hook 示例：**
```typescript
// 防止提交敏感文件
const preventSecretsCommit = {
  beforeExecute: async (ctx) => {
    if (ctx.tool === 'git_commit') {
      const secretPatterns = [/\.env$/, /credentials\.json$/, /api_key/i]
      for (const file of ctx.args.files) {
        if (secretPatterns.some(p => p.test(file))) {
          throw new Error(`禁止提交敏感文件: ${file}`)
        }
      }
    }
  }
}

// 失败时清理 worktree
const cleanupWorktreeOnFail = {
  onFail: async (ctx) => {
    if (ctx.worktree) {
      await exec(`rm -rf ${ctx.worktree}`)
      await exec(`git worktree prune`)
    }
  }
}
```

---

## 四、执行层

### 4.1 Git Worktree Isolation

**引入环节：** Tool System 执行层

**引入原因：**
- 需要在不影响主分支的情况下进行隔离开发
- 支持并发执行多个任务，互不干扰
- 失败时可以直接丢弃，不会污染主分支

**带来能力：**
| 能力 | 说明 |
|------|------|
| 隔离开发环境 | 每个任务在独立的 worktree 中执行 |
- 并发安全 | 多个任务可同时执行，互不影响 |
- 快速回滚 | 失败时直接删除 worktree，无需 revert |
- 资源复用 | 复用主分支的对象数据库，节省空间 |

**技术实现：**
```bash
# Git worktree 原生命令
git worktree add .gsd/worktrees/feature-1 -b feature-1 main
git worktree remove .gsd/worktrees/feature-1

# 技术选型
# - simple-git (Node.js): https://github.com/steveukx/git-js
# - GitPython (Python): https://github.com/gitpython-developers/GitPython
# - go-git (Go): https://github.com/go-git/go-git
```

---

### 4.2 Code Generation (LLM)

**引入环节：** Tool System 执行层

**引入原因：**
- 核心功能：将 OpenSpec 转换为可执行代码
- 需要支持多种编程语言和框架
- 需要高质量、上下文感知的代码生成

**带来能力：**
| 能力 | 说明 |
|------|------|
| 代码生成 | 根据规范生成符合项目的代码 |
| 上下文感知 | 基于项目上下文生成一致的代码 |
- 多语言支持 | 支持生成 TypeScript、Python、Go 等多语言代码 |
| 迭代优化 | 支持基于反馈的迭代改进 |

**LLM Provider 选型：**
| Provider | 模型 | 特点 | 适用场景 |
|----------|------|------|----------|
| **OpenAI** | GPT-4, GPT-4o | 代码能力强，推理能力强 | 复杂业务逻辑 |
| **Anthropic** | Claude 3.5 Sonnet, Opus | 上下文窗口大，安全 | 大型代码库 |
| **Google** | Gemini 1.5 Pro | 超长上下文，多模态 | 需要处理图片/音频 |
| **DeepSeek** | DeepSeek Coder | 代码专项模型，性价比高 | 代码生成任务 |

**技术实现：**
```typescript
// 使用 Anthropic SDK（推荐用于代码生成）
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const code = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 8192,
  system: '你是一个代码生成专家',
  messages: [{
    role: 'user',
    content: `根据以下 OpenSpec 生成代码：\n${openSpec}`
  }]
})
```

---

### 4.3 Session Persistence

**引入环节：** Session 执行层

**引入原因：**
- 需要持久化任务执行状态，支持断点续传
- 需要追踪成本、日志等可观测数据
- 需要支持并发访问和查询

**带来能力：**
| 能力 | 说明 |
|------|------|
| 状态持久化 | 任务执行状态可保存和恢复 |
| 成本追踪 | 实时追踪 LLM、API 等调用成本 |
| 日志记录 | 记录完整执行日志，便于调试和审计 |
| 可观测性 | 提供任务执行的完整指标 |

**存储技术选型：**

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **文件系统 (JSON)** | 单机、轻量级 | 简单、无需依赖 | 不支持并发、查询效率低 |
| **SQLite** | 单机、中等规模 | 轻量、支持 SQL 查询 | 不支持分布式 |
| **PostgreSQL** | 生产环境、分布式 | 功能完整、支持高并发 | 需要运维 |
| **Redis** | 高并发、缓存场景 | 性能高、支持过期 | 数据结构有限 |

**技术实现：**
```typescript
// SQLite 实现（推荐）
import Database from 'better-sqlite3'

const db = new Database('.gsd/sessions.db')

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    cost REAL DEFAULT 0,
    budget REAL NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`)

// 插入/更新
const stmt = db.prepare(`
  INSERT INTO sessions (id, state, cost, budget, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    state = excluded.state,
    cost = excluded.cost,
    updated_at = excluded.updated_at
`)

stmt.run(sessionId, state, cost, budget, now, now)
```

---

## 五、验证层

### 5.1 Superpowers (语义验证)

**引入环节：** Verify 验证层

**引入原因：**
- 静态分析工具只能检查语法和风格，无法验证业务逻辑
- 需要验证代码是否实现了 OpenSpec 中定义的"意图"
- 需要发现语义层面的错误（如遗漏功能、逻辑错误）

**带来能力：**
| 能力 | 说明 |
|------|------|
| 语义一致性检查 | 验证代码是否符合需求和规范 |
| 业务逻辑验证 | 检查业务流程是否正确实现 |
| 跨文件分析 | 发现跨文件的依赖和调用问题 |
| 可修复建议 | 生成可执行的修复建议 |

**技术实现方向：**

| 方向 | 说明 | 技术栈 |
|------|------|--------|
| **LLM 驱动** | 用 LLM 理解需求和代码，进行语义对比 | OpenAI/Anthropic SDK |
| **符号执行** | 从代码生成契约，与 OpenSpec 契约对比 | KLEE、SymPy |
| **测试生成** | 从 OpenSpec 生成测试用例，运行验证 | Property-based Testing |

**参考项目：**
- **LLM-as-a-Judge**: https://github.com/openai/evals
- **Semantic Analysis**: https://github.com/microsoft/semantic-kernel

---

### 5.2 Archon (质量 Gate)

**引入环节：** Verify 验证层

**引入原因：**
- 需要量化代码质量指标（覆盖率、复杂度、安全性）
- 需要集成现有的工程工具（ESLint、Prettier、测试框架）
- 需要设置质量门禁，不通过不能合并

**带来能力：**
| 能力 | 说明 |
|------|------|
| 测试覆盖率检查 | 确保测试覆盖率达到阈值 |
| 复杂度分析 | 检查圈复杂度、认知复杂度等 |
| 安全扫描 | 检测安全漏洞、敏感信息泄露 |
| 类型检查 | TypeScript、Py 等类型检查 |
| 代码风格检查 | ESLint、Prettier 等风格检查 |

**集成工具推荐：**

| 类别 | 工具 | 用途 |
|------|------|------|
| **测试覆盖率** | Jest/Vitest c8, NYC | 计算测试覆盖率 |
| **复杂度分析** | ESLint complexity, SonarQube | 分析代码复杂度 |
| **安全扫描** | Snyk, npm audit, Bandit | 检测安全漏洞 |
| **类型检查** | TypeScript, Pyright | 类型检查 |
| **代码风格** | ESLint, Prettier, Black | 代码格式化 |

**技术实现示例：**
```typescript
class ArchonVerifier {
  async runCoverage(codebase: string): Promise<number> {
    // 使用 NYC 生成覆盖率报告
    const { stdout } = await exec('npx nyc report --reporter=json')
    const report = JSON.parse(stdout)
    return report.total.lines.pct  // 返回覆盖率百分比
  }

  async analyzeComplexity(files: string[]): Promise<ComplexityReport> {
    // 使用 ESLint 分析复杂度
    const result = await exec(`npx eslint ${files.join(' ')} --format json`)
    const report = JSON.parse(result.stdout)
    // 提取复杂度违规项
    return report.filter(r => r.messages.some(m => m.ruleId === 'complexity'))
  }

  async runSecurityScan(codebase: string): Promise<SecurityReport> {
    // 使用 Snyk 扫描安全漏洞
    const { stdout } = await exec('snyk test --json')
    return JSON.parse(stdout)
  }
}
```

---

## 六、基础设施层

### 6.1 LLM SDK

**引入环节：** Code Generation、Superpowers 等所有 LLM 调用环节

**引入原因：**
- 需要与 LLM Provider 交互
- 需要管理 API 调用、重试、超时等
- 需要支持流式输出、Token 追踪

**带来能力：**
| 能力 | 说明 |
|------|------|
| API 调用 | 标准化的 LLM API 调用接口 |
| 流式输出 | 支持 SSE 流式返回结果 |
- 错误处理 | 自动重试、超时控制、错误处理 |
| Token 追踪 | 自动追踪输入输出 token 数 |

**推荐 SDK：**

| Provider | SDK | URL |
|----------|-----|-----|
| **Anthropic** | @anthropic-ai/sdk | https://github.com/anthropics/anthropic-sdk-typescript |
| **OpenAI** | openai | https://github.com/openai/openai-node |
| **Google** | @google/generative-ai | https://github.com/google/generative-ai-js |

---

### 6.2 Git 操作库

**引入环节：** Git Worktree Isolation、代码合并、PR 创建

**引入原因：**
- 需要以编程方式操作 Git（创建分支、提交、推送）
- 需要支持 worktree 等高级功能
- 需要处理 Git 错误和冲突

**带来能力：**
| 能力 | 说明 |
|------|------|
| 分支管理 | 创建、切换、删除分支 |
- Worktree 支持 | 创建和管理 worktree |
| 提交推送 | 提交更改、推送到远程 |
| PR 操作 | 创建、更新、合并 Pull Request |

**推荐库：**

| 语言 | 库 | URL |
|------|-----|-----|
| **Node.js** | simple-git | https://github.com/steveukx/git-js |
| **Python** | GitPython | https://github.com/gitpython-developers/GitPython |
| **Go** | go-git | https://github.com/go-git/go-git |
| **CLI** | gh (GitHub CLI) | https://cli.github.com/ |

---

### 6.3 配置管理

**引入环节：** 所有组件的配置读取

**引入原因：**
- 需要统一管理配置（.gsd/config.yml）
- 需要支持环境变量覆盖
- 需要配置验证和默认值

**带来能力：**
| 能力 | 说明 |
|------|------|
| 配置解析 | 支持 YAML、JSON 等格式 |
| 环境变量 | 支持从环境变量读取配置 |
| 配置验证 | 验证配置的合法性和完整性 |
| 默认值 | 提供合理的默认配置 |

**推荐库：**

| 语言 | 库 | URL |
|------|-----|-----|
| **Node.js** | js-yaml, convict | https://github.com/nodeca/js-yaml |
| **Python** | PyYAML, pydantic | https://github.com/yaml/pyyaml |

---

### 6.4 日志与可观测性

**引入环节：** 全局日志、监控、告警

**引入原因：**
- 需要记录完整的执行日志，便于调试
- 需要监控关键指标（成功率、成本、延迟）
- 需要支持日志查询和告警

**带来能力：**
| 能力 | 说明 |
|------|------|
| 结构化日志 | 支持 JSON 格式的结构化日志 |
| 日志级别 | 支持 DEBUG、INFO、WARN、ERROR 级别 |
| 指标追踪 | 追踪自定义指标（任务数、成本、延迟） |
| 告警集成 | 支持集成 Slack、Email、Webhook 告警 |

**推荐库：**

| 语言 | 库 | URL |
|------|-----|-----|
| **Node.js** | winston, pino | https://github.com/winstonjs/winston |
| **Python** | loguru, structlog | https://github.com/Delgan/loguru |

---

## 七、引入项目总览表

| 环节 | 引入项目/能力 | 类型 | 核心作用 | 推荐技术栈 |
|------|--------------|------|---------|-----------|
| **编排层** | GSD 2 (Agentic Loop) | 自研 | 状态机驱动任务编排 | javascript-state-machine / xstate |
| **输入治理** | OpenSpec | 标准 | 结构化需求描述 | OpenAPI 3.0 |
| **输入治理** | Context Manager | 自研 | 上下文压缩和裁剪 | OpenAI SDK + tiktoken |
| **输入治理** | Token Budget Planner | 自研 | Token 计数和成本预估 | tiktoken |
| **行为约束** | Guardrails | 自研/开源 | 三级权限控制 | Guardrails AI / LLM Guard |
| **行为约束** | Hooks | 自研 | 前置/后置拦截 | 函数注册模式 |
| **执行层** | Git Worktree | Git 原生 | 隔离开发环境 | simple-git / GitPython |
| **执行层** | LLM Code Generation | LLM | 代码生成 | @anthropic-ai-sdk / openai |
| **执行层** | Session Persistence | 存储 | 状态持久化和成本追踪 | SQLite / PostgreSQL |
| **验证层** | Superpowers | 自研 | 语义验证（需求一致性） | LLM-as-a-Judge |
| **验证层** | Archon | 集成工具 | 质量门禁（覆盖率、复杂度） | Snyk / SonarQube / ESLint |
| **基础设施** | LLM SDK | SDK | LLM API 调用 | @anthropic-ai-sdk |
| **基础设施** | Git 操作库 | 库 | Git 编程操作 | simple-git / gh CLI |
| **基础设施** | 配置管理 | 库 | 配置解析和验证 | js-yaml / PyYAML |
| **基础设施** | 日志与可观测 | 库 | 日志记录和指标追踪 | winston / loguru |

---

## 附录：开源项目参考链接

### 编排与状态机
- [xstate](https://github.com/statelyai/xstate) - JavaScript 状态机库
- [javascript-state-machine](https://github.com/jakesgordon/javascript-state-machine) - 轻量级状态机
- [automatax](https://github.com/SageAI/automatax) - LLM Agent 状态机框架

### 安全与 Guardrails
- [Guardrails AI](https://github.com/guardrails-ai/guardrails) - LLM 输入输出验证
- [LLM Guard](https://github.com/laiyer-ai/llm-guard) - LLM 安全防护
- [Nemo Guardrails](https://github.com/NeMoGuardrails/nemoguardrails) - NVIDIA 的 Guardrails 框架

### Git 工具
- [simple-git](https://github.com/steveukx/git-js) - Node.js Git 库
- [GitPython](https://github.com/gitpython-developers/GitPython) - Python Git 库
- [go-git](https://github.com/go-git/go-git) - Go Git 库

### 代码质量与验证
- [Snyk](https://github.com/snyk/snyk) - 安全漏洞扫描
- [SonarQube](https://www.sonarqube.org/) - 代码质量管理平台
- [ESLint](https://github.com/eslint/eslint) - JavaScript/TypeScript 代码检查
- [Jest](https://github.com/jestjs/jest) - JavaScript 测试框架

### Token 与成本
- [tiktoken](https://github.com/openai/tiktoken) - OpenAI Token 计数
- [tokenizers](https://github.com/huggingface/tokenizers) - Hugging Face Tokenizer

### 日志与监控
- [winston](https://github.com/winstonjs/winston) - Node.js 日志库
- [loguru](https://github.com/Delgan/loguru) - Python 日志库
- [prom-client](https://github.com/siimon/prom-client) - Prometheus Node.js 客户端

---

## 总结

本方案引用的第三方开源项目分为以下几类：

1. **标准与规范**：OpenAPI 3.0 - 用于需求描述
2. **自研组件**：GSD 2、Context Manager、Guardrails、Hooks、Superpowers - 核心业务逻辑
3. **集成工具**：Archon 集成 Snyk、ESLint、Jest 等现有质量工具
4. **基础设施**：LLM SDK、Git 库、配置库、日志库 - 技术支撑

**核心原则：**
- 核心逻辑自研（如 GSD 2、Superpowers），保证可控性
- 成熟工具集成（如 Snyk、ESLint），避免重复造轮子
- 标准规范遵循（如 OpenAPI），保证互操作性
