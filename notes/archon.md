# Archon 与 Harness Engineering 体系构建分析

> 评估 Archon (https://github.com/coleam00/Archon) 在现有 OpenSpec + Ralph Loop 工具栈中的定位与整合方案

---

## 背景与现状

### 现有工具栈

| 工具 | 定位 | 职责 | 状态 |
|------|------|------|------|
| **OpenSpec** | 规格层 (Inform + Constrain) | 生成 proposal、specs、tasks；维护 living spec | ✅ 已内化 |
| **Ralph Loop** | 循环执行层 (Verify + Feedback + Correct) | 自动扫描 changes 目录；并发执行 + 失败重试 | ✅ 已内化 |

### 现有架构

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

## Archon 能力评估

### 什么是 Archon？

Archon 是一个 **AI Coding Harness Builder**（AI 编程工作流/马具构建器），专注于把 AI 编码过程变成**可重复、可控、工程化的 YAML �**作流**。

### 核心能力

| 能力 | 说明 | 价值 |
|------|------|------|
| **YAML-based workflows** | 通过 YAML 定义工作流节点和连接 | 版本控制、可复用、易于调试 |
| **Multi-node orchestration** | 支持串行、并行、条件分支 | 灵活编排复杂流程 |
| **AI 节点** | 调用 Claude/GPT 等 LLM 生成内容 | 利用 AI 能力自动化任务 |
| **确定性节点** | Bash、文件操作等确定性步骤 | 提供可靠的执行保障 |
| **Human gates** | 人工审核/批准节点 | 保留人类控制权 |
| **Git worktree isolation** | 每个工作流在独立环境执行 | 不污染主分支，安全隔离 |
| **Auto-retry loops** | 失败自动重试机制 | 提高成功率 |
| **Multi-agent review** | 多个 AI 审查者并行审查 | 增强质量保障 |
| **内置模板** | `archon-idea-to-pr`、`archon-piv-loop` 等 | 快速启动常见场景 |

### 内置工作流示例

1. **archon-idea-to-pr**：从想法到 PR 的完整流程
2. **archon-fix-github-issue**：自动修复 GitHub issue
3. **archon-piv-loop**：Plan-Implement-Validate 迭代循环

---

## 整合分析

### 能力匹配度

| Harness 核心需求 | OpenSpec | Ralph Loop | Archon | 整合方案 |
|------------------|----------|------------|--------|----------|
| 规格生成与对齐 | ✅ 主要 | ❌ | ⚠️ 辅助 | OpenSpec 主导 |
| 规格验证与约束 | ✅ | ✅ | ⚠️ | OpenSpec + Linter |
| 自动执行循环 | ❌ | ✅ 主要 | ✅ | Archon 增强 |
| 工作流编排 | ❌ | ⚠️ 简单 | ✅ 主要 | Archon 主导 |
| 多智能体协调 | ❌ | ⚠️ | ✅ | Archon 增强 |
| 反馈闭环 | ✅ | ✅ 主要 | ✅ | Archon 增强 |
| 上下文隔离 | ❌ | ⚠️ | ✅ | Archon 补充 |
| 人机协作 | ✅ | ⚠️ | ✅ | Archon 增强 |
| 可重复执行 | ❌ | ✅ | ✅ | Archon 版本化 |

### 三者定位关系

```
┌─────────────────────────────────────────────────────────────────┐
│                    Harness Engineering 完整体系                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────┐        ┌──────────────────┐             │
│   │   OpenSpec       │        │     Archon       │             │
│   │   规格生成与对齐  │◀──────▶│  结构化工作流编排 │             │
│   │  (Inform/Constrain)│     │    (Orchestrate)  │             │
│   └──────────────────┘        └──────────────────┘             │
│          │                            │                        │
│          ▼                            ▼                        │
│   ┌──────────────────────────────────────────────┐             │
│   │              Ralph Loop                      │             │
│   │         循环执行与自动重试                     │             │
│   │        (Verify/Feedback/Correct)              │             │
│   └──────────────────────────────────────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 工作分工

**OpenSpec 继续：**
- 生成高质量的 proposal、specs、tasks
- 维护 living spec 作为单一事实来源
- 先对齐规范再构建

**Ralph Loop 继续：**
- 在已有 OpenSpec changes 的基础上自动执行
- 并发处理 + 失败重试
- 作为执行层的核心引擎

**Archon 新增：**
- 提供结构化的 YAML 工作流定义
- 编排 OpenSpec → Ralph Loop → PR 的完整流程
- 增强多智能体协调与审查
- 提供更强的上下文隔离与人机协作机制

---

## 整合方案设计

### 目录结构调整

```
harness_engineering/
├── projects/
│   └── example-project/
│       ├── README.md
│       ├── openspec/              # OpenSpec 生成的规范
│       │   └── changes/
│       ├── archon/                # Archon 工作流定义
│       │   ├── openspec-driven-implementation.yaml
│       │   ├── multi-agent-review.yaml
│       │   └── piv-loop.yaml
│       ├── src/
│       └── feedback/
├── tools/
│   ├── archon/                   # Archon 配置与模板
│   │   ├── workflows/
│   │   ├── guards/
│   │   └── personas/
├── templates/
│   └── archon/                   # 可复用 workflow 模板
```

### 示例工作流：OpenSpec Driven Implementation

```yaml
# archon/openspec-driven-implementation.yaml
name: OpenSpec Driven Implementation
description: 基于已批准的 OpenSpec proposal 实现功能，使用 Ralph Loop 执行

env:
  model: claude-opus-4-6
  worktree: .claude/worktrees/implementation

workflow:
  # 1. 读取 OpenSpec proposal
  - name: read-openspec-proposal
    type: file
    path: ./openspec/changes/latest/proposal.md

  # 2. 详细规划实现步骤
  - name: plan-implementation
    type: ai
    model: ${env.model}
    prompt: |
      Based on the OpenSpec proposal above, create a detailed implementation
      plan that follows the Ralph Loop pattern. Break down into specific,
      actionable tasks.

  # 3. 使用 Ralph Loop 执行
  - name: ralph-loop-execute
    type: bash
    command: |
      cd ${env.worktree}
      npx phspec-auto-apply run

  # 4. 运行测试
  - name: run-tests
    type: bash
    command: npm test
    retry: 3

  # 5. 多智能体审查
  - name: multi-agent-review
    type: parallel
    nodes:
      - name: claude-review
        type: ai
        model: claude-sonnet-4-6
        prompt: Review the implementation against the OpenSpec spec
      - name: gpt-review
        type: ai
        model: gpt-4
        prompt: Check for security issues and best practices

  # 6. 人工审核
  - name: human-review
    type: human
    message: Please review the implementation and approve or reject

  # 7. 创建 PR
  - name: create-pr
    type: bash
    command: |
      gh pr create \
        --title "Implement: $(cat ./openspec/changes/latest/title)" \
        --body "$(cat ./openspec/changes/latest/proposal.md)" \
        --base main
```

### 示例工作流：PIV Loop (Plan-Implement-Validate)

```yaml
# archon/piv-loop.yaml
name: Plan-Implement-Validate Loop
description: 迭代式开发循环，结合 OpenSpec 和 Ralph Loop

env:
  max_iterations: 5
  model: claude-opus-4-6

workflow:
  - name: piv-loop
    type: loop
    max_iterations: ${env.max_iterations}
    nodes:
      # Plan: 基于规格生成实现计划
      - name: plan
        type: ai
        model: ${env.model}
        prompt: |
          Generate an implementation plan based on the OpenSpec spec.
          Consider the feedback from previous iterations.

      # Implement: 使用 Ralph Loop 执行
      - name: implement
        type: bash
        command: npx phspec-auto-apply run --target=${plan.output}

      # Validate: 多维度验证
      - name: validate
        type: parallel
        nodes:
          - name: tests
            type: bash
            command: npm test
          - name: lint
            type: bash
            command: npm run lint
          - name: spec-check
            type: ai
            model: ${env.model}
            prompt: Verify the implementation matches the OpenSpec spec

      # 判断是否继续循环
      - name: continue-check
        type: condition
        condition: ${validate.results} != "all_passed"
```

---

## 整合带来的收益

### 1. 架构清晰化

- **OpenSpec** → 确保规格正确
- **Ralph Loop** → 确保执行高效
- **Archon** → 确保流程可控

### 2. 从"规划好但执行不稳"到"规划+执行都工程化"

| 维度 | 整合前 | 整合后 |
|------|--------|--------|
| 规格质量 | OpenSpec 保证 | OpenSpec 保证 |
| 执行可靠性 | Ralph Loop + 手动 | Archon编排 + 自动重试 |
| 流程可见性 | 部分可见 | YAML 可读 + 日志完整 |
| 调试能力 | 较弱 | 可单步执行、断点调试 |
| 团队协作 | 松散 | 标准化工作流 |

### 3. 减少手动干预

- OpenSpec 提供 approval gate
- Archon 提供 human review gate
- Archon 提供自动验证循环
- 失败时自动修复或重试

### 4. 更适合中大型项目

- 工作流版本化管理
- 可复用的模板库
- 标准化的团队协作流程
- 清晰的权限和审批链路

### 5. 互补覆盖全流程

```
OpenSpec (规划层) → Archon (编排层) → Ralph Loop (执行层)
```

---

## 潜在挑战与建议

### 挑战

| 挑战 | 风险 | 建议方案 |
|------|------|----------|
| 需要定制 Archon workflow | 耗时 | 从内置模板开始，逐步定制 |
| 三个工具的集成复杂度 | 学习成本 | 小范围实验，积累经验后再推广 |
| 运行成本可能较高 | Token 费用 | 在 `feedback/` 中记录用量，优化 prompt |
| 生态相对较新 | 稳定性风险 | 逐步迁移，保留回退方案 |
| 团队学习曲线 | 采用意愿 | 提供培训文档和示例项目 |

### 立即行动建议

#### Phase 1: 环境准备（3-5 天）

1. **安装 Archon**
   ```bash
   # 具体安装方式待确认（参考 Archon 文档）
   ```

2. **创建目录结构**
   ```bash
   mkdir -p tools/archon/{workflows,guards,personas}
   mkdir -p templates/archon
   ```

3. **创建第一个 workflow**
   - 复制或基于 `archon-idea-to-pr` 模板
   - 修改为整合 OpenSpec 的流程

#### Phase 2: 小范围实验（1-2 周）

1. **选择一个小项目或功能**
   - 确保有完整的 OpenSpec spec
   - 准备测试环境

2. **完整跑通流程**
   - OpenSpec 生成 proposal
   - Archon workflow 驱动执行
   - Ralph Loop 完成实现
   - 生成 PR 并审核

3. **记录踩坑经验**
   - 在 `notes/` 中创建 `archon-integration-lessons.md`
   - 记录配置问题、运行错误、调优点

#### Phase 3: 沉淀模板（1 周）

1. **提取可复用部分**
   - 在 `templates/archon/` 中沉淀通用 workflow
   - 创建项目级模板

2. **文档化最佳实践**
   - 编写使用指南
   - 创建示例项目

#### Phase 4: 团队推广（持续）

1. **培训与分享**
   - 内部技术分享
   - 编写使用手册

2. **持续优化**
   - 收集团队反馈
   - 迭代 workflow 设计

---

## 总结

### 核心结论

**Archon 非常适合整合到现有的 OpenSpec + Ralph Loop 工具栈中**，形成完整的 Harness Engineering 体系。

### 三者协同的价值

| 组合 | 价值 |
|------|------|
| OpenSpec + Ralph | 规格 + 执行，但流程松散 |
| OpenSpec + Archon | 规格 + 编排，但缺少专门执行引擎 |
| Ralph + Archon | 执行 + 编排，但缺少规范化对齐 |
| **三者结合** | **完整覆盖规划、编排、执行、反馈全链路** |

### 推荐的渐进式路径

```
当前状态（OpenSpec + Ralph）
    ↓
[Phase 1] 安装 Archon，创建目录结构
    ↓
[Phase 2] 小范围实验，跑通完整流程
    ↓
[Phase 3] 沉淀模板，文档化经验
    ↓
[Phase 4] 团队推广，持续优化
```

### 最终愿景

一个可工程化、可复制、可治理的 AI 驱动开发体系：

- **规格先行**：OpenSpec 确保所有变更都有清晰规范
- **流程可控**：Archon 编排工作流，提供可见性和可控性
- **执行高效**：Ralph Loop 自动执行，减少人工干预
- **质量保障**：多智能体审查 + 自动验证 + 人工审核
- **持续改进**：结构化反馈 + 模板沉淀 + 最佳实践积累

---

## 参考资源

- OpenSpec: https://github.com/Fission-AI/OpenSpec
- Archon: https://github.com/coleam00/Archon
- OpenAI Harness Engineering: https://openai.com/index/harness-engineering/
- Anthropic Harness Design: https://www.anthropic.com/engineering/harness-design-long-running-apps
