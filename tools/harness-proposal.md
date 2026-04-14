# Harness 体系完整构建方案

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent 入口层                              │
│  用户 / CI / 事件触发                                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        GSD 2 (Agentic Loop)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  状态机驱动：Idle → Parsing → Planning → Executing       │  │
│  │              → Validating → Merging → Done/Fail         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Inform (输入治理层)                           │
│  OpenSpec → Context Manager → Token Budget Planner               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Constrain (行为约束层)                          │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │   Guardrails     │  │      Hooks       │                      │
│  │  Allow/Deny/Ask  │  │  前置/后置守卫    │                      │
│  └──────────────────┘  └──────────────────┘                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Tool System + Session (执行层)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  git worktree isolation                                   │  │
│  │  code generation (OpenSpec → Code)                        │  │
│  │  LLM execution with cost tracking                         │  │
│  │  session persistence & state management                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Verify (验证层)                             │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │   Superpowers    │  │     Archon        │                      │
│  │  语义验证        │  │  量化质量 Gate    │                      │
│  └──────────────────┘  └──────────────────┘                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Feedback + Correct (反馈与纠错层)                    │
│  结构化反馈 → 自动修复 → 重试 → 超限则升级人工                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        输出层                                    │
│  PR 创建 / 通知 / 人工接管                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、六大组件详细设计

### 1. Agentic Loop (GSD 2)

**核心：状态机驱动，避免无限循环**

```typescript
// GSD 2 状态机定义
enum GSDState {
  IDLE = 'idle',
  PARSING = 'parsing',      // 解析 OpenSpec
  PLANNING = 'planning',    // 拆分任务
  EXECUTING = 'executing',  // 执行任务
  VALIDATING = 'validating', // 验证产出
  MERGING = 'merging',       // 合并代码
  DONE = 'done',
  FAIL = 'fail'
}

interface GSDSession {
  id: string
  state: GSDState
  currentTask?: Task
  attempts: number
  maxAttempts: number
  cost: number
  budget: number
  startTime: Date
  worktree?: string
}

// 状态转换逻辑
const stateTransitions: Record<GSDState, GSDState[]> = {
  [GSDState.IDLE]: [GSDState.PARSING],
  [GSDState.PARSING]: [GSDState.PLANNING, GSDState.FAIL],
  [GSDState.PLANNING]: [GSDState.EXECUTING, GSDState.FAIL],
  [GSDState.EXECUTING]: [GSDState.VALIDATING, GSDState.EXECUTING, GSDState.FAIL], // 支持重试
  [GSDState.VALIDATING]: [GSDState.MERGING, GSDState.EXECUTING, GSDState.FAIL], // 验证失败回退执行
  [GSDState.MERGING]: [GSDState.DONE, GSDState.FAIL],
  [GSDState.DONE]: [],
  [GSDState.FAIL]: []
}

// 死锁检测
const STUCK_THRESHOLD = 10 // 同一状态停留超过 10 次算卡死
function detectDeadlock(session: GSDSession): boolean {
  return session.attempts >= STUCK_THRESHOLD
}
```

**关键配置：**

```yaml
# .gsd/config.yml
loop:
  max_total_time: 3600  # 总执行时间上限
  max_state_cycles: 10  # 单状态最大循环次数
  deadlock_detection: true
  on_deadlock: "escalate_to_human"
```

---

### 2. Tool System

**核心：隔离执行，可观测**

```typescript
interface Tool {
  name: string
  description: string
  execute: (args: any, context: ExecutionContext) => Promise<ToolResult>
  dangerous?: boolean  // 是否危险操作
  requiresPermission?: boolean
}

interface ToolResult {
  success: boolean
  output?: any
  error?: string
  cost?: number
  metadata?: Record<string, any>
}

// 核心工具集
const tools: Tool[] = [
  {
    name: 'git_worktree_create',
    description: '创建 git worktree 进行隔离开发',
    dangerous: false,
    execute: async ({ baseBranch, targetBranch }) => {
      const worktreePath = `.gsd/worktrees/${targetBranch}`
      await exec(`git worktree add ${worktreePath} -b ${targetBranch} ${baseBranch}`)
      return { success: true, output: { worktreePath } }
    }
  },
  {
    name: 'code_generate',
    description: '根据 OpenSpec 生成代码',
    dangerous: false,
    execute: async ({ spec, targetPath }) => {
      const code = await llmClient.chat([
        { role: 'system', content: '你是一个代码生成专家，严格按照 OpenSpec 生成代码' },
        { role: 'user', content: `OpenSpec:\n${spec}\n\n请生成代码到 ${targetPath}` }
      ])
      await writeFile(targetPath, code)
      return { success: true, output: { code } }
    }
  },
  {
    name: 'git_push_force',
    description: '强制推送到远程仓库',
    dangerous: true,
    requiresPermission: true,
    execute: async ({ branch }) => {
      await exec(`git push --force origin ${branch}`)
      return { success: true }
    }
  }
]

// 工具执行器（带权限检查）
class ToolExecutor {
  constructor(
    private guardrails: Guardrails,
    private logger: Logger
  ) {}

  async execute(tool: Tool, args: any, context: ExecutionContext): Promise<ToolResult> {
    // 权限检查
    if (tool.dangerous || tool.requiresPermission) {
      const permission = await this.guardrails.ask({
        tool: tool.name,
        args,
        context: { branch: context.worktree }
      })

      if (!permission.allowed) {
        return { success: false, error: 'Permission denied' }
      }
    }

    // 执行前 Hook
    await context.hooks?.beforeExecute?.({ tool, args })

    try {
      const result = await tool.execute(args, context)
      this.logger.info(`Tool ${tool.name} executed`, { cost: result.cost })
      return result
    } catch (error) {
      this.logger.error(`Tool ${tool.name} failed`, { error })
      return { success: false, error: error.message }
    } finally {
      // 执行后 Hook
      await context.hooks?.afterExecuteExecute?.({ tool, args, result: result })
    }
  }
}
```

---

### 3. Memory & Context Management

**核心：最小充分上下文，避免爆炸**

```typescript
interface ContextStrategy {
  maxTokens: number
  relevanceThreshold: number
  compressionMethod: 'none' | 'claude-style' | 'sliding-window'
  includeHistory: boolean
  maxHistoryTurns: number
}

class ContextManager {
  constructor(private strategy: ContextStrategy) {}

  async prepareContext(
    openSpec: string,
    relatedFiles: string[],
    history?: ConversationHistory
  ): Promise<string> {
    const parts: string[] = []

    // 1. OpenSpec（核心，不可裁剪）
    parts.push(`=== OpenSpec ===\n${openSpec}\n`)

    // 2. 相关文件（按相关性排序，截断）
    const filteredFiles = await this.filterRelatedFiles(relatedFiles)
    parts.push(`=== Related Files ===\n${filteredFiles.map(f => f.content).join('\n---\n')}\n`)

    // 3. 历史上下文（按策略压缩）
    if (history && this.strategy.includeHistory) {
      const compressedHistory = await this.compressHistory(history)
      parts.push(`=== History ===\n${compressedHistory}\n`)
    }

    const fullContext = parts.join('\n')

    // Token 检查和压缩
    const tokenCount = await this.countTokens(fullContext)
    if (tokenCount > this.strategy.maxTokens) {
      return await this.compress(fullContext, this.strategy.maxTokens)
    }

    return fullContext
  }

  private async filterRelatedFiles(files: string[]): Promise<File[]> {
    // 使用 embedding 计算与任务的相关性
    // 只保留相关性高于阈值的文件
    const scored = await Promise.all(files.map(async (path) => {
      const content = await readFile(path)
      const relevance = await this.calculateRelevance(content, this.currentTask)
      return { path, content, relevance }
    }))

    return scored
      .filter(f => f.relevance >= this.strategy.relevanceThreshold)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10) // 最多 10 个文件
  }

  private async compressHistory(history: ConversationHistory): Promise<string> {
    if (this.strategy.compressionMethod === 'claude-style') {
      return this.claudeStyleCompression(history)
    }
    // ... 其他压缩策略
  }

  private async claudeStyleCompression(history: ConversationHistory): Promise<string> {
    // Claude 风格压缩：
    // - 保留最近的完整交互
    // - 早期历史压缩为摘要
    // - 保留关键决策点
    const recentTurns = history.turns.slice(-this.strategy.maxHistoryTurns)
    const earlySummary = this.summarizeEarlyTurns(history.turns.slice(0, -this.strategy.maxHistoryTurns))

    return `${earlySummary}\n\n[Recent conversation]\n${recentTurns.map(t => t.toString()).join('\n')}`
  }
}
```

**配置示例：**

```yaml
# .gsd/context.yml
context:
  max_tokens: 64000
  relevance_threshold: 0.7
  compression_method: claude-style
  include_history: true
  max_history_turns: 3
  file_relevance_cache_ttl: 3600  # 缓存 1 小时
```

---

### 4. Guardrails

**核心：Allow/Deny/Ask，细粒度权限控制**

```typescript
interface Permission {
  allowed: boolean
  reason?: string
  approval?: 'auto' | 'user' | 'never'
}

interface GuardrailRule {
  name: string
  description: string
  appliesTo: (tool: string, args: any, context: ExecutionContext) => boolean
  decision: (tool: string, args: any, context: ExecutionContext) => Promise<Permission>
}

class Guardrails {
  private rules: GuardrailRule[] = []

  register(rule: GuardrailRule) {
    this.rules.push(rule)
  }

  async ask({
    tool,
    args,
    context
  }: {
    tool: string
    args: any
    context: ExecutionContext
  }): Promise<Permission> {
    for (const rule of this.rules) {
      if (rule.appliesTo(tool, args, context)) {
        const permission = await rule.decision(tool, args, context)
        if (!permission.allowed) {
          return permission
        }
      }
    }
    return { allowed: true }
  }
}

// 预定义规则
const defaultRules: GuardrailRule[] = [
  {
    name: 'block-force-push-to-main',
    description: '禁止强制推送到主分支',
    appliesTo: (tool) => tool === 'git_push_force',
    decision: async (_, args, ctx) => {
      const protectedBranches = ['main', 'master', 'dev', 'staging']
      if (protectedBranches.includes(args.branch)) {
        return {
          allowed: false,
          reason: `不能强制推送到受保护分支: ${args.branch}`,
          approval: 'never'
        }
      }
      return { allowed: true }
    }
  },
  {
    name: 'ask-for-dangerous-operations',
    description: '危险操作需要用户确认',
    appliesTo: (tool, args, ctx) => {
      return (
        tool.includes('delete') ||
        tool.includes('drop') ||
        tool.includes('force')
      )
    },
    decision: async (tool, args, ctx) => {
      return {
        allowed: false,
        reason: `执行危险操作: ${tool}`,
        approval: 'user'  // 需要用户手动确认
      }
    }
  },
  {
    name: 'budget-check',
    description: '预算不足时拒绝新任务',
    appliesTo: () => true,  // 所有操作都检查
    decision: async (_, __, ctx) => {
      const remaining = ctx.budget - ctx.spent
      if (remaining < 0.1) {  // 低于 0.1 美元
        return {
          allowed: false,
          reason: '预算不足',
          approval: 'never'
        }
      }
      return { allowed: true }
    }
  }
]
```

---

### 5. Hooks

**核心：关键节点守卫，前置/后置拦截**

```typescript
interface HookContext {
  tool: string
  args: any
  worktree?: string
  session: GSDSession
}

interface Hook {
  name: string
  beforeExecute?: (ctx: HookContext) => Promise<void>
  afterExecute?: (ctx: HookContext & { result: ToolResult }) => Promise<void>
  onFail?: (ctx: HookContext & { error: Error }) => Promise<void>
}

class HookManager {
  private hooks: Hook[] = []

  register(hook: Hook) {
    this.hooks.push(hook)
  }

  async runBefore(ctx: HookContext) {
    for (const hook of this.hooks) {
      await hook.beforeExecute?.(ctx)
    }
  }

  async runAfter(ctx: HookContext & { result: ToolResult }) {
    for (const hook of this.hooks) {
      await hook.afterExecute?.(ctx)
    }
  }

  async runOnFail(ctx: HookContext & { error: Error }) {
    for (const hook of this.hooks) {
      await hook.onFail?.(ctx)
    }
  }
}

// 预定义 Hooks
const defaultHooks: Hook[] = [
  {
    name: 'prevent-secrets-commit',
    beforeExecute: async (ctx) => {
      if (ctx.tool === 'git_commit' || ctx.tool === 'git_add') {
        const files = ctx.args.files || []
        const secretPatterns = [
          /\.env$/,
          /credentials\.json$/,
          /secret/i,
          /password/i,
          /api_key/i,
          /private_key/i
        ]

        for (const file of files) {
          if (secretPatterns.some(pattern => pattern.test(file))) {
            throw new Error(`检测到敏感文件提交: ${file}，操作已被拦截`)
          }
        }
      }
    }
  },
  {
    name: 'log-operations',
    beforeExecute: async (ctx) => {
      console.log(`[Hook] 执行工具: ${ctx.tool}`, { args: ctx.args })
    },
    afterExecute: async (ctx) => {
      console.log(`[Hook] 工具完成: ${ctx.tool}`, {
        success: ctx.result.success,
        cost: ctx.result.cost
      })
    }
  },
  {
    name: 'cleanup-worktree-on-fail',
    onFail: async (ctx) => {
      if (ctx.worktree) {
        console.log(`[Hook] 清理失败的工作树: ${ctx.worktree}`)
        await exec(`rm -rf ${ctx.worktree}`)
        await exec(`git worktree prune`)
      }
    }
  },
  {
    name: 'enforce-pr-description',
    beforeExecute: async (ctx) => {
      if (ctx.tool === 'gh_pr_create') {
        if (!ctx.args.body || ctx.args.body.length < 50) {
          throw new Error('PR 描述不能少于 50 字符，请补充变更说明')
        }
      }
    }
  }
]
```

---

### 6. Session

**核心：状态持久化、成本追踪、可观测**

```typescript
interface SessionData {
  id: string
  state: GSDState
  createdAt: Date
  updatedAt: Date
  currentTask?: Task
  worktree?: string
  cost: {
    total: number
    breakdown: {
      llm: number
      api: number
      other: number
    }
  }
  budget: number
  attempts: number
  logs: LogEntry[]
  metadata: Record<string, any>
}

class SessionManager {
  private sessions = new Map<string, SessionData>()
  private storage: Storage // 可配置持久化后端（文件、数据库）

  async create(budget: number): Promise<string> {
    const id = generateId()
    const session: SessionData = {
      id,
      state: GSDState.IDLE,
      createdAt: new Date(),
      updatedAt: new Date(),
      cost: { total: 0, breakdown: { llm: 0, api: 0, other: 0 } },
      budget,
      attempts: 0,
      logs: []
    }

    await this.save(session)
    this.sessions.set(id, session)
    return id
  }

  async updateState(id: string, newState: GSDState): Promise<void> {
    const session = this.get(id)
    session.state = newState
    session.updatedAt = new Date()
    await this.save(session)
  }

  async trackCost(id: string, type: 'llm' | 'api' | 'other', amount: number): Promise<void> {
    const session = this.get(id)
    session.cost.breakdown[type] += amount
    session.cost.total += amount
    await this.save(session)
  }

  async checkBudget(id: string): Promise<{ remaining: number; exhausted: boolean }> {
    const session = this.get(id)
    const remaining = session.budget - session.cost.total
    return { remaining, exhausted: remaining <= 0 }
  }

  async log(id: string, level: 'info' | 'warn' | 'error', message: string, data?: any): Promise<void> {
    const session = this.get(id)
    session.logs.push({ timestamp: new Date(), level, message, data })
    await this.save(session)
  }

  // 获取可观测数据
  getMetrics(id: string): SessionMetrics {
    const session = this.get(id)
    return {
      duration: Date.now() - session.createdAt.getTime(),
      cost: session.cost,
      attempts: session.attempts,
      logs: session.logs,
      budgetUsed: (session.cost.total / session.budget) * 100
    }
  }
}
```

---

## 三、控制闭环完整实现

### Feedback 结构化标准

```typescript
interface Feedback {
  status: 'pass' | 'fail' | 'warning'
  category: 'semantic' | 'quality' | 'security' | 'style'
  location?: {
    file: string
    line?: number
    column?: number
  }
  message: string
  details?: any
  fixable: boolean
  fix_suggestion?: string  // LLM 可理解的修复建议
  confidence: number  // 0-1，反馈的可信度
}

interface VerificationResult {
  overall: 'pass' | 'fail'
  feedback: Feedback[]
  metadata?: {
    verifier: 'superpowers' | 'archon'
    execution_time: number
    cost?: number
  }
}
```

### Verify 层：Superpowers + Archon 协作

```typescript
class VerificationLayer {
  constructor(
    private superpowers: SuperpowersVerifier,
    private archon: ArchonVerifier,
    private logger: Logger
  ) {}

  async verify(task: Task, context: ExecutionContext): Promise<VerificationResult> {
    const results: VerificationResult[] = []

    // 第一层：Superpowers 语义验证
    const semanticResult = await this.superpowers.verify({
      openSpec: context.openSpec,
      generatedCode: context.generatedFiles,
      task: task.description
    })

    results.push(semanticResult)
    this.logger.info('Superpowers 验证完成', semanticResult)

    // 如果语义验证失败，可以提前返回（除非配置要求继续）
    if (semanticResult.overall === 'fail' && !context.config.continueOnSemanticFail) {
      return semanticResult
    }

    // 第二层：Archon 质量门禁
    const qualityResult = await this.archon.verify({
      codebase: context.worktree,
      changedFiles: context.changedFiles,
      gates: ['coverage', 'complexity', 'security', 'type-check']
    })

    results.push(qualityResult)
    this.logger.info('Archon 验证完成', qualityResult)

    // 合并结果
    return this.mergeResults(results)
  }

  private mergeResults(results: VerificationResult[]): VerificationResult {
    const allFeedback = results.flatMap(r => r.feedback)
    const overall = allFeedback.some(f => f.status === 'fail') ? 'fail' : 'pass'

    return {
      overall,
      feedback: allFeedback,
      metadata: {
        combined_from: results.map(r => r.metadata?.verifier)
      }
    }
  }
}

// Superpowers 验证器（语义）
class SuperpowersVerifier {
  async verify(params: {
    openSpec: string
    generatedCode: string[]
    task: string
  }): Promise<VerificationResult> {
    const feedback: Feedback[] = []

    for (const file of params.generatedCode) {
      const content = await readFile(file)

      // 检查是否符合 OpenSpec 语义
      const specCompliance = await this.checkSpecCompliance(content, params.openSpec)
      if (!specCompliance.passed) {
        feedback.push({
          status: 'fail',
          category: 'semantic',
          location: { file },
          message: specCompliance.message,
          fixable: true,
          fix_suggestion: specCompliance.suggestion,
          confidence: 0.8
        })
      }

      // 检查业务逻辑一致性
      const logicCheck = await this.checkBusinessLogic(content, params.openSpec)
      if (!logicCheck.passed) {
        feedback.push({
          status: 'fail',
          category: 'semantic',
          location: { file, line: logicCheck.line },
          message: logicCheck.message,
          fixable: true,
          fix_suggestion: logicCheck.suggestion,
          confidence: 0.7
        })
      }
    }

    return {
      overall: feedback.some(f => f.status === 'fail') ? 'fail' : 'pass',
      feedback,
      metadata: { verifier: 'superpowers', execution_time: Date.now() }
    }
  }

  private async checkSpecCompliance(code: string, spec: string): Promise<any> {
    // 使用 LLM 检查代码是否符合规范
    const response = await llmClient.chat([
      {
        role: 'system',
        content: '你是一个代码审查专家，检查代码是否符合 OpenSpec 规范'
      },
      {
        role: 'user',
        content: `OpenSpec:\n${spec}\n\n代码:\n${code}\n\n检查代码是否符合规范，返回 JSON 格式结果：\n{\n  "passed": boolean,\n  "message": string,\n  "suggestion": string\n}`
      }
    ])
    return JSON.parse(response)
  }

  private async checkBusinessLogic(code: string, spec: string): Promise<any> {
    // 类似的业务逻辑检查
  }
}

// Archon 验证器（量化质量）
class ArchonVerifier {
  async verify(params: {
    codebase: string
    changedFiles: string[]
    gates: string[]
  }): Promise<VerificationResult> {
    const feedback: Feedback[] = []

    // 覆盖率检查
    if (params.gates.includes('coverage')) {
      const coverage = await this.runCoverage(params.codebase)
      if (coverage < 80) {
        feedback.push({
          status: 'fail',
          category: 'quality',
          message: `测试覆盖率不足: ${coverage}%，要求至少 80%`,
          fixable: true,
          fix_suggestion: '请增加测试用例以提高覆盖率',
          confidence: 1.0
        })
      }
    }

    // 复杂度检查
    if (params.gates.includes('complexity')) {
      const complexity = await this.analyzeComplexity(params.changedFiles)
      for (const item of complexity.violations) {
        feedback.push({
          status: 'fail',
          category: 'quality',
          location: { file: item.file, line: item.line },
          message: `圈复杂度过高: ${item.complexity}，建议不超过 10`,
          fixable: true,
          fix_suggestion: '重构方法，拆分为更小的函数',
          confidence: 1.0
        })
      }
    }

    // 安全检查
    if (params.gates.includes('security')) {
      const security = await this.runSecurityScan(params.codebase)
      for (const vuln of security.vulnerabilities) {
        feedback.push({
          status: 'fail',
          category: 'security',
          location: { file: vuln.file, line: vuln.line },
          message: `安全漏洞: ${vuln.type}`,
          fixable: vuln.fixable,
          fix_suggestion: vuln.fix,
          confidence: 0.9
        })
      }
    }

    // 类型检查
    if (params.gates.includes('type-check')) {
      const typeCheck = await this.runTypeCheck(params.codebase)
      if (!typeCheck.passed) {
        for (const error of typeCheck.errors) {
          feedback.push({
            status: 'fail',
            category: 'quality',
            location: { file: error.file, line: error.line },
            message: `类型错误: ${error.message}`,
            fixable: false,  // 类型错误通常需要手动修复
            confidence: 1.0
          })
        }
      }
    }

    return {
      overall: feedback.some(f => f.status === 'fail') ? 'fail' : 'pass',
      feedback,
      metadata: { verifier: 'archon', execution_time: Date.now() }
    }
  }
}
```

### Correct 层：受限纠错

```typescript
interface EscalationPolicy {
  maxRetries: number
  maxTotalAttempts: number
  escalateOn: string[]  // 触发升级的条件类型
  escalateAction: 'create_pr' | 'notify' | 'pause'
}

class CorrectionEngine {
  constructor(
    private policy: EscalationPolicy,
    private sessionManager: SessionManager,
    private logger: Logger
  ) {}

  async correct(
    sessionId: string,
    verificationResult: VerificationResult,
    context: ExecutionContext
  ): Promise<'retried' | 'escalated' | 'manual'> {
    const session = this.sessionManager.get(sessionId)
    session.attempts++

    // 检查是否达到重试上限
    if (session.attempts >= this.policy.maxRetries) {
      return await this.escalate(sessionId, verificationResult, 'max_retries')
    }

    // 检查是否需要升级（安全、死循环等）
    const shouldEscalate = this.shouldEscalate(verificationResult.feedback)
    if (shouldEscalate) {
      return await this.escalate(sessionId, verificationResult, 'policy_trigger')
    }

    // 执行自动修复
    const fixable = verificationResult.feedback.filter(f => f.fixable)
    if (fixable.length === 0) {
      return await this.escalate(sessionId, verificationResult, 'no_auto_fix')
    }

    // 生成修复指令
    const fixPrompts = fixable.map(f => {
      if (f.fix_suggestion) {
        return `在 ${f.location?.file}${f.line ? `:${f.line}` : ''} 修复：${f.message}\n建议：${f.fix_suggestion}`
      }
    })

    const fixPrompt = fixPrompts.join('\n\n')

    try {
      // 执行修复（重新执行任务，带上修复建议）
      await this.executeFix(sessionId, fixPrompt, context)
      this.logger.info(`自动修复尝试 #${session.attempts}`, { sessionId })
      return 'retried'
    } catch (error) {
      this.logger.error('自动修复失败', { error, sessionId })
      return await this.escalate(sessionId, verificationResult, 'fix_failed')
    }
  }

  private async escalate(
    sessionId: string,
    result: VerificationResult,
    reason: string
  ): Promise<'escalated' | 'manual'> {
    this.logger.warn('升级人工处理', { sessionId, reason })

    if (this.policy.escalateAction === 'create_pr') {
      const prUrl = await this.createDraftPR(sessionId, result)
      this.logger.info(`已创建草稿 PR: ${prUrl}`)
      return 'escalated'
    } else if (this.policy.escalateAction === 'notify') {
      await this.notifyHuman(sessionId, result, reason)
      return 'escalated'
    }

    return 'manual'
  }

  private shouldEscalate(feedback: Feedback[]): boolean {
    return this.policy.escalateOn.some(trigger =>
      feedback.some(f =>
        f.category === trigger || f.message.toLowerCase().includes(trigger)
      )
    )
  }

  private async executeFix(sessionId: string, fixPrompt: string, context: ExecutionContext): Promise<void> {
    // 重新调用代码生成，带上修复建议
    const fixedCode = await llmClient.chat([
      {
        role: 'system',
        content: '你是一个代码修复专家，根据反馈修复代码'
      },
      {
        role: 'user',
        content: `任务：${context.currentTask?.description}\n\n修复建议：\n${fixPrompt}\n\n请生成修复后的代码`
      }
    ])

    // 写入修复后的代码
    for (const file of context.changedFiles) {
      await writeFile(file, fixedCode)
    }
  }

  private async createDraftPR(sessionId: string, result: VerificationResult): Promise<string> {
    const session = this.sessionManager.get(sessionId)

    const prBody = `
## 自动生成任务（需要人工审核）

### Session ID
${sessionId}

### 验证结果
${result.overall === 'pass' ? '✅ 通过' : '❌ 失败'}

### 反馈信息
${result.feedback.map(f => `- [${f.category}] ${f.message}`).join('\n')}

### 需要人工处理
请审查代码并处理上述问题，合并前确保所有验证通过。

---
🤖 Generated by GSD 2
`.trim()

    const { stdout } = await exec(`gh pr create --title "[GSD] ${session.currentTask?.description}" --body '${prBody}' --draft`)
    return stdout.trim()
  }
}
```

---

## 四、工具协作完整流程

### 主流程编排

```typescript
class GSDEngine {
  constructor(
    private sessionManager: SessionManager,
    private contextManager: ContextManager,
    private guardrails: Guardrails,
    private hooks: HookManager,
    private toolExecutor: ToolExecutor,
    private verificationLayer: VerificationLayer,
    private correctionEngine: CorrectionEngine
  ) {}

  async run(task: Task, config: GSDConfig): Promise<ExecutionResult> {
    // 1. 创建会话
    const sessionId = await this.sessionManager.create(config.budget)

    try {
      // 2. 准备上下文 (Inform)
      const context = await this.prepareContext(task, sessionId, config)

      // 3. 执行主循环 (Agentic Loop)
      return await this.runLoop(sessionId, task, context, config)
    } finally {
      // 4. 清理资源
      await this.cleanup(sessionId)
    }
  }

  private async runLoop(
    sessionId: string,
    task: Task,
    context: ExecutionContext,
    config: GSDConfig
  ): Promise<ExecutionResult> {
    let currentState = GSDState.PARSING
    let lastVerification?: VerificationResult

    while (currentState !== GSDState.DONE && currentState !== GSDState.FAIL) {
      // 更新状态
      await this.sessionManager.updateState(sessionId, currentState)

      // 死锁检测
      const session = this.sessionManager.get(sessionId)
      if (detectDeadlock(session)) {
        throw new Error('检测到死锁，可能陷入无限循环')
      }

      // 预算检查
      const budgetCheck = await this.sessionManager.checkBudget(sessionId)
      if (budgetCheck.exhausted) {
        throw new Error('预算已耗尽')
      }

      // 状态转换逻辑
      switch (currentState) {
        case GSDState.PARSING:
          await this.handleParsing(sessionId, context)
          currentState = GSDState.PLANNING
          break

        case GSDState.PLANNING:
          await this.handlePlanning(sessionId, task, context)
          currentState = GSDState.EXECUTING
          break

        case GSDState.EXECUTING:
          await this.handleExecuting(sessionId, context)
          currentState = GSDState.VALIDATING
          break

        case GSDState.VALIDATING:
          // Verify
          lastVerification = await this.verificationLayer.verify(task, context)

          if (lastVerification.overall === 'pass') {
            currentState = GSDState.MERGING
          } else {
            // Correct
            const action = await this.correctionEngine.correct(
              sessionId,
              lastVerification,
              context
            )

            if (action === 'retried') {
              currentState = GSDState.EXECUTING // 回退到执行阶段
            } else {
              currentState = GSDState.FAIL // 升级人工或失败
            }
          }
          break

        case GSDState.MERGING:
          await this.handleMerging(sessionId, context)
          currentState = GSDState.DONE
          break
      }
    }

    // 返回最终结果
    return {
      sessionId,
      status: currentState === GSDState.DONE ? 'success' : 'failed',
      verification: lastVerification,
      metrics: this.sessionManager.getMetrics(sessionId)
    }
  }

  private async handleParsing(sessionId: string, context: ExecutionContext) {
    // 解析 OpenSpec，提取任务元数据
    this.sessionManager.log(sessionId, 'info', '开始解析 OpenSpec')
    // ...
  }

  private async handlePlanning(sessionId: string, task: Task, context: ExecutionContext) {
    // 拆分任务为子任务
    this.sessionManager.log(sessionId, 'info', '任务规划中', { task: task.description })
    // ...
  }

  private async handleExecuting(sessionId: string, context: ExecutionContext) {
    // 使用 Tool Executor 执行代码生成
    this.sessionManager.log(sessionId, 'info', '执行任务中')

    const result = await this.toolExecutor.execute(
      context.tools.code_generate,
      { spec: context.openSpec, targetPath: context.targetPath },
      context
    )

    if (!result.success) {
      throw new Error(`代码生成失败: ${result.error}`)
    }
  }

  private async handleMerging(sessionId: string, context: ExecutionContext) {
    // 合并代码、运行测试、创建 PR
    this.sessionManager.log(sessionId, 'info', '合并代码中')
    // ...
  }

  private async cleanup(sessionId: string) {
    const session = this.sessionManager.get(sessionId)
    if (session.worktree) {
      await exec(`git worktree remove ${session.worktree}`)
    }
  }
}
```

---

## 五、配置示例

### 完整配置文件

```yaml
# .gsd/config.yml

# 基本配置
project:
  name: "my-project"
  openSpecPath: "./spec/openapi.yaml"
  targetBranch: "main"

# Agentic Loop 配置
loop:
  max_total_time: 3600      # 总执行时间上限（秒）
  max_state_cycles: 10      # 单状态最大循环次数
  deadlock_detection: true   # 启用死锁检测
  on_deadlock: "escalate_to_human"

# Context 策略
context:
  max_tokens: 64000
  relevance_threshold: 0.7
  compression_method: claude-style
  include_history: true
  max_history_turns: 3
  file_relevance_cache_ttl: 3600

# 预算配置
budget:
  total: 10.0               # 总预算（美元）
  warn_threshold: 0.2       # 剩余 20% 时警告
  stop_on_exhausted: true

# Guardrails 配置
guardrails:
  protected_branches:
    - main
    - master
    - dev
  danger_patterns:
    - delete
    - drop
    - force
  secret_patterns:
    - \.env$
    - credentials\.json$
    - secret
    - password
    - api_key
    - private_key

# Hooks 配置
hooks:
  enabled:
    - prevent-secrets-commit
    - log-operations
    - enforce-pr-description
  on_failure:
    - cleanup-worktree-on-fail

# 纠错策略
correction:
  max_retries: 3
  escalate_on:
    - security
    - infinite_loop
    - no_auto_fix
  escalate_action: create_pr

# 验证配置
verification:
  superpowers:
    enabled: true
    continue_on_fail: false  # 语义验证失败则停止
  archon:
    enabled: true
    gates:
      - coverage
      - complexity
      - security
      - type-check
    thresholds:
      coverage: 80
      complexity: 10

# 工具配置
tools:
  llm:
    provider: openai
    model: gpt-4
    temperature: 0.7
  git:
    worktree_base: .gsd/worktrees
```

---

## 六、实施路线图

### 阶段 0：基础设施搭建（1-2 周）

- [x] 设计架构和配置规范
- [ ] 实现 Session Manager（状态持久化、成本追踪）
- [ ] 实现 Guardrails 基础框架
- [ ] 实现 Hook Manager
- [ ] 搭建日志和可观测系统

**交付物：**
- `.gsd/config.yml` 配置规范
- Session、Guardrails、Hooks 的 MVP 实现

### 阶段 1：Agentic Loop + Tool System（2-3 周）

- [ ] 实现状态机驱动的 Agentic Loop
- [ ] 实现 Tool System（git worktree、代码生成）
- [ ] 集成 Guardrails 到工具执行流程
- [ ] 集成 Hooks 到关键节点

**交付物：**
- 可以执行简单的代码生成任务
- 基本的权限控制和操作守卫

### 阶段 2：Context Management（1-2 周）

- [ ] 实现 Context Manager
- [ ] 实现相关性过滤（embedding + 向量检索）
- [ ] 实现上下文压缩（Claude 风格）
- [ ] Token 计数和预算控制

**交付物：**
- 智能上下文裁剪
- 成本追踪和控制

### 阶段 3：Verify + Superpowers 集成（2-3 周）

- [ ] 实现 Verification Layer 框架
- [ ] 集成 Superpowers（语义验证）
- [ ] 定义 Feedback 标准格式
- [ ] 实现基本的自动修复

**交付物：**
- 语义验证能力
- 失败结构化反馈
- 简单的自动纠错

### 阶段 4：Archon 集成 + 纠错闭环（2-3 周）

- [ ] 集成 Archon（质量门禁）
- [ ] 实现完整的 Correction Engine
- [ ] 实现升级人工策略
- [ ] 实现草稿 PR 创建

**交付物：**
- 完整的验证体系（语义 + 质量）
- 可配置的纠错和升级策略
- 失败可闭环

### 阶段 5：优化与生产化（持续）

- [ ] 性能优化（并行执行、缓存）
- [ ] 可观测增强（Dashboard、告警）
- [ ] 文档完善
- [ ] 测试覆盖

**交付物：**
- 生产级 Harness 系统
- 完整文档和最佳实践

---

## 七、关键指标

| 指标 | 说明 | 目标 |
|------|------|------|
| 任务成功率 | 自动完成任务的比例 | > 80% |
| 平均修复次数 | 自动纠错平均次数 | < 2 次 |
| 人工干预率 | 需要升级人工的比例 | < 20% |
| 平均执行时间 | 单任务平均耗时 | < 10 分钟 |
| 成本控制 | 任务平均成本 | < $2 |
| 上下文压缩比 | 原始上下文 / 压缩后 | > 3:1 |
| 验证通过率 | Superpowers + Archon 通过率 | > 90% |

---

## 八、风险评估与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 无限循环 | 高 | 低 | 状态机 + 死锁检测 |
| 上下文爆炸 | 高 | 中 | Context Manager + 压缩 |
| 权限失控 | 高 | 低 | Guardrails + Hooks |
| 成本失控 | 中 | 中 | 预算追踪 + 限制 |
| 验证误判 | 中 | 中 | Superpowers + Archon 双层验证 |
| 自动修复引入新问题 | 中 | 低 | 修复后必须重新验证 |

---

## 九、实施价值

### 9.1 核心能力

**1. 状态机驱动的 Agentic 系统**
- 用确定性状态机替代不可控的 LLM 自循环
- 内置死锁检测（单状态循环次数阈值）和总时间限制
- 每个状态转换可观测、可追踪

**2. 完整的控制闭环**

```
  Inform (输入治理)
    ↓ 智能上下文裁剪、相关性过滤、压缩
  Constrain (行为约束)
    ↓ Allow/Deny/Ask 细粒度权限控制
  Verify (双层验证)
    ↓ Superpowers 语义验证 + Archon 质量门禁
  Correct (自动纠错)
    ↓ 结构化反馈驱动修复 → 超限升级人工
```

**3. 生产级安全防护**
- Guardrails 阻止危险操作（强制推送到主分支、删除敏感文件等）
- Hooks 在关键节点守卫（提交前检查 secrets、失败时清理 worktree）
- Git worktree 隔离开发，不影响主分支，失败即丢弃

**4. 可观测与成本控制**
- 实时追踪每个任务的 Token 消耗（LLM / API / 其他）
- 预算超限自动停止，避免意外成本爆炸
- 完整日志记录，可追溯执行全过程

### 9.2 业务价值

| 指标 | 目标 | 业务意义 |
|------|------|----------|
| 任务自动化率 | >80% | 大部分代码任务无需人工干预，提升开发效率 |
| 人工干预率 | <20% | 工程师专注于需要创造力的任务 |
| 单任务平均成本 | <$2 | 成本可控且可预测，便于预算规划 |
| 单任务平均执行时间 | <10 分钟 | 快速交付，缩短反馈周期 |
| 验证通过率 | >90% | 质量有保障，减少返工 |
| 平均修复次数 | <2 次 | 自动纠错有效，减少循环 |

**对比传统开发方式：**
- 传统：工程师编写 → 手动 Code Review → 修复 → 再 Review → 合并（平均 2-3 天）
- Harness：Agentic Loop → 自动验证 → 自动修复 → 草稿 PR 人工 Review（平均 <10 分钟）

### 9.3 技术收益

**可复用的模块化架构**

六大组件解耦，可独立升级扩展：
- Agentic Loop：可替换状态机策略
- Tool System：可新增自定义工具
- Context Manager：可切换压缩算法
- Guardrails/Hooks：插件化注册规则
- Session：可替换持久化后端（文件 → 数据库）

**配置驱动，无需改代码**

```yaml
# 新增一个 Guardrail 规则只需在配置中声明
guardrails:
  rules:
    - name: block-secret-access
      pattern: api_key|secret|password
      action: deny
```

**防御深度（Defense in Depth）**

多层防护，即使单层失效也有兜底：
```
用户意图
  → Guardrails（权限检查）
  → Hooks（操作守卫）
  → Superpowers（语义验证）
  → Archon（质量门禁）
  → 预算追踪（成本控制）
```

### 9.4 解决的痛点

| 痛点 | 传统问题 | Harness 解决方案 |
|------|----------|------------------|
| **跑了两天还在循环** | LLM 自循环无感知 | 状态机死锁检测 + 循环次数限制 + 总时间上限 |
| **一次调用几百万 tokens** | 上下文爆炸，成本失控 | Context Manager 压缩 + 相关性过滤 + Token 预算追踪 |
| **把主分支删了** | 危险操作无防护 | Guardrails 阻止 + Hooks 拦截 + worktree 隔离 |
| **生成的代码跑不通** | 质量不可控 | 双层验证（语义+质量）+ 结构化反馈 + 自动修复 |
| **这个月花了多少？** | 成本不透明 | Session 实时追踪 + 预算限制 + 超限停止 |
| **修复后引入新问题** | 修复无闭环 | 修复后必须重新验证，否则回退 |

### 9.5 组织收益

**降低对资深工程师的依赖**
- 普通工程师通过 OpenSpec 描述需求即可触发自动化
- 验证规则由团队配置，无需每次人工审查

**标准化代码质量**
- Superpowers 确保符合业务语义
- Archon 确保符合工程规范（覆盖率、复杂度、类型检查）
- 所有提交通过统一质量门禁

**可审计可追溯**
- 每个任务有完整 Session 记录（状态、成本、日志）
- 便于分析失败原因、优化配置、审计合规

### 9.6 长期价值

**可进化性**
- 新增验证器（如增加团队自定义 Linter）
- 新增工具（如集成部署流水线）
- 新增策略（如根据任务类型选择不同模型）

**知识沉淀**
- 成功的任务模式可沉淀为模板
- 失败案例可分析优化
- 团队最佳实践可编码为 Guardrails/Hooks

**规模化能力**
- 单任务成本低 → 支持批量处理
- 并行安全（worktree 隔离）→ 可并发执行
- 配置可复制 → 多项目快速部署

---

## 十、总结

本方案提供一个**完整的 Harness 体系构建蓝图**，涵盖：

1. **六大组件**全部实现：Agentic Loop、Tool System、Memory/Context、Guardrails、Hooks、Session
2. **完整控制闭环**：Inform → Constrain → Verify → Feedback → Correct
3. **工具协作**：GSD 2（编排） + Superpowers（语义验证） + Archon（质量 Gate）
4. **五大落地难题**全部解决：无限循环、上下文爆炸、权限失控、质量不可控、成本不透明

**核心理念：**
- 状态机驱动代替 LLM 自循环（确定性更高）
- 双层验证（语义 + 质量）
- 结构化反馈驱动自动纠错
- 防御深度（Guardrails + Hooks + 升级人工）

**下一步：**
建议按阶段 0 → 1 → 2 → 3 → 4 的顺序实施，每个阶段有清晰的交付物和验收标准。
