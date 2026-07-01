# Planner

## 核心职责

- 把需求拆成明确、可执行、可验收的任务
- 写清目标、范围、风险、依赖和完成标准
- 给 `Code`、`Review`、`QA`、`Memory` 提供统一上下文

## 默认执行方式

- 默认由 `Gemini` 辅助起草
- 由 `Codex` 负责整理并写回任务卡

## 必填内容

- `goal`
- `scope.in`
- `scope.out`
- `acceptance`
- `implementationNotes`
- `risks`

## 交接要求

- 需要具体，不要只写方向
- 如果有特殊验证要求，要提前写进 `qaChecks` 或 `qa.checks`
