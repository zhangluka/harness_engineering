# PH Harness Engineering

> Harness Engineering 在实战项目中的落地记录

## 目标

- 记录 Harness Engineering 在真实项目中的落地全过程
- 沉淀可复用的工具、框架和模板
- 总结踩坑经验和最佳实践
- 与社区共建，推动 AI 工程化发展

## 目录结构

```
ph-harness-engineering/
├── README.md              # 项目简介
├── AGENTS.md              # 智能体入口
│
├── concepts/              # 核心概念（选择性记录，不求全）
│   └── ...
│
├── projects/              # 实战项目（核心）
│   ├── project-1/         # 每个项目一个目录
│   │   ├── README.md      # 项目背景、目标
│   │   ├── harness/       # harness 配置、AGENTS.md、规则
│   │   ├── src/           # 项目代码
│   │   └── feedback/      # 落地过程中的踩坑
│   └── project-2/
│       └── ...
│
├── tools/                 # 沉淀的工具/框架
│   ├── ralph-config/      # 定制的 Ralph 配置
│   ├── linter-rules/      # 自定义 lint 规则
│   └── ...
│
├── templates/             # 可复用的模板
│   ├── AGENTS.md.tpl      # 项目级 AGENTS.md 模板
│   ├── harness-config/    # harness 配置模板
│   └── ...
│
└── notes/                 # 过程笔记
    └── ...
```

## 建设规划

- **以项目为主线**：围绕真实项目展开，而非罗列概念
- **工具沉淀**：`tools/` 目录记录可复用工具
- **模板积累**：`templates/` 目录提供可复制模板
- **反馈下沉**：每个项目下的 `feedback/` 记录踩坑

## 参与共建

欢迎通过 Issue 和 PR 参与：
- 贡献实战项目案例（`projects/`）
- 分享工具和框架（`tools/`）
- 提供可复用模板（`templates/`）
- 补充过程笔记（`notes/`）

## 学习资源

- [Harness Engineering (OpenAI)](https://openai.com/index/harness-engineering/)
- [Harness design for long-running apps (Anthropic)](https://www.anthropic.com/engineering/harness-design-long-running-apps)

## 联系

- GitHub: [@zhangluka](https://github.com/zhangluka)