# 工具

Harness 工程体系中的核心工具集。

## 核心工具

### [Harness Development](./harness-development/index.md)

Harness 体系完整构建方案，涵盖六大组件设计：

- Agentic Loop (GSD 2)
- Tool System
- Memory & Context Management
- Guardrails
- Hooks
- Session

### [OpenSpec](./openspec.md)

基于 OpenSpec 开源项目的 SDD (Spec-Driven Development) 工具。

- 定位：Spec-driven development for AI coding assistants
- 特点：无需 API Key、支持 Brownfield 开发、轻量级工作流

### [Ralph Loop](./ralph-loop.md)

结合内化 PhSpec 的 Ralph 自动化执行工具。

- 定位：PhSpec 变更自动应用工具
- 功能：自动扫描、智能识别、并发执行、断点续传

### [Archon](./archon/)

AI 编程工作流构建器。

- 核心：YAML 工作流定义、AI 节点、隔离执行
- 在 Harness 中作为质量门禁验证层
- [离线安装指南](./archon/installation.md)

## 工具协作关系

```
OpenSpec (Spec 定义)
    ↓
GSD 2 (编排层)
    ↓
Tool System (执行层)
    ↓
Ralph Loop (变更应用)
    ↓
Archon (质量门禁)
    ↓
Superpowers (语义验证)
```

## 快速导航

- [完整方案](./harness-development/index.md) - Harness 体系构建蓝图
- [OpenSpec](./openspec.md) - 规范驱动开发
- [Ralph Loop](./ralph-loop.md) - 自动变更执行
- [Archon](./archon/) - 工作流构建器
