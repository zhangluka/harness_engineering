# phSpec 变更记录

phSpec 项目的变更记录，采用 OpenSpec 风格的变更管理。

## 最近变更

### 2026-04-21 - 添加 review-commands 技能

**变更类型**: 新增功能

**变更 ID**: `add-review-commands`

**状态**: ✅ 已完成

**描述**: 为 phSpec 项目添加各环节制品检查的审查技能，包括规格审查、代码审查和设计审查。

**新增能力**:
- `/phsx:review-spec` - 规格质量审查，检查完整性、清晰度、可实施性
- `/phsx:review-code` - 代码规范合规性审查，验证代码与规格一致性
- `/phsx:review-design` - 设计一致性审查，检查设计与规格关联性
- 增强 `/phsx:verify` 命令，提升检查深度

**技术决策**:
- 使用现有模板生成系统保持架构一致性
- 审查命令作为核心命令，生成到所有 AI 工具
- 参考成熟的 cc-spex 实现逻辑
- 采用建议式审查而非强制门控
- 严格使用 Node.js path 模块确保跨平台兼容

**影响范围**:
- 模板系统: `src/core/templates/skill-templates.ts`
- 工具检测: `src/core/shared/tool-detection.ts`
- 命令生成: `src/core/command-generation/generator.ts`
- 适配器: `src/core/command-generation/adapters/`

**任务完成情况**:
- ✅ 核心命令基础设施 (5/5)
- ✅ Review Spec 命令实现 (9/9)
- ✅ Review Code 命令实现 (13/13)
- ✅ Review Design 命令实现 (13/13)
- ✅ 增强 Verify 命令 (8/8)
- ✅ 报告格式标准化 (4/4)
- ✅ 跨平台兼容性 (4/4)
- ✅ 文档更新 (5/5)
- ✅ 集成测试 (6/6)
- ✅ 手动验证 (7/7)

**详细文档**: 参见 `changes/add-review-commands/` 目录

---

## 变更记录格式

每个变更记录包含以下部分：

### 变更摘要
- **变更类型**: 新增功能 / 功能增强 / 修复 / 重构 / 文档
- **变更 ID**: 变更的唯一标识符
- **状态**: 计划中 / 进行中 / 已完成 / 已回滚
- **描述**: 一句话描述变更内容

### 详细信息
- **新增能力**: 新增或修改的能力列表
- **技术决策**: 关键技术决策及其理由
- **影响范围**: 受影响的代码、文档、配置等
- **任务完成情况**: 任务清单及完成状态

### 变更优先级
- **P0**: 必须立即处理
- **P1**: 验证后处理
- **P2**: 长期规划

## 变更目录结构

```
changes/
├── add-review-commands/
│   ├── .openspec.yaml  # OpenSpec 配置
│   ├── design.md       # 设计文档
│   ├── proposal.md     # 提案文档
│   ├── tasks.md        # 任务清单
│   └── specs/          # 规格文档
│       ├── review-spec/
│       ├── review-code/
│       ├── review-design/
│       └── verify/
└── [other-changes]/
```

## 提交变更

新增变更时，请遵循以下步骤：

1. 在 `changes/` 创建新目录，命名格式：`<change-id>`
2. 创建必需的文档文件：
   - `.openspec.yaml` - 变更配置
   - `proposal.md` - 变更提案
   - `design.md` - 设计文档
   - `tasks.md` - 任务清单
3. 创建 `specs/` 目录，存放各制品的规格文档
4. 更新本文件，添加变更记录

## 相关文档

- [OpenSpec 官方文档](https://github.com/Fission-AI/OpenSpec)
- [OpenSpec 工具文档](./openspec.md)