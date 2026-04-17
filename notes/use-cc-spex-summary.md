# cc-spex 项目体验分析总结

## 项目概览

首先形态上，**cc-spex** 是一个 **Claude Code 插件**：用于扩展 Spec-Kit，实现 **规范驱动开发（Specification-Driven Development）**。

**核心理念：** 规格是唯一真实来源（Specs as Single Source of Truth）

---

## 架构组成

| 组件 | 来源 | 作用 |
|------|------|------|
| **Superpowers** | 外部插件（Jesse Vincent） | TDD 纪律、系统化调试、反合理化模式 |
| **Spec-Kit** | 外部工具（GitHub） | 规范工作流：模板、结构化产物、`specify` CLI |
| **cc-spex** | 本项目 | 规格优先执行、合规性评分、漂移检测、进化工作流 |

---

## 核心创新：Traits 系统

### 定义

**可组合的横向功能注入**（类似面向切面编程 AOP）

每个 Trait 通过 `.append.md` 文件向 Spec-Kit 命令注入行为，使用 HTML 注释标记防止重复应用。

### 可用 Traits

| Trait | 功能 | 依赖 |
|-------|------|------|
| `superpowers` | 质量门控（自动规格审查、计划审查、代码审查）| - |
| `deep-review` | 5 角度代码审查 + 自动修复 | `superpowers` |
| `teams` | 并行执行（实验性） | `superpowers` |
| `worktrees` | Git worktree 隔离开发 | - |

### 工作原理

```
启用 trait
   ↓
查找 overlays/<trait>/
   ↓
将 overlay 内容追加到目标文件（.claude/skills/.../SKILL.md）
   ↓
标记：<!-- SPEX-TRAIT:<trait> -->
   ↓
幂等性：下次应用前检测标记，防止重复
```

---

## 与外部 Superpowers 的关系

### 两个独立的 "superpowers"

| | cc-spex 的 `superpowers` trait | 外部 Superpowers 插件 |
|------|-------------------------------|----------------------|
| **来源** | cc-spex 内置 | Jesse Vincent 的独立插件 |
| **安装** | `/spex:traits enable superpowers` | `/plugin install superpowers@claude-plugins-official` |
| **依赖关系** | 不依赖外部插件 | 不依赖 cc-spex |

### 关系说明

cc-spex **吸收**（absorbs）了外部 Superpowers 的质量门控理念，但**没有打包**那些独立的 skills。

| 各自提供什么 |
|------|--------|
| **cc-spex 的 `superpowers` trait** | - 自动规格审查（`/speckit-specify` 后）<br>- 自动计划审查（`/speckit-plan` 前/后）<br>- 代码审查 + 验证门控（`/speckit-implement` 后）|
| **外部 Superpowers 插件** | - `test-driven-development` - 严格的 RED-GREEN-REFACTOR<br>- `systematic-debugging` - 4 阶段根因分析<br>- `brainstorming`, `writing-plans` 等 |

### 协同作用

它们可以一起使用：
- cc-spex 提供规范驱动的质量门控
- 外部 Superpowers 提供 TDD 纪律和调试技能
- 两者互补，不冲突

---

## spex/.superpowers-sync 文件

### 核心目的

**同步记录文档 - 记录 cc-spex 如何吸收和改造外部 Superpowers 插件的内容**

这是一个**"改造日志"**或**"集成追踪"**文件，说明 cc-spex 不是直接使用外部 superpowers 插件，而是**选择性吸收**其技能和模式。

### 使用者

**cc-spex 插件维护者（Plugin Maintainers）**

当外部 superpowers 更新时，维护者运行 `/update-superpowers` 命令来同步变更。

### Skills 分类

| 分类 | Skills | 说明 |
|------|--------|------|
| `modified_skills` | writing-plans, review-code, verification, brainstorm | 从上游改造 |
| `new_spex_skills` | implement, evolve, review-spec, review-plan, ship 等 | cc-spex 原创 |
| `companion_skills` | test-driven-development, systematic-debugging | 需单独安装外部插件 |

---

## 核心脚本

### spex-init.sh

| 函数 | 作用 |
|------|------|
| `check_version()` | 检查 specify CLI 版本 ≥ 0.5.0 |
| `check_ready()` | 快速检查：specify 是否已安装、项目是否已初始化 |
| `do_init()` | 完整初始化流程 |
| `apply_traits()` | 应用已配置的 traits |

### spex-traits.sh

| 函数 | 作用 |
|------|------|
| `do_apply()` | 应用所有启用 traits 的覆盖 |
| `resolve_overlay_target()` | 将覆盖路径映射到目标文件 |
| `apply_prepend()` | 在 YAML frontmatter 后插入内容 |
| `ensure_agent_teams_env()` | 设置 agent teams 环境变量 |
| `do_permissions()` | 管理权限自动审批 |

---

## 工作流程

### 分阶段模式

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│  IDEA    │ ──▶ │  SPEC    │ ──▶ │  PLAN    │
└──────────┘      └──────────┘      └──────────┘
                      │                   │
                      ▼                   ▼
              ┌──────────┐          ┌──────────┐
              │ REVIEW   │          │ IMPLEMENT │
              └──────────┘          └──────────┘
                      │                   │
                      ▼                   ▼
              ┌──────────┐          ┌──────────┐
              │ COMPLETE │ ◀──────── │  VERIFY  │
              └──────────┘          └──────────┘
                                           ▲
                                    ┌──────┴─────┐
                                    │   EVOLVE   │
                                    └────────────┘
```

### 一键式模式

`/spex:ship` 自动运行 9 个阶段：
1. specify → 2. clarify → 3. review-spec → 4. plan → 5. tasks → 6. review-plan → 7. implement → 8. review-code → 9. stamp

---

## 命令参考

### Spec-Kit 命令（被 cc-spex 增强）

| 命令 | 增强（启用 superpowers trait 时）|
|------|-----------------------------------|
| `/speckit-specify` | 自动规格审查 |
| `/speckit-plan` | 计划前后验证、自动创建 PR |
| `/speckit-implement` | 代码审查、验证门控 |

### cc-spex 新增命令

| 命令 | 功能 |
|------|------|
| `/spex:init` | 项目初始化 |
| `/spex:brainstorm` | 头脑风暴（想法 → 规格）|
| `/spex:evolve` | 规格/代码漂移处理 |
| `/spex:review-spec` | 规格审查 |
| `/spex:review-plan` | 计划审查 |
| `/spex:review-code` | 代码审查 |
| `/spex:ship` | 一键式完整流程（9 阶段）|
| `/spex:stamp` | 最终门控 |
| `/spex:deep-review` | 5 角度深度审查 |
| `/spex:worktree` | worktree 管理 |
| `/spex:traits` | traits 管理 |
| `/spex:help` | 帮助 |

---

## /spex:stamp 检查

### 检查的 6 大步骤

| 步骤 | 检查内容 | 失败后果 |
|------|---------|---------|
| **1. 运行测试** | 所有测试通过、覆盖足够 | ❌ 修复测试，不继续 |
| **2. 代码卫生审查** | 死代码、参数使用、拷贝安全、引用清理 | ❌ 修复机械缺陷，不继续 |
| **3. 验证规格合规性** | 所有需求已实现、已测试、行为匹配 | ❌ 用 `spex:evolve` 求解 |
| **4. 检测规格漂移** | 规格与代码一致，无分歧 | ❌ 用 `spex:evolve` 求解 |
| **5. 验证成功标准** | 规格中的所有验收标准已满足 | ❌ 实现缺失部分 |
| **6. 通过/不通过决策** | 所有 5 项都通过 | ❌ 继续不完成 |

### 核心原则

**"证据优于断言"（Evidence Before Claims, Always）**

- 不运行验证就不能声称完成
- 不跳过任何步骤
- 不"想当然"认为通过
- 失败即信息：发现 Bug、遗漏功能、漂移

---

## 目录结构

```
cc-spex/
├── .claude-plugin/              # 插件市场配置
├── .specify/                   # Spec-Kit 集成脚本和模板
├── spex/                       # 核心插件代码
│   ├── .claude/commands/         # spex 命令定义
│   ├── commands/                 # 用户可见命令（.md 格式）
│   ├── docs/                    # 文档
│   ├── overlays/                 # Traits 覆盖文件
│   ├── scripts/                 # 核心 Shell 脚本
│   └── skills/                  # Skills 实现
├── specs/                       # 功能规格历史记录
├── brainstorm/                   # 项目开发历史和决策记录（作者用）
└── tests/                       # 测试
```

---

## 作者设计思路总结

### 1. Traits 系统 - 可组合扩展

通过可组合的 traits 来控制功能，而不是硬编码。

### 2. Overlay 机制 - 非侵入式扩展

通过追加内容到现有文件来扩展功能，而不是修改源代码。

### 3. 幂等性保证 - 标记机制

使用 HTML 注释标记来防止重复应用，使操作可安全重试。

### 4. 选择性吸收上游设计而非简单复制

参考外部 Superpowers 的设计理念，但选择性吸收模式，而不是直接复制代码。

### 5. 职责清晰分离 - 配置、控制、实现分层

将配置、控制逻辑和具体实现分层。

### 6. 同步状态追踪 - 文档化集成过程

使用 `.superpowers-sync` 文件记录与上游的同步状态。

### 7. 开发过程文档化 - brainstorm 目录

保留开发过程中的思考记录。

### 8. 一键式全流程 - ship 命令

提供完整的自动化流程，同时保留阶段式的手动选项。

### 9. 状态行显示 - 实时反馈

配置为 Claude Code 的状态行，用户实时看到进度。

### 10. 迁移处理策略

主动处理版本升级和数据迁移。

### 11. 权限分级 - 渐进式开放

提供 none/standard/yolo 三级权限控制。

### 12. 依赖管理 - 自动解析

`teams` trait 自动启用 `superpowers` 作为依赖。

---

## 核心总结

1. **在 Spec-Kit 基础上扩展** - 不修改 Spec-Kit 源代码，通过 traits 注入功能
2. **Traits 控制扩展** - 通过 `.specify/spex-traits.json` 配置哪些节点被扩展
3. **Overlay 机制** - 通过追加方式注入内容，使用 HTML 注释标记保证幂等性
4. **Skills 实现** - 扩展的具体实现来自 cc-spex 原创或从 superpowers 同步
5. **选择性吸收** - 参考外部 superpowers 的设计理念，但有自己的实现路径
6. **规范化验证** - 强制规格优先，代码必须符合规格才能通过审查
7. **流程控制依赖 Spec-Kit** - 底层还是依赖 Spec-Kit 的命令，cc-spex 在此基础上做增强
