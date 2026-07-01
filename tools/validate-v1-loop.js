const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const files = {
  auto: read('assets/scripts/AutoDemoGame.ts'),
  ui: read('assets/scripts/UIManager.ts'),
  eventBus: read('assets/scripts/EventBus.ts'),
  config: read('assets/scripts/GameConfig.ts'),
  brewPanel: read('assets/scripts/BrewPanel.ts'),
  progress: read('研发推进记录.md'),
  checklist: read('V1.0_玩法闭环验收清单.md'),
};

const requiredBrewInterfaceAssets = [
  'panel_brew_lower_bg.png',
  'card_today_recipe.png',
  'button_tea_base.png',
  'chip_additive.png',
  'button_start_brew.png',
  'badge_status_jade.png',
  'tray_product_station.png',
  'icon_tea_green.png',
  'icon_tea_black.png',
  'icon_tea_oolong.png',
  'icon_add_none.png',
  'icon_add_sugar.png',
  'icon_add_flower.png',
  'icon_add_milk.png',
  'icon_energy.png',
  'icon_queue.png',
];

const checks = [
  {
    name: '补货按钮通过 EventBus 打开商店',
    file: 'auto',
    pattern: /actionId === 'supply'[\s\S]*openSupplyShop\('选择要补充的原料/,
  },
  {
    name: '补货购买请求由 UIManager 发出',
    file: 'ui',
    pattern: /EventBus\.emit\(GameEventName\.RequestBuySupplyItem, item\.id\)/,
  },
  {
    name: '补货商店展示四类资源',
    file: 'auto',
    pattern: /SUPPLY_SHOP_ITEMS[\s\S]*teaLeaf[\s\S]*sugar[\s\S]*flower[\s\S]*fruit/,
  },
  {
    name: '金币不足会停留在补货商店并提示差额',
    file: 'auto',
    pattern: /金币不足：购买[\s\S]*还差[\s\S]*openSupplyShop\(message, item\.id\)/,
  },
  {
    name: '制作缺料会明确提示并打开补货商店',
    file: 'auto',
    pattern: /原料不足：\$\{missingText\}[\s\S]*openSupplyShop\(`\$\{recipe\.name\} 缺少 \$\{missingText\}/,
  },
  {
    name: '研发缺料会复用补货商店引导',
    file: 'auto',
    pattern: /研发食材不足：\$\{missingText\}[\s\S]*openSupplyShop\(`研发缺少 \$\{missingText\}/,
  },
  {
    name: '图鉴页签接入主导航',
    file: 'auto',
    pattern: /id: 'collection'[\s\S]*text: '图鉴'/,
  },
  {
    name: '图鉴通过 EventBus 展示快照',
    file: 'eventBus',
    pattern: /CollectionViewModel = 'collection:view-model'/,
  },
  {
    name: '研发成功后刷新图鉴',
    file: 'auto',
    pattern: /PopupResearchResult[\s\S]*currentMainTab === 'collection'[\s\S]*CollectionViewModel/,
  },
  {
    name: '研发面板展示图鉴进度和最近新茶',
    file: 'auto',
    pattern: /refreshResearchPanel[\s\S]*createCollectionViewModel\(false\)[\s\S]*recentUnlockText[\s\S]*collection\.unlockedCount[\s\S]*collection\.totalCount/,
  },
  {
    name: '图鉴统计使用全量茶谱',
    file: 'auto',
    pattern: /const allRecipes = \[\.\.\.baseRecipes, \.\.\.developedRecipes\][\s\S]*totalCount: allRecipes\.length/,
  },
  {
    name: 'Combo 奖励接入收入消息',
    file: 'auto',
    pattern: /calculateComboBonus[\s\S]*Combo×\$\{this\.comboCount\}/,
  },
  {
    name: '完美火候接入制茶与收入消息',
    file: 'auto',
    pattern: /result\.quality === 'perfect'[\s\S]*完美火候[\s\S]*calculateHeatBonus[\s\S]*formatServeMessage/,
  },
  {
    name: 'UIManagerRoot 有固定尺寸',
    file: 'ui',
    pattern: /ensureRootTransform[\s\S]*setContentSize\(UI_ROOT_WIDTH, UI_ROOT_HEIGHT\)/,
  },
  {
    name: '验收清单覆盖存档与稳定性',
    file: 'checklist',
    pattern: /## 存档与稳定性[\s\S]*退出重进/,
  },
  {
    name: '进度记录写明 Cocos 预览待验证',
    file: 'progress',
    pattern: /Cocos Creator 预览/,
  },
  {
    name: 'UIManager 不直接导入游戏业务与存档模块',
    file: 'ui',
    pattern: /^(?![\s\S]*from '\.\/AutoDemoGame')(?![\s\S]*from '\.\/SaveManager')[\s\S]*$/,
  },
  {
    name: '补货购买仍通过业务层处理',
    file: 'auto',
    pattern: /EventBus\.on\(GameEventName\.RequestBuySupplyItem, this\.handleRequestBuySupplyItemEvent(?:, this)?\)[\s\S]*private buySupplyItem/,
  },
  {
    name: 'Cocos 类型检查配置位于 tools 目录',
    file: 'progress',
    pattern: /tools\/tsconfig\.codex-check\.json/,
  },
  {
    name: '配方 ID 支持 base_additive 反向解析',
    file: 'config',
    pattern: /export function parseRecipeId\(recipeId: string\)[\s\S]*const base = `\$\{parts\[0\]\}_\$\{parts\[1\]\}`[\s\S]*const additive = `\$\{parts\[2\]\}_\$\{parts\[3\]\}`/,
  },
  {
    name: '数据层提供 validateSystem 并输出初始化完成',
    file: 'config',
    pattern: /export function validateSystem\(\): boolean[\s\S]*console\.log\('数据层初始化完毕'\)/,
  },
  {
    name: '十二种茶底辅料组合均在配置表中出现',
    file: 'config',
    pattern: /(?=[\s\S]*base_green_add_none)(?=[\s\S]*base_green_add_sugar)(?=[\s\S]*base_green_add_flower)(?=[\s\S]*base_green_add_milk)(?=[\s\S]*base_black_add_none)(?=[\s\S]*base_black_add_sugar)(?=[\s\S]*base_black_add_flower)(?=[\s\S]*base_black_add_milk)(?=[\s\S]*base_oolong_add_none)(?=[\s\S]*base_oolong_add_sugar)(?=[\s\S]*base_oolong_add_flower)(?=[\s\S]*base_oolong_add_milk)/,
  },
  {
    name: 'BrewPanel 未选茶底时辅料点击无效',
    file: 'brewPanel',
    pattern: /selectAdditive\(additive: AdditiveId\)[\s\S]*if \(!this\.selectedBase\)[\s\S]*return;/,
  },
  {
    name: 'BrewPanel 冲泡后重置选择状态',
    file: 'brewPanel',
    pattern: /checkAndBrew\(\)[\s\S]*EventBus\.emit\(GameEventName\.RequestMakeRecipe, payload\)[\s\S]*this\.resetSelection\(\)/,
  },
  {
    name: 'BrewPanel 自动刷新按钮高亮与禁用状态',
    file: 'brewPanel',
    pattern: /refreshSelectionView\(\)[\s\S]*applyButtonState[\s\S]*button\.interactable = enabled[\s\S]*opacity\.opacity = enabled \? 255 : 130/,
  },
  {
    name: '制茶入口体力不足直接提示并返回',
    file: 'auto',
    pattern: /if \(PlayerData\.energy <= 0\)[\s\S]*HudMessage[\s\S]*return;/,
  },
  {
    name: '制作台满载时不扣体力',
    file: 'auto',
    pattern: /if \(this\.workstation\?\.isFull\(\)\)[\s\S]*return;[\s\S]*this\.makeRecipe\(recipeId, true\)[\s\S]*PlayerData\.energy = Math\.max/,
  },
  {
    name: '手动制茶成功后同步今日茶单并消耗体力',
    file: 'auto',
    pattern: /this\.promoteRecipeToTodayMenu\(recipeId\)[\s\S]*PlayerData\.energy = Math\.max\(0, PlayerData\.energy - 1\)[\s\S]*energyConsume/,
  },
  {
    name: '农场切换保留顶部信息层',
    file: 'auto',
    pattern: /if \(this\.topHudRoot\) \{[\s\S]*this\.topHudRoot\.active = true;[\s\S]*this\.topHudRoot\.setSiblingIndex\(isFarmPage \? 45 : 20\);/,
  },
  {
    name: '今日茶单影响顾客点单与小二自动制茶',
    file: 'auto',
    pattern: /getTodayMenuRecipeIds\(\)[\s\S]*menuRecipeIds[\s\S]*tryWaiterAutoAction[\s\S]*menuCandidates/,
  },
  {
    name: 'Scene-authored teahouse background keeps editor transform at runtime',
    file: 'auto',
    pattern: /usesSceneAuthoredBackground[\s\S]*manualBackground[\s\S]*usesSceneAuthoredBackground = true[\s\S]*applyBackgroundCover\(\)[\s\S]*if \(this\.usesSceneAuthoredBackground\) \{[\s\S]*return;/,
  },
  {
    name: 'Brew interface uses generated UI sprite assets',
    file: 'auto',
    pattern: /BREW_UI_ASSET_ROOT = 'image\/ui\/brew_interface'[\s\S]*getOrCreateAssetPanel\(teahousePageRoot, 'TeaHouseControlPanel'[\s\S]*TodayTeaSlot_\$\{index \+ 1\}_Icon[\s\S]*getOrCreateAssetPanel\(brewPanelNode, 'ProductStationTray'/,
  },
];

const failures = checks.filter((check) => !check.pattern.test(files[check.file]));
for (const assetName of requiredBrewInterfaceAssets) {
  const assetPath = path.join(root, 'assets/resources/image/ui/brew_interface', assetName);
  if (!fs.existsSync(assetPath)) {
    failures.push({ name: `Missing brew interface asset: ${assetName}`, file: 'asset', pattern: /never/ });
  }
}

if (failures.length > 0) {
  console.error('V1.0 loop validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure.name}`);
  }
  process.exit(1);
}

console.log(`V1.0 loop validation passed: ${checks.length} checks`);
