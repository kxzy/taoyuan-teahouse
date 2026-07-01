# 桃园茶肆 Multi-Agent 协作说明

这个项目采用任务卡驱动的多 agent 协作。规划、实现、审查、验证和经验沉淀都写回仓库，而不是只留在聊天记录里。

## 默认分工

- `Planner`: `Gemini` 起草，`Codex` 整理并写回任务卡
- `Code`: `Codex`
- `Review`: `Claude` 优先，必要时 `Codex` 补位
- `QA`: `Codex` 主做，`Gemini` 只辅助补 QA 草稿
- `Memory`: `Codex`

一句话版本：
`Gemini` 出规划草稿，`Codex` 实现和验证，`Claude` 做第二视角审查。

## 任务卡

任务卡保存在 [.agents/tasks](C:/Users/14911/Claude/Projects/桃园茶肆/.agents/tasks)。

每张任务卡包含：

- 基本信息：`id`、`title`、`status`、`currentAgent`
- 规划信息：`goal`、`scope`、`acceptance`、`risks`
- 实现与验证：`implementation`、`review`、`qa`
- 辅助草稿：`assistantDrafts.planner`、`assistantDrafts.review`、`assistantDrafts.qa`
- 经验沉淀：`memory`
- 流转记录：`handoffs`、`history`

## 协作上下文

默认协作配置保存在 [.agents/collaboration.config.json](C:/Users/14911/Claude/Projects/桃园茶肆/.agents/collaboration.config.json)。

当前默认策略：

- `Claude` 优先使用本地项目上下文：`C:\Users\14911\Claude\Projects\桃园茶肆`
- `Gemini` 优先使用公开仓库链接：`https://github.com/kxzy/taoyuan-teahouse.git`
- `Codex` 负责编排、改代码、跑检查和写回状态，尽量不在 prompt 中重复粘贴大段代码

这样做的目标是减少 Codex token 消耗，把大部分代码上下文交给 Claude 本地项目和 Gemini GitHub 仓库链接处理。

## 常用命令

```bash
npm run agent:intake -- "顾客排队优化" "降低高峰期顾客排队堆积，并补齐验证记录"
npm run agent:intake:taoyuan -- "制作台体验优化" "优化制作台交互、顾客节奏与 Creator 预览验证"
npm run agent:list
npm run agent:context -- "2026-07-01-桃园茶肆当前开发主线"
npm run agent:summary -- "2026-07-01-桃园茶肆当前开发主线"
npm run agent:show -- "2026-07-01-桃园茶肆当前开发主线"
npm run agent:advance -- "2026-07-01-桃园茶肆当前开发主线" "Code 完成首轮实现，进入 Review"
```

## 推荐流程

1. `Planner`
   用 `Gemini` 输出范围、风险、验收标准，再由 `Codex` 写回任务卡。
2. `Code`
   用 `Codex` 在真实项目目录里直接改代码、跑命令、补任务卡。
3. `Review`
   默认交给 `Claude`，重点看回归风险、生命周期、资源稳定性和漏掉的验证。
4. `QA`
   由 `Codex` 实际跑检查并记录结果；`Gemini` 只辅助整理 QA 草稿，不替代真实验证。
5. `Memory`
   由 `Codex` 把可复用流程和默认策略沉淀回任务卡或长期记忆。

## Gemini 网页桥接

当前仓库已接入基于浏览器自动化的 Gemini 网页桥接脚本：

- [tools/gemini-web-bridge.js](C:/Users/14911/Claude/Projects/桃园茶肆/tools/gemini-web-bridge.js)

当前验证通过的是 Edge 远程调试会话：

```powershell
$env:GEMINI_WEB_CHROME_PATH='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:GEMINI_WEB_PROFILE_DIR="$env:LOCALAPPDATA\Microsoft\Edge\User Data"
$env:GEMINI_WEB_DEBUG_PORT='9223'
```

可直接使用：

```bash
npm run agent:gemini:ask -- "请只回复：桥接正常"
npm run agent:gemini:planner -- "2026-07-01-桃园茶肆当前开发主线"
npm run agent:gemini:qa -- "2026-07-01-桃园茶肆当前开发主线"
```

## Claude 桌面桥接

当前仓库已接入 Claude 桌面桥接脚本：

- [tools/claude-desktop-bridge.js](C:/Users/14911/Claude/Projects/桃园茶肆/tools/claude-desktop-bridge.js)

默认入口：

```bash
npm run agent:claude:review -- "2026-07-01-桃园茶肆当前开发主线"
```

现在脚本会锁定本次 prompt 对应的响应窗口，避免被同一会话中的后续短测试消息串单。

## 注意事项

- `Gemini` 和 `Claude` 主要负责草稿和审查，不替代真实代码修改与实际验证。
- `QA` 必须区分“已执行”和“建议执行”，不能把没跑过的检查写成已通过。
- `Review` 结论优先记录行为风险、回归风险和验收缺口，不要只写风格意见。
- 如果公开仓库地址变化，只需要更新 `.agents/collaboration.config.json`，不需要再改 prompt 生成逻辑。
