# Archon

AI 编程工作流构建器。

## 简介

Archon 通过 YAML 文件定义可重复、可控的 AI 编码流程。

网站：https://archon.diy/
仓库：https://github.com/coleam00/Archon

## 核心功能

- 📝 **YAML 工作流定义**：结构化、版本可控
- 🤖 **AI 节点**：调用 Claude/GPT 等 LLM
- 🛠️ **确定性节点**：Bash、文件操作
- 🔄 **循环与重试**：自动迭代直到成功
- 👥 **多智能体协调**：并行审查、分工协作
- 🔒 **隔离执行**：Git worktree 隔离，不污染主分支
- ✋ **人工审核点**：关键步骤需人工确认

## 文档

- [离线安装指南](./installation.md) - 针对 Windows 环境的完整安装方案

## 与 Harness 集成

在 Harness 体系中，Archon 作为**质量门禁**验证层：

1. **执行阶段**：Archon 工作流执行代码生成和测试
2. **验证阶段**：通过 Archon 的质量 gate 验证代码质量
3. **反馈阶段**：结构化的质量反馈驱动自动修复

## 快速示例

```yaml
name: Code Quality Check

workflow:
  - name: generate-code
    type: ai
    model: claude-opus-4-6
    prompt: "根据 OpenSpec spec 生成代码"

  - name: run-tests
    type: bash
    command: npm test
    retry: 3

  - name: security-check
    type: bash
    command: npm run security
```
