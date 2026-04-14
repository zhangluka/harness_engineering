# Archon Windows 离线安装与使用指南

> 针对无法直接访问 GitHub 的 Windows 环境的完整解决方案

网站：https://archon.diy/
仓库：https://github.com/coleam00/Archon

---

## 快速概览

### Archon 是什么？

Archon 是一个 AI 编程工作流构建器，通过 YAML 文件定义可重复、可控的 AI 编码流程。

### 核心功能

- 📝 **YAML 工作流定义**：结构化、版本可控
- 🤖 **AI 节点**：调用 Claude/GPT 等 LLM
- 🛠️ **确定性节点**：Bash、文件操作
- 🔄 **循环与重试**：自动迭代直到成功
- 👥 **多智能体协调**：并行审查、分工协作
- 🔒 **隔离执行**：Git worktree 隔离，不污染主分支
- ✋ **人工审核点**：关键步骤需人工确认

---

## 环境要求

| 组件 | 最低版本 | 推荐版本 | 下载地址 |
|------|----------|----------|----------|
| Node.js | v18+ | v20 LTS | https://nodejs.org/ |
| npm | 随 Node.js | 最新版 | 包含在 Node.js 中 |
| Git | 任意版本 | 最新版 | https://git-scm.com/ |
| PowerShell | 5.1+ | 7+ | Windows 自带/升级 |

### 检查当前环境

```powershell
# 检查 Node.js
node --version

# 检查 npm
npm --version

# 检查 Git
git --version

# 检查 PowerShell
$PSVersionTable.PSVersion
```

---

## 离线安装方案

由于无法直接访问 GitHub，推荐以下方案：

### 方案一：从可访问环境打包（推荐）

**在外部环境（可访问 GitHub 的机器）执行：**

```bash
#!/bin/bash
# 准备 Archon 离线安装包

# 1. 创建临时目录
mkdir -p archon-offline-package
cd archon-offline-package

# 2. 克隆 Archon 仓库
git clone https://github.com/coleam00/Archon.git

# 3. 进入并安装依赖
cd Archon
npm install --production

# 4. 返回并打包
cd ..
tar -czf archon-windows-package.tar.gz .

# 5. 显示文件信息
ls -lh archon-windows-package.tar.gz

echo "✓ 打包完成: archon-windows-package.tar.gz"
echo "  将此文件传输到 Windows 电脑"
```

**在办公电脑上执行：**

```powershell
# 1. 解压（需要 Git Bash 或第三方 tar 工具）
# 如果没有 tar，可以使用 7-Zip 或 WinRAR 解压

# 2. 进入目录
cd archon-offline-package\Archon

# 3. 全局链接
npm link

# 或安装到本地
npm install -g .

# 4. 验证安装
archon --version
```

---

### 方案二：通过国内 npm 镜像

如果办公电脑可以访问互联网（但无法访问 GitHub）：

```powershell
# 1. 配置国内镜像
npm config set registry https://registry.npmmirror.com

# 2. 配置 yarn（如果使用）
yarn config set registry https://registry.npmmirror.com

# 3. 安装 Archon（假设包名）
# 注意：需要确认 Archon 的实际 npm 包名
npm install -g archon

# 4. 验证
archon --version
```

---

### 方案三：手动下载 + 离线依赖包

**在外部环境：**

```bash
# 1. 下载主仓库
git clone https://github.com/coleam00/Archon.git

# 2. 获取依赖列表
cd Archon
npm install --dry-run --json > ../dependencies.json

# 3. 完整安装
npm install

# 4. 打包
cd ..
tar -czf archon-complete.tar.gz Archon/
```

**在办公电脑：**

```powershell
# 解压后进入目录
cd Archon

# 尝试使用本地依赖
npm link
```

---

## Archon 基础使用

### 验证安装

```powershell
# 检查版本
archon --version

# 查看帮助
archon --help

# 查看所有命令
archon help
```

### 初始化项目

```powershell
# 进入项目目录
cd your-project

# 初始化 Archon
archon init

# 使用特定模板初始化
archon init --template idea-to-pr
```

### 运行工作流

```powershell
# 运行默认工作流
archon run

# 运行指定工作流
archon run workflow-name

# 查看可用工作流
archon list
```

---

## 创建第一个工作流

### 示例：Hello World

创建 `workflows/hello.yaml`：

```yaml
name: Hello World
description: 我的第一个 Archon 工作流

env:
  model: claude-sonnet-4-6
  timeout: 300

workflow:
  - name: say-hello
    type: ai
    model: ${env.model}
    prompt: |
      请用中文写一段自我介绍，不超过 100 字。
      介绍你的能力和特长。

  - name: verify
    type: ai
    model: ${env.model}
    prompt: |
      请审查上面的输出，确保：
      1. 内容通顺
      2. 符合字数要求
      3. 没有不当内容

  - name: complete
    type: bash
    command: echo "工作流执行完成！"
```

### 运行工作流

```powershell
archon run workflows/hello.yaml
```

---

## 工作流节点类型

### AI 节点

```yaml
- name: generate-code
  type: ai
  model: claude-opus-4-6
  prompt: "根据 OpenSpec spec 生成代码"
  temperature: 0.7
  max_tokens: 4000
```

### Bash 节点

```yaml
- name: run-tests
  type: bash
  command: npm test
  timeout: 600
  retry: 3
```

### 文件读取节点

```yaml
- name: read-spec
  type: file
  path: ./openspec/changes/latest/proposal.md
  format: markdown
```

### 并行执行

```yaml
- name: multi-review
  type: parallel
  nodes:
    - name: security-review
      type: ai
      model: claude-sonnet-4-6
      prompt: "审查代码安全性"

    - name: quality-review
      type: ai
      model: gpt-4
      prompt: "审查代码质量"
```

### 条件分支

```yaml
-   name: check-tests
    type: condition
    condition: ${tests.result} == "passed"
    then:
      - name: deploy
        type: bash
        command: npm run deploy
    else:
      - name: fix-failures
        type: ai
        prompt: "修复测试失败"
```

### 循环

```yaml
- name: retry-loop
  type: loop
  max_iterations: 3
  nodes:
    - name: attempt
      type: bash
      command: npm test
```

### 人工审核

```yaml
- name: human-review
  type: human
  message: "请审查实现方案并决定是否继续"
  options:
    - approve: "批准，继续执行"
    - reject: "拒绝，终止流程"
    - modify: "需要修改"
```

---

## 与现有工具集成

### 集成 OpenSpec

```yaml
name: OpenSpec Driven Implementation

workflow:
  # 1. 读取 OpenSpec proposal
  - name: read-proposal
    type: file
    path: ./openspec/changes/latest/proposal.md

  # 2. 基于 spec 规划实现
  - name: plan
    type: ai
    model: claude-opus-4-6
    prompt: |
      根据 OpenSpec proposal，创建详细的实现计划。
      确保每个任务都有明确的验收标准。

  # 3. 执行实现
  - name: implement
    type: ai
    model: claude-opus-4-6
    prompt: |
      按照计划实现代码。
      严格遵守 OpenSpec 中定义的规范。
```

### 集成 Ralph Loop

```yaml
name: Ralph Loop Integration

workflow:
  - name: run-ralph
    type: bash
    command: |
      cd .claude/worktrees/ralph
      npx phspec-auto-apply run

  - name: verify-result
    type: bash
    command: npm test
```

---

## 常见问题排查

### 问题：命令未找到

```powershell
# 检查 npm 全局安装位置
npm config get prefix

# 将此路径添加到系统 PATH
# 1. 按 Win+R，输入 sysdm.cpl
# 2. 高级 → 环境变量
# 3. 在 Path 中添加上述路径
```

### 问题：权限错误

```powershell
# 以管理员身份运行 PowerShell
# 或修改执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 问题：依赖安装失败

```powershell
# 清除缓存
npm cache clean --force

# 使用国内镜像
npm config set registry https://registry.npmmirror.com

# 重新安装
npm install
```

---

## 工作流模板库

在本地维护可复用模板：

```
your-project/
├── .archon/
│   ├── workflows/           # 工作流
│   │   ├── idea-to-pr.yaml
│   │   ├── openspec-driven.yaml
│   │   └── piv-loop.yaml
│   ├── templates/           # 模板
│   │   ├── ai-node.yaml
│   │   ├── bash-node.yaml
│   │   └── review-node.yaml
│   └── config.yaml         # 配置
```

---

## Claude Code 集成

### 方法 1: 直接调用

在 Claude Code 中：

```
archon run workflow-name
```

### 方法 2: 创建 Skill

创建 `tools/archon-run.js`：

```javascript
const { execSync } = require('child_process');
const workflow = process.argv[2];

if (!workflow) {
  console.error('Usage: node archon-run.js <workflow-name>');
  process.exit(1);
}

try {
  execSync(`archon run ${workflow}`, {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('工作流执行失败:', error.message);
  process.exit(1);
}
```

在 Claude Code 中：

```
node tools/archon-run.js workflow-name
```

---

## 配置文件

创建 `.archon/config.yaml`：

```yaml
# Archon 配置

# 默认模型
default_model: claude-sonnet-4-6

# 工作流目录
workflows_dir: .archon/workflows

# 日志配置
logging:
  level: info
  file: .archon/logs/archon.log

# 超时设置
timeouts:
  ai_node: 600
  bash_node: 300

# 重试策略
retry:
  max_attempts: 3
  backoff: exponential

# Claude API 配置
claude:
  api_key: ${ANTHROPIC_API_KEY}
  base_url: https://api.anthropic.com

# GitHub 集成
github:
  enabled: true
  auto_pr: true
  default_branch: main
```

---

## 下一步建议

1. ✅ **确认环境**：检查 Node.js、npm 版本
2. 📦 **获取安装包**：从可访问环境准备离线包
3. 🔧 **安装测试**：在办公电脑安装并验证
4. 🚀 **创建首个 workflow**：从简单示例开始
5. 🔄 **集成现有工具**：连接 OpenSpec 和 Ralph Loop
6. 📚 **积累模板**：建立本地模板库
7. 👥 **团队推广**：分享经验和最佳实践

---

## 获取帮助

### 内置帮助

```powershell
archon help
archon help <command>
```

### 常用资源

- Archon 网站: https://archon.diy/
- Archon GitHub: https://github.com/coleam00/Archon
- Claude Code 文档: https://claude.ai/claude-code

---

## 快速命令参考

```powershell
# 安装相关
npm link                    # 全局链接
npm install -g .            # 全局安装
archon --version            # 检查版本

# 项目管理
archon init                 # 初始化项目
archon init --template xyz  # 使用模板初始化

# 工作流管理
archon list                 # 列出工作流
archon run                  # 运行默认工作流
archon run <name>           # 运行指定工作流

# 调试
archon logs <name>          # 查看日志
archon validate <name>       # 验证工作流
```

---

**文档版本**: 1.0
**最后更新**: 2026-04-13
