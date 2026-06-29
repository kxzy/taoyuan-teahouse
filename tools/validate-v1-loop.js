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
  progress: read('研发推进记录.md'),
  checklist: read('V1.0_玩法闭环验收清单.md'),
};

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
];

const failures = checks.filter((check) => !check.pattern.test(files[check.file]));

if (failures.length > 0) {
  console.error('V1.0 loop validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure.name}`);
  }
  process.exit(1);
}

console.log(`V1.0 loop validation passed: ${checks.length} checks`);
