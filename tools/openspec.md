# OpenSpec

基于 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 开源项目内化的 SDD (Spec-Driven Development) 工具。

## 定位

Spec-driven development for AI coding assistants

## 源码

- **内化版本**: `/Users/bobby/Projects/Github/zhangluka/OpenSpec/openspec_cs`
- **开源项目**: https://github.com/Fission-AI/OpenSpec

## 核心特点

- **无需 API Key**：本地运行，无外部依赖
- **支持 Brownfield（棕地）开发**：可适应现有代码库
- **轻量级工作流**：简洁高效的开发流程
- **跨平台支持**：macOS、Linux、Windows
- **灵活而非僵化**：不强制固定工作流

## 核心命令

| 命令 | 功能 | 说明 |
|------|------|------|
| `/phsx:verify` | 基础验证 | 检查规格与实现的一致性 |
| `/phsx:review-spec` | 规格审查 | 检查规格的完整性、清晰度、可实施性 |
| `/phsx:review-code` | 代码审查 | 验证代码实现与规格的一致性 |
| `/phsx:review-design` | 设计审查 | 检查设计方案与规格的关联性 |

## 变更管理

OpenSpec 采用结构化的变更管理流程，每个变更包含完整的文档：

```
changes/
├── <change-id>/
│   ├── .openspec.yaml   # 变更配置
│   ├── proposal.md      # 变更提案
│   ├── design.md        # 设计文档
│   ├── tasks.md         # 任务清单
│   └── specs/           # 规格文档
│       ├── <artifact-1>/
│       ├── <artifact-2>/
│       └── ...
```

### 变更文档说明

**`.openspec.yaml`**
- 变更元数据和配置
- 变更名称、描述、类型等

**`proposal.md`**
- 变更提案文档
- 包含：Why、What Changes、Capabilities、Impact、技术决策

**`design.md`**
- 详细设计文档
- 包含：Context、Goals/Non-Goals、Decisions、Risks/Trade-offs、Migration Plan

**`tasks.md`**
- 任务清单和实现跟踪
- 按功能模块分组
- 使用 checkbox 标记完成状态

**`specs/`**
- 各制品的规格文档
- 每个制品一个目录
- 使用 Spec-Kit 格式

## 快速开始

### 基本工作流

1. 创建 OpenSpec 变更
   ```bash
   cd openspec_cs
   openspec new <change-id>
   ```

2. 编写规范文档
   - `proposal.md` - 描述变更提案
   - `design.md` - 详细设计
   - `specs/` - 各制品规格

3. 执行自动生成
   ```bash
   openspec generate
   ```

4. 验证输出
   ```bash
   openspec verify
   ```

### 集成到项目

```bash
# 初始化 OpenSpec
cd /Users/bobby/Projects/Github/zhangluka/OpenSpec/openspec_cs

# 运行示例
npm run example
```

## 近期变更

### 2026-04-21 - 添加 review-commands 技能

为 phSpec 项目添加各环节制品检查的审查技能，包括规格审查、代码审查和设计审查。

**新增能力**:
- `/phsx:review-spec` - 规格质量审查
- `/phsx:review-code` - 代码规范合规性审查
- `/phsx:review-design` - 设计一致性审查
- 增强 `/phsx:verify` 命令

详细记录：[Change Log](./changelog.md#2026-04-21---添加-review-commands-技能)

## 参考资源

- [OpenSpec GitHub](https://github.com/Fission-AI/OpenSpec)
- [Change Log](./changelog.md) - 项目变更记录
- [cc-spex](#) - 内部 Spec-Kit 变更管理工具（参考实现）
