# Ralph Loop

结合内化 [PhSpec](https://github.com/zhangluka/PhSpec) 的 Ralph 自动化执行工具。

## 定位

PhSpec 变更自动应用工具

## 源码

`/Users/bobby/Projects/Github/zhangluka/ralph_npm/ralph_npm`

## 功能

- 自动扫描 PhSpec changes 目录
- 智能识别 apply-ready 状态的变更
- 并发执行 + 失败重试
- 断点续传

## 快速使用

```bash
# 查看可执行变更
npx phspec-auto-apply list

# 执行所有 apply-ready 变更
npx phspec-auto-apply run

# 试运行（仅分析不执行）
phspec-auto-apply run --dry-run
```

## 与 Harness 集成

Ralph Loop 可作为 Harness 体系中的变更执行层，与其他工具协同工作：

- **上游**：接收来自 OpenSpec 或其他工具的变更请求
- **下游**：输出变更结果给验证层（Archon、Superpowers）
