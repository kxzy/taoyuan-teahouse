# 《桃源茶肆》Cocos Demo 接入说明

本文件说明如何把当前脚本接入 Cocos Creator 3.x，并在编辑器里跑通第一版核心循环。

## 一、当前已生成脚本

脚本位于 `assets/scripts/`：

- `GameConfig.ts`：Demo 数值配置，包含 1-3 级、3 种茶饮、2 类客人。
- `SaveManager.ts`：本地存档，使用 Cocos 的 `sys.localStorage`。
- `Customer.ts`：客人组件，负责点单显示、耐心值倒计时、流失判定。
- `Workstation.ts`：操作台组件，负责最多 3 杯茶的制作队列和进度。
- `GameManager.ts`：总控组件，负责刷新客人、制作茶饮、交付结算、升级、调试按钮。

## 二、推荐场景节点结构

在 Cocos Creator 中新建或打开主场景，例如 `Main.scene`，建议建立如下节点：

```text
Canvas
├── GameManager
├── GameArea
│   ├── CustomerRoot
│   ├── Seat_1
│   ├── Seat_2
│   └── Seat_3
├── Workstation
│   ├── QueueLabel
│   └── ProgressBar
└── UI
    ├── LevelLabel
    ├── CoinsLabel
    ├── MessageLabel
    ├── BtnGreenTea
    ├── BtnBlackTea
    ├── BtnJasmineTea
    ├── BtnUpgrade
    ├── BtnDebugCoins
    ├── BtnDebugSpawn
    └── BtnDebugClearSave
```

如果你还没有正式美术资源，可以全部先用 Cocos 内置的 Sprite、Label、Button 和 ProgressBar 占位。

## 三、创建 Customer Prefab

创建一个客人预制体，例如 `assets/prefabs/Customer.prefab`。

推荐结构：

```text
Customer
├── Body
├── OrderLabel
└── PatienceBar
```

操作步骤：

1. 在场景里创建一个空节点 `Customer`。
2. 给 `Customer` 挂载 `Customer.ts` 脚本。
3. 在 `Customer` 下创建一个 Label，命名为 `OrderLabel`，用于显示“山野绿茶”等点单文本。
4. 在 `Customer` 下创建一个 ProgressBar，命名为 `PatienceBar`，用于显示耐心值。
5. 在 `Customer` 的 Inspector 中，把 `OrderLabel` 拖到脚本的 `orderLabel` 属性，把 `PatienceBar` 拖到 `patienceBar` 属性。
6. 把 `Customer` 拖到资源面板生成 Prefab。
7. 场景里的临时 Customer 节点可以删除。

## 四、绑定 Workstation

1. 选中场景里的 `Workstation` 节点。
2. 挂载 `Workstation.ts` 脚本。
3. 把 `QueueLabel` 拖到脚本的 `queueLabel` 属性。
4. 把 `ProgressBar` 拖到脚本的 `progressBar` 属性。

## 五、绑定 GameManager

1. 选中 `GameManager` 节点。
2. 挂载 `GameManager.ts` 脚本。
3. 绑定以下属性：
   - `levelLabel`：拖入 `UI/LevelLabel`
   - `coinsLabel`：拖入 `UI/CoinsLabel`
   - `messageLabel`：拖入 `UI/MessageLabel`
   - `workstation`：拖入场景里的 `Workstation` 节点
   - `customerPrefab`：拖入刚才创建的 `Customer.prefab`
   - `customerRoot`：拖入 `GameArea/CustomerRoot`
   - `seatNodes`：依次拖入 `Seat_1`、`Seat_2`、`Seat_3`

## 六、绑定按钮点击事件

在每个 Button 的 Click Events 中添加 `GameManager` 节点，并选择对应方法：

- `BtnGreenTea` → `GameManager.makeGreenTea`
- `BtnBlackTea` → `GameManager.makeBlackTea`
- `BtnJasmineTea` → `GameManager.makeJasmineTea`
- `BtnUpgrade` → `GameManager.upgradeShop`
- `BtnDebugCoins` → `GameManager.debugAddCoins`
- `BtnDebugSpawn` → `GameManager.debugSpawnCustomer`
- `BtnDebugClearSave` → `GameManager.debugClearSave`

## 七、第一版运行目标

点击预览后，应该能看到：

1. 客人会自动刷新到空座位附近。
2. 客人头上显示想要的茶饮。
3. 玩家点击对应茶饮按钮后，操作台开始制作。
4. 茶做好后，如果有匹配客人，会自动交付并增加金币。
5. 金币达到升级成本后，点击升级可以升到 2 级、3 级。
6. 调试按钮可以加金币、强制刷客、清空存档。

## 八、当前 Demo 范围

当前代码只实现 1-3 级核心闭环，故意没有加入完整商业版系统。暂未包含：

- 客人从入口走到座位的真实路径动画。
- 食材库存和食材商店。
- 装饰系统和颜值分。
- 离线收益。
- 微信云存档。
- 正式美术、音效和新手引导遮罩。

这些应该在核心循环跑通后逐步加入。
