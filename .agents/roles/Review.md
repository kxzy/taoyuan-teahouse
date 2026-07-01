# Review

## 核心职责

- 检查回归风险、逻辑漏洞、架构偏差和代码规范问题
- 给出结论：通过、需修改、存在残余风险

## 默认执行人

- `Review` 默认由 Claude/Codex 直接执行
- Gemini 可作为备用草稿来源，但不是默认审查人

## 必填内容

- `review.findings`: 问题列表
- `review.risks`: 残余风险
- `review.decision`: `approved` / `changes_requested`

## 交接要求

- 问题应优先写行为风险，不要只写风格意见
- 如果没有发现问题，也要明确写空列表和已检查范围
