# 《桃源茶肆》V2.8 资源构建兼容说明

## 版本目标

V2.8 面向微信小游戏构建和后续团队协作，处理图片资源中文路径的潜在风险。本轮不删除原中文资源，而是新增英文别名资源，并让代码优先加载英文路径，中文路径作为回退。

## 英文资源路径

当前在 `assets/resources/image` 下使用以下英文资源文件：

- `bg_teahouse.png`：对应原 `茶铺.png`
- `seat_table.png`：对应原 `桌椅.png`
- `customer_scholar_wait.png` / `customer_scholar_drink.png` / `customer_scholar_happy.png`：对应书生不同状态
- `customer_lady_pose.png` / `customer_lady_smile.png`：对应女客人状态
- `customer_swordsman_smile.png` / `customer_swordsman_grin.png` / `customer_swordsman_angry.png`：对应侠客状态
- `tea_green.png`：对应原 `茉莉绿茶.png`
- `tea_black.png`：对应原 `蜜香红茶.png`
- `ui_dialog.png`：对应原 `对话框.png`
- `BrewButton.png` / `ServeButton.png`：对应泡茶、上茶按钮素材；通用 `button` textureKey 当前回退到这两张现有按钮图

## 代码调整

`GameConfig.ts` 中的 `TEAHOUSE_TEXTURE_PATHS` 使用数组形式。加载图片时会先尝试分组英文路径，例如 `image/background/bg_teahouse/texture`，必要时再尝试兼容路径。这样既能降低微信小游戏构建风险，又把资源入口集中到一处维护。

## 当前测试重点

在 Cocos Creator 中刷新资源导入后，优先运行 `Main.scene`，检查背景、桌椅、客人、对话框、绿茶、红茶、按钮底图是否正常显示。当前所有 `TEAHOUSE_TEXTURE_PATHS` 都应至少命中一个真实资源；如果控制台出现图片加载失败，应先检查 `GameConfig.ts` 中对应 textureKey 的路径。

## 下一轮建议

V2.9 建议做一次微信开发者工具体验版前的完整回归：清档自然玩 3 天，Debug 升到 10 级检查满级流程，再构建到微信开发者工具确认资源加载、底部安全区、存档和性能。
