# Harness Engineering 工具实践映射

> 基于 `concepts/harness-engineer.md` 框架，规划 `tool-roadmap.md` 的实践路径。

---

## 映射关系

```
Harness Engineering 框架           →  工具实践
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Inform（输入治理）                →  Spec（OpenSpec 生成）
Constrain（行为约束）              →  Pre-commit Spec 验证、依赖冲突检测
Verify（结果验证）                →  Spec Linter、实现-Spec 对齐检测
Feedback（结构化反馈）            →  Diff 分析工具、变更血缘图
Correct（受限纠错）                →  Rollback 辅助
L4 协同层                         →  Diff Review UI、Approve Gateway、Comment/Annotation
```

---

## 实践建议

### 1. 从 Phase 1 开始构建最小闭环

**目标**：建立 `Inform -> Constrain -> Verify -> Feedback -> Correct` 最小闭环

```
OpenSpec (Inform)
    ↓
Pre-commit Spec 验证 (Constrain)
    ↓
Spec Linter (Verify)
    ↓
Diff 分析工具 (Feedback)
    ↓
Rollback 辅助 (Correct)
```

---

### 2. 按"验证先于信任"原则排序

优先级调整理由：
- **Spec Linter** 比 **Spec 健康度看板** 更基础
- **Pre-commit Spec 验证** 应在 **Diff Review UI** 之前
- **实现-Spec 对齐检测** 是核心验证能力

---

### 3. 遵循"最小充分上下文"原则

不要一次性实现所有能力：
- **Phase 1** 专注：生成 → 约束 → 验证 → 反馈 → 纠错（最小闭环）
- **Phase 2** 增强：可视化、追踪
- **Phase 3** 扩展：人机协作

---

### 4. 反馈必须可执行

**Diff 分析工具**应输出：

```json
{
  "failed_spec": "spec/v1/user-api.yaml",
  "field": "endpoint:/users/{id}",
  "expected": "GET method",
  "actual": "POST method",
  "file": "src/api/users.go:42",
  "suggestion": "将 POST 修改为 GET，或更新 Spec 中的 method 定义"
}
```

---

### 5. 自动化有边界

**Ralph Loop** 应设约束：
- 最多重试 3 次
- 修改范围限于 Spec 声明的模块
- 失败时自动升级到人工审批（需 Approve Gateway）

---

## 成熟度判据应用

### 当前状态评估

| 判据 | 现状 | 缺口 |
|-------------------------|-------|------|
| 边界可声明 | ✅ Spec 定义 | Pre-commit 验证 |
| 过程可观测 | ✅ Ralph Loop 日志 | 变更血缘图 |
| 结果可验证 | ⚠️ 部分支持 | Spec Linter、对齐检测 |
| 失败可闭环 | ⚠️ 部分支持 | 结构化 Diff 反馈 |
| 风险可升级 | ❌ 缺失 | Approve Gateway |

---

### Phase 1 完成后的成熟度

| 判据 | 状态 | 实现工具 |
|-------------------------|-------|----------|
| 边界可声明 | ✅ | OpenSpec + Pre-commit |
| 过程可观测 | ✅ | Ralph Loop |
| 结果可验证 | ✅ | Spec Linter |
| 失败可闭环 | ✅ | Diff 分析工具 |
| 风险可升级 | ❌ | 待 Phase 3 |

---

## 修正后的实施优先级

### Phase 1: 最小闭环（立即）
- **Spec Linter**（Verify）
- **Pre-commit Spec 验证**（Constrain）
- **Diff 分析工具**（Feedback）
- **Rollback 辅助**（Correct）

### Phase 2: 可观测增强（中期）
- **变更血缘图**（过程可观测）
- **实现-Spec 对齐检测**（Verify 增强）
- **Spec 健康度看板**（结果可视化）

### Phase 3: 协同增强（远期）
- **Approve Gateway**（风险可升级）
- **Diff Review UI**（人机协同）
- **Comment/Annotation**（讨论记录）
