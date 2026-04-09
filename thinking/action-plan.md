# Harness Engineering 建设行动计划

> 基于 **Agent = Model + Harness** 核心理念，将 OpenSpec + Ralph 整合为完整的可治理运行时环境。

---

## 核心理念

**Harness Engineering** 是把项目从"用 AI 辅助编码"升级到"构建让 AI 代理可靠、自主工作的完整运行时环境"。

```
Agent = Model + Harness
━━━━━━━━━━━━━━━━━━━━━━━━━
Model: Claude/Codex 等大模型
Harness: 规格 + 反馈循环 + 工具集成 + 守卫栏 + 验证流程
```

---

## 现有基础

| 组件 | 职责 | 状态 |
|------|------|------|
| **OpenSpec** | 规格层：做什么 + 正确性定义 | ✅ 已内化 |
| **Ralph Loop** | 循环执行层：持续迭代直到完成 | ✅ 已内化 |

---

## 总体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Harness Engineering                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────┐     ┌─────────────┐                 │
│   │  OpenSpec   │────▶│  Ralph Loop │                 │
│   │  (Inform)   │     │  (执行层)   │                 │
│   └─────────────┘     └─────────────┘                 │
│          │                    │                       │
│          ▼                    ▼                       │
│   ┌─────────────┐     ┌─────────────┐                 │
│   │ 规格验证    │◀────│ 多代理审查  │                 │
│   │ (Constrain) │     │ (Verify)    │                 │
│   └─────────────┘     └─────────────┘                 │
│          │                    │                       │
│          ▼                    ▼                       │
│   ┌─────────────┐     ┌─────────────┐                 │
│   │ 失败反馈    │◀────│ 人类介入点  │                 │
│   │ (Feedback)  │     │ (L4 协同)   │                 │
│   └─────────────┘     └─────────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: 强化规格层（1-2 周）

### 目标
让 OpenSpec 成为"压缩记忆"和"持久上下文"，确保规格始终可验证。

### 步骤 1.1：确保仓库原生规格（3 天）

**具体行动**：
1. 将所有规格文档放在 `spec/` 目录下
2. 包含组件：
   - 详细任务分解 + 验收标准（可测试）
   - 架构决策记录（ADR）
   - 黄金测试套件（gold-standard tests）
   - 属性测试（property-based tests）

3. 添加机械化架构执行声明
   ```yaml
   # spec/conventions.yaml
   file_structure:
     - pattern: "src/{domain}/{entity}.ts"
       id_format: "kebab-case"
       naming: "PascalCase for entities"

   naming_conventions:
     - scope: "endpoints"
       format: "kebab-case"
     - scope: "database_fields"
       format: "snake_case"
   ```

**验收标准**：
- 所有规格文件在 `spec/` 目录
- 每个规格包含可测试的验收标准
- 架构约定文档化

---

### 步骤 1.2：Spec Linter（2 天）

**具体行动**：
1. 创建 `tools/spec-linter/` 目录
2. 选择验证框架：`spectral` (OpenAPI/AsyncAPI) 或 `ajv` (JSON Schema)
3. 编写核心规则：
   - 命名规范
   - 必填字段（description, responses）
   - 废弃检查

4. 集成到 CI
   ```yaml
   # .github/workflows/spec-lint.yml
   - name: Lint Spec
     run: npx spec-linter lint spec/
   ```

**验收标准**：
- 无效 Spec 能被拦截
- 返回错误位置（文件:行号）
- CI 失集时能看到具体原因

---

### 步骤 1.3：Pre-commit Spec 验证（2 天）

**具体行动**：
1. 安装 husky + lint-staged
2. 配置 `.husky/pre-commit`
   ```bash
   #!/bin/sh
   git diff --cached --name-only | grep -E '^spec/.*\.(yaml|yml|json)' | while read file; do
       npx spec-linter lint "$file"
   done
   ```

**验收标准**：
- 无效 Spec 无法提交
- 错误信息明确指向文件和行号

---

## Phase 1 验收

- [ ] 规格仓库原生化
- [ ] Spec Linter 拦截无效规格
- [ ] Pre-commit 阻止无效提交
- [ ] 机械架构约定文档化

---

## Phase 2: 构建 Ralph Loop 外层 Harness（2-3 周）

### 目标
为 Ralph Loop 添加多代理审查、验证守卫、上下文管理、工具权限控制。

### 步骤 2.1：集成多代理审查（5 天）

**具体行动**：
1. 定义代理角色
   ```yaml
   # ralph-personas.yaml
   personas:
     implementer:
       role: 写代码
       tools: [read, write, bash]
       constraints:
         - 只修改 spec 声明的模块
         - 遵循 naming conventions

     reviewer:
       role: 检查规格一致性
       tools: [read, grep]
       checks:
         - 规格 conformance
         - 测试通过
         - 自审查

     tester:
       role: 验证测试覆盖
       tools: [bash, grep]
       checks:
         - 单元测试
         - 集成测试
         - 属性测试
   ```

2. 实现审查流程
   ```
   Implementer 写代码
       ↓
   Reviewer 检查
       ↓ (不通过)
   Implementer 修改
       ↓
   Tester 验证
       ↓
   全部通过 → 退出循环
   ```

**验收标准**：
- 多代理协作工作流可用
- Reviewer 能发现规格偏离
- Tester 能验证测试覆盖

---

### 步骤 2.2：添加验证守卫（3 天）

**具体行动**：
1. 创建 PreCompletionChecklist
   ```javascript
   // tools/ralph-guards/pre-completion.js
   const checklist = [
     { name: "unit_tests", command: "npm test" },
     { name: "lint", command: "npm run lint" },
     { name: "spec_conformance", command: "npx spec-linter check" },
     { name: "self_verification", type: "agent_review" }
   ];

   async function runPreCompletionChecks() {
     const results = await Promise.all(
       checklist.map(check => runCheck(check))
     );
     return results.every(r => r.passed);
   }
   ```

2. 集成到 Ralph Loop
   ```bash
   # ralf loop 退出前
   if ! runPreCompletionChecks; then
     continue_loop
   fi
   ```

**验收标准**：
- 所有检查失败时继续循环
- 检查结果结构化记录

---

### 步骤 2.3：上下文管理（3 天）

**具体行动**：
1. 实现上下文压缩
   ```javascript
   // 定期总结历史决策
   function compactHistory(history) {
     return {
       summary: summarizeDecisions(history),
       recent: lastNItems(history, 10),
       spec_hash: getCurrentSpecHash()
     };
   }
   ```

2. 添加仓库嵌入技能
   ```bash
   # tools/scripts/deploy.sh
   # tools/scripts/test.sh
   # 代理可直接调用这些脚本
   ```

**验收标准**：
- 历史上下文能定期压缩
- 代理能调用仓库嵌入技能

---

### 步骤 2.4：工具与权限控制（2 天）

**具体行动**：
1. 定义有限工具集
   ```yaml
   # ralph-tools.yaml
   allowed_tools:
     - name: file_read
       scope: "src/, spec/"
     - name: file_write
       scope: "src/"
     - name: git_commit
       scope: "feature branches only"
     - name: run_tests
       timeout: 300s
   ```

2. 添加背压门
   ```javascript
   const constraints = {
     max_iterations: 10,
     token_budget: 100000,
     max_files_per_iteration: 5
   };

   function canContinue(iteration) {
     return iteration.count < constraints.max_iterations &&
            iteration.tokens < constraints.token_budget;
   }
   ```

**验收标准**：
- 代理无法操作受限文件
- 超出预算时自动停止循环

---

## Phase 2 验收

- [ ] 多代理审查工作流可用
- [ ] 验证守卫阻止不合格产出
- [ ] 上下文能正确压缩
- [ ] 工具权限受控

---

## Phase 3: 反馈与 Human-in-the-Loop 机制（2-3 周）

### 目标
构建可执行反馈系统，设置监控与干预点。

### 步骤 3.1：Diff 分析工具（4 天）

**具体行动**：
1. 创建 `tools/spec-diff/` 目录
2. 实现变更检测
   ```javascript
   // 输出结构化反馈
   {
     "failed_spec": "spec/v1/user-api.yaml",
     "field": "endpoint:/users/{id}",
     "expected": "GET method",
     "actual": "POST method",
     "file": "src/api/users.go:42",
     "suggestion": "将 POST 修改为 GET，或更新 Spec"
   }
   ```

3. 生成多格式报告（JSON, Markdown）

**验收标准**：
- 能识别所有破坏性变更
- 输出可执行的修复建议

---

### 步骤 3.2：Rollback 辅助（3 天）

**具体行动**：
1. 创建 `tools/rollback-helper/` 目录
2. 实现回滚计划生成
   ```javascript
   {
     steps: [
       { action: "git revert", commit: "abc123" },
       { action: "rerun_phspec", target: "spec/v1/user-api.yaml" }
     ]
   }
   ```

**验收标准**：
- 能生成可执行的回滚步骤
- 支持预览模式

---

### 步骤 3.3：监控与干预点（5 天）

**具体行动**：
1. 创建监控脚本
   ```bash
   # tools/monitor/ralph-status.sh
   - 显示循环状态
   - 显示最近 10 次决策
   - 显示 Token 消耗
   ```

2. 定义人类介入点
   ```yaml
   # ralph-intervention.yaml
   intervention_points:
     - trigger: "breaking_change_detected"
       action: "await_human_approval"
       notification: "slack"

     - trigger: "loop_stuck > 5 iterations"
       action: "await_human_review"

     - trigger: "validation_failed"
       action: "auto_retry_3_times"
       fallback: "await_human_review"
   ```

**验收标准**：
- 能监控 Ralph 运行状态
- 关键事件能升级到人工审批

---

## Phase 3 验收

- [ ] Diff 工具输出可执行反馈
- [ ] Rollback 能生成回滚计划
- [ ] 监控能显示运行状态
- [ ] 人类介入点正确触发

---

## Phase 4: 进阶 Harness 组件（3-4 周）

### 目标
添加持久化状态、评估 harness、错误恢复、可观察性。

### 步骤 4.1：变更血缘图（5 天）

**目标**：追踪 Spec → Code → Deploy 完整链路

**具体行动**：
1. 收集元数据
   ```json
   {
     "spec_id": "user-api-v1",
     "spec_hash": "abc123",
     "generated_files": [
       {
         "path": "src/api/users.go",
         "generator": "PhSpec"
       }
     ],
     "deployments": [
       { "env": "staging", "version": "1.2.3" }
     ]
   }
   ```

2. 生成可视化（mermaid.js / graphviz）

**验收标准**：
- 能显示 Spec 到代码的映射
- 能追踪部署状态

---

### 步骤 4.2：实现-Spec 对齐检测（5 天）

**目标**：验证代码是否偏离 Spec

**具体行动**：
1. 创建 `tools/spec-alignment/` 目录
2. 实现检测逻辑
   ```javascript
   {
     "missing_in_code": ["/api/users"],
     "extra_in_code": ["/api/legacy"]
   }
   ```

**验收标准**：
- 能检测代码中未被 Spec 定义的部分
- 能检测 Spec 中未被实现的部分

---

### 步骤 4.3：Spec 健康度看板（5 天）

**目标**：全局视图

**具体行动**：
1. 暴露 API：`/health`, `/coverage`, `/metrics`
2. 显示指标
   ```json
   {
     "coverage": { "percentage": 80 },
     "quality": { "valid_specs": 19 },
     "activity": { "breaking_changes": 2 }
   }
   ```

**验收标准**：
- 看板能显示覆盖率
- 能显示最近变更趋势

---

### 步骤 4.4：错误恢复与可观察性（5 天）

**具体行动**：
1. 添加 retry 机制
   ```javascript
   const retryPolicy = {
     max_attempts: 3,
     backoff: "exponential",
     on_failure: "auto_rollback"
   };
   ```

2. 记录所有代理决策
   ```json
   {
     "timestamp": "2026-04-09T10:00:00Z",
     "agent": "implementer",
     "action": "file_write",
     "context": { "reason": "..." }
   }
   ```

**验收标准**：
- 失败时自动回滚
- 所有决策可追溯

---

## Phase 4 验收

- [ ] 血缘图追踪完整链路
- [ ] 对齐检测发现不一致
- [ ] 健康度看板显示全局视图
- [ ] 错误能自动恢复

---

## Phase 5: 协同增强（3-4 周）

### 目标
增强人机协作能力。

### 步骤 5.1：Approve Gateway（7 天）

**具体行动**：
1. 实现审批策略
   ```javascript
   function requiresApproval(change) {
     if (change.is_breaking) return true;
     if (change.affects_security) return true;
     return false;
   }
   ```

2. 集成到 GitHub PR

**验收标准**：
- 破坏性变更触发审批
- 支持 GitHub PR 和 Slack 通知

---

### 步骤 5.2：Diff Review UI（10 天）

**具体行动**：
1. 创建 Web 端对比界面
   - 左右分屏显示新旧 Spec
   - 高亮差异
   - 支持评论

**验收标准**：
- 能可视化对比 Spec 差异
- 支持添加和保存评论

---

## Phase 5 验收

- [ ] Approve Gateway 阻止未授权变更
- [ ] Diff Review UI 支持对比和评论

---

## 总体验收标准

### 最小闭环（Phase 1 + Phase 2）
- [ ] Inform: OpenSpec 生成规格
- [ ] Constrain: Pre-commit 验证 + 工具权限控制
- [ ] Verify: Spec Linter + 多代理审查 + 验证守卫
- [ ] Feedback: Diff 工具输出可执行反馈
- [ ] Correct: Rollback 辅助 + 错误恢复

### 可观测增强（Phase 3 + Phase 4）
- [ ] 上下文管理：历史压缩
- [ ] 血缘图追踪完整链路
- [ ] 对齐检测发现不一致
- [ ] 健康度看板显示全局视图
- [ ] 监控与干预点可用

### 协同增强（Phase 5）
- [ ] Approve Gateway 管理审批
- [ ] Diff Review UI 支持评审

---

## 技术栈推荐

| 工具类型 | 技术选型 | 原因 |
|---------|---------|------|
| Spec 验证 | spectral | OpenAPI/AsyncAPI 专项支持 |
| Git 集成 | simple-git | 轻量级 Git 操作 |
| CI 集成 | GitHub Actions | 与现有 CI 无缝集成 |
| 可视化 | mermaid.js | 文本转图表，易于维护 |
| Web 框架 | Express + React | 成熟稳定 |
| 数据存储 | SQLite | 轻量级，无需额外服务 |
| Ralph Loop | ralph-orchestrator | Rust 版，更强协调 |

---

## 实践建议

### 起步小
先在一个小功能上实验：
```
OpenSpec 写规格 → Ralph Loop → 观察失败点 → 添加 harness 守卫
```

### 测量成功
- 代理自主完成任务比例
- Token 效率
- 最终人工修复量

### 常见问题解决

| 问题 | 解决方案 |
|------|---------|
| 代理"忘记"过去规格 | 规格始终在上下文顶部 + 定期总结 |
| 循环卡住 | 添加 token/时间预算 + 人类逃生口 |
| 质量不稳 | 加强独立 reviewer + 测试 harness |

---

## 参考资源

- OpenAI: 《Harness engineering: leveraging Codex in an agent-first world》
- Geoffrey Huntley: Ralph Wiggum 文章
- Anthropic: long-running agent harness 指南
- 社区 repo: snarktank/ralph, deusyu/harness-engineering
