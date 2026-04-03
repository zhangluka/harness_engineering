# 工具

## OpenSpec CS

基于 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 开源项目内化的 SDD (Spec-Driven Development) 工具。

- **定位**：Spec-driven development for AI coding assistants
- **源码**：`/Users/bobby/Projects/Github/zhangluka/OpenSpec/openspec_cs`
- **特点**：
  - 无需 API Key
  - 支持 Brownfield（棕地）开发
  - 轻量级工作流

---

## Ralph Loop

结合内化 [PhSpec](https://github.com/zhangluka/PhSpec) 的 Ralph 自动化执行工具。

- **定位**：PhSpec 变更自动应用工具
- **源码**：`/Users/bobby/Projects/Github/zhangluka/ralph_npm/ralph_npm`
- **功能**：
  - 自动扫描 PhSpec changes 目录
  - 智能识别 apply-ready 状态的变更
  - 并发执行 + 失败重试
  - 断点续传

### 快速使用

```bash
# 查看可执行变更
npx phspec-auto-apply list

# 执行所有 apply-ready 变更
npx phspec-auto-apply run

# 试运行（仅分析不执行）
phspec-auto-apply run --dry-run
```