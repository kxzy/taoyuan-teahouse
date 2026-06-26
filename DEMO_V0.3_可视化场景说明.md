# 《桃源茶肆》Demo V0.3 可视化场景说明

## 版本目标

V0.3 的目标是让你可以逐步在 Cocos 场景编辑器中手动摆放图片和锚点，而不是所有内容都被代码完全重建。当前版本仍会自动生成一套可运行 UI，但只会清理 `RuntimeRoot` 节点，不会删除 Canvas 下你自己手动添加的其他节点。

## 重要变化

`AutoDemoGame.ts` 现在会在 Canvas 下创建或复用 `RuntimeRoot`，所有自动生成的背景、按钮、文本、操作台、客人都会放在 `RuntimeRoot` 里。你手动放在 Canvas 下、但不放在 `RuntimeRoot` 里的图片节点，运行时不会被删除。

这意味着你可以先手动放一张背景、一些装饰、Logo 或参考线。只要它们不在 `RuntimeRoot` 下面，运行时就会保留。

## 可选场景锚点

你可以在 Canvas 下手动创建以下节点，代码会自动识别它们的位置：

| 节点名 | 用途 |
|---|---|
| `EntrancePoint` | 客人入场位置 |
| `ExitPoint` | 客人离开位置 |
| `Seat_1` | 1 号座位位置 |
| `Seat_2` | 2 号座位位置 |
| `Seat_3` | 3 号座位位置 |

如果这些节点不存在，代码会继续使用默认位置并自动生成座位图片。若存在 `Seat_1/Seat_2/Seat_3`，代码会使用你手动摆放的座位节点位置，让客人走到对应座位附近。

## 推荐手动节点结构

建议在 Canvas 下建立：

```text
Canvas
├── EditableArt
│   ├── BackgroundManual
│   ├── Decoration_01
│   └── Decoration_02
├── Seat_1
├── Seat_2
├── Seat_3
├── EntrancePoint
├── ExitPoint
└── RuntimeRoot
```

其中 `EditableArt`、`Seat_1/2/3`、`EntrancePoint`、`ExitPoint` 都是你可以手动摆放的。`RuntimeRoot` 是代码自动生成内容的区域，不建议手动改它里面的节点，因为每次运行都会清空重建。

## 如何手动放图片

在 Cocos 中右键 Canvas 或 EditableArt，创建 UI Sprite，然后把图片资源拖到 SpriteFrame 上，调整位置和大小。注意不要把手动图片放进 `RuntimeRoot`，否则运行时会被删除。

## 当前仍然自动生成的内容

标题、等级金币文本、消息提示、操作台、制作按钮、调试按钮、客人节点仍由代码生成。下一步如果需要，可以把这些也逐步改成场景节点绑定版。

## 下一步建议

V0.4 建议把按钮和操作台也改成可视化节点，让你直接在编辑器里调整 UI 布局。V0.5 再加入正式升级弹窗、食材商店和新手引导。
