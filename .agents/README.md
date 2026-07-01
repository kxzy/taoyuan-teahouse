# 桃园茶肆 Multi-Agent 目录

这个目录保存项目内的多 agent 协作配置、角色说明和任务卡。

## 默认分工

- `Planner`: `Gemini` 辅助，`Codex` 落卡
- `Code`: `Codex`
- `Review`: `Claude` 优先
- `QA`: `Codex` 主做，`Gemini` 可辅助
- `Memory`: `Codex`

## 目录结构

- `collaboration.config.json`: 协作上下文配置，包含 GitHub 仓库链接和 Claude 本地项目路径
- `roles/`: 各 agent 的职责和交接要求
- `templates/`: 任务卡模板
- `tasks/`: 实际任务卡 JSON 文件

## 快速入口

```bash
npm run agent:intake -- "顾客排队优化" "降低高峰期顾客排队堆积，并补齐验证记录"
npm run agent:intake:taoyuan -- "制作台体验优化" "优化制作台交互、顾客节奏与 Creator 预览验证"
npm run agent:context -- "2026-07-01-桃园茶肆当前开发主线"
npm run agent:summary -- "2026-07-01-桃园茶肆当前开发主线"
```

## 默认上下文策略

- `Gemini` 优先读公开 GitHub 仓库：`https://github.com/kxzy/taoyuan-teahouse.git`
- `Claude` 优先用本地项目上下文：`C:\Users\14911\Claude\Projects\桃园茶肆`
- `Codex` 只保留必要任务摘要，不重复搬运大段代码

`Review` 默认交给 `Claude`，不走 `Gemini`。`agent:gemini:review` 仅保留为备用入口。
