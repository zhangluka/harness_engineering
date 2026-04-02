# OpenAI vs Anthropic：Harness Engineering 理解对比分析

## 背景

本文对比分析两篇 Harness Engineering 的核心工程博客：

- **OpenAI**: Harness Engineering (2026年2月)
- **Anthropic**: Harness design for long-running apps (2026年3月)

两篇文章代表了 AI 巨头对「如何让 AI 智能体可靠完成软件工程工作」这一问题的不同视角和实践。

---

## 核心理念对比

### 1. 核心隐喻

| 维度 | OpenAI | Anthropic |
|------|--------|-----------|
| **隐喻** | 人类掌舵，智能体执行 | GAN（生成器-判别器）模式 |
| **工程师角色** | 设计环境、明确意图、构建反馈回路 | 设计与调优 harness（缰绳） |
| **产出** | 约束系统（AGENTS.md、规则、linter） | 多智能体协作架构 |

### 2. 架构设计

**OpenAI 的做法：**
- 单智能体（Codex）为主
- 通过 AGENTS.md、文档、linter 传递意图
- 人类在环（审核 PR、反馈）
- 逐步实现端到端自动化

**Anthropic 的做法：**
- 三智能体架构：Planner → Generator → Evaluator
- 显式的评价与反馈循环
- Sprint 合约机制
- 逐步简化 harness 以适应模型进化

---

## 关键概念对比

### Context 管理

| 问题 | OpenAI | Anthropic |
|------|--------|-----------|
| 上下文溢出 | 渐进式披露、地图式文档 | Context reset（重置）vs Compaction（压缩） |
| Context Anxiety | 未明确提及 | 明确提出：模型接近上下文限制时提前收尾 |
| 解决方案 | 精简 AGENTS.md，结构化 docs/ | Context reset + 结构化 artifact |

### 评价与反馈

| 问题 | OpenAI | Anthropic |
|------|--------|-----------|
| 自我评价 | 依赖人工审核 + Agent 审核 | 分离 Generator 与 Evaluator |
| 主观质量 | 文档规范 + linter | 量化评分标准（设计质量、原创性、工艺、功能性） |
| 反馈循环 | PR 审核流程（Ralph Wiggum 循环） | GAN 风格迭代（5-15轮） |

### 执行模式

| 问题 | OpenAI | Anthropic |
|------|--------|-----------|
| 任务分解 | 深度优先，拆解为小模块 | Sprint 机制（每个 sprint 谈判合约） |
| 自动化程度 | 从人工审核到 Agent 审核 | Planner 自动扩写 spec，Evaluator 自动 QA |
| 错误处理 | 重跑 + 修复循环 | 迭代修复直到 Evaluator 通过 |

---

## 共同点

1. **文档是基础设施** — 两家都强调结构化文档的重要性
2. **渐进式披露** — 不给智能体一次性灌输所有信息
3. **反馈循环不可或缺** — 没有闭环的 agent 走不远
4. **模型会进化** — Harness 需要随模型能力调整（Anthropic 明确提出）
5. **成本意识** — 两者都关注 token 成本与运行时间

---

## 差异点

| 维度 | OpenAI | Anthropic |
|------|--------|-----------|
| **复杂度** | 偏向极简 harness，靠规则驱动 | 主动增加架构复杂度（多 agent） |
| **评价体系** | 依赖外部（人工/其他 Agent） | 独立的 Evaluator agent |
| **任务粒度** | 小任务快速交付 | 大任务多轮迭代 |
| **自动化路径** | 从人工到 Agent 逐步移交 | 一开始就设计高自动化架构 |
| **模型适配** | 隐式提及 | 显式强调（4.5 → 4.6 简化 harness） |

---

## 我们的总结

### 1. 本质共识

Harness Engineering 的核心问题是：**如何让 AI 智能体可靠地完成复杂软件工程任务**。

两篇文章都同意：
- 单纯的 prompt engineering 不够
- 需要结构化的约束系统
- 反馈闭环是关键
- 人的角色从「写代码」变成「设计系统」

### 2. 路径差异

| | OpenAI 路径 | Anthropic 路径 |
|--|-------------|----------------|
| **哲学** | 约束驱动（Rules First） | 架构驱动（Architecture First） |
| **复杂度** | 自下而上：从小规则累积 | 自上而下：从架构设计入手 |
| **评价** | 依赖外部（人工/其他 Agent） | 内建评价（独立 Evaluator） |
| **演进** | 逐步增加自动化 | 逐步简化复杂度 |

### 3. 落地启示

对于实战项目，我们的建议是：

1. **从小处着手** — 先用简单 harness 验证，再逐步加架构
2. **评价先行** — 尽早建立可量化的质量标准
3. **模型适配** — 定期评估 harness 复杂度是否匹配当前模型能力
4. **成本意识** — harness 成本可能远超单次运行（Anthropic 示例：$200 vs $9）
5. **渐进披露** — 不要把所有规则塞进 AGENTS.md

### 4. 核心矛盾

两篇文章暴露了一个核心张力：

- **OpenAI** 倾向于 **minimal harness**：越少越好，靠模型能力
- **Anthropic** 倾向于 **structured harness**：架构化设计，主动增加复杂度

这个矛盾没有绝对答案，取决于：
- 任务复杂度
- 模型能力
- 成本约束
- 质量要求

---

## 参考

### OpenAI

- [Harness Engineering](https://openai.com/index/harness-engineering/)

### Anthropic

- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [How We Built Our Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps)