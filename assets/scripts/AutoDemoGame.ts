import { _decorator, Button, Camera, Canvas, Color, Component, find, Graphics, Label, Layers, Node, ProgressBar, Rect, resources, Size, Sprite, SpriteFrame, Texture2D, UITransform, Vec3, view, Widget } from 'cc';
import { Customer } from './Customer';
import { CUSTOMER_TYPES, CustomerTypeId, getLevelConfig, getMaxDemoLevel, getRecipe, IngredientCostConfig, RecipeConfig, RecipeId, RECIPES, TEAHOUSE_DECORATION_VISUALS, TEAHOUSE_FURNITURE, TEAHOUSE_TABLE_FURNITURE, TEAHOUSE_TEXTURE_PATHS, TeahouseDecorationVisualConfig, TeahouseFurnitureConfig, TeahouseTableFurnitureConfig, TeahouseTextureKey } from './GameConfig';
import { calculateFarmYield, FARM_PLOT_ORDER, FarmPlotId, getFarmPlotConfig, getFarmUpgradeCost } from './FarmConfig';
import { DevelopedDrinkSave, GameSaveData, IngredientStock, SaveManager, StaffId, StaffMemberSave } from './SaveManager';
import { Workstation } from './Workstation';

const { ccclass } = _decorator;

type TextureKey = TeahouseTextureKey;
type MainTab = 'teahouse' | 'farm' | 'research' | 'decoration';
type IngredientKey = keyof IngredientStock;

interface ReadyTea {
  recipe: RecipeConfig;
  remainingFreshSeconds: number;
}

interface DevelopedRecipeRuntime extends RecipeConfig {
  isDeveloped: true;
  tier: string;
  taste: number;
  aroma: number;
  popularity: number;
  rarity: number;
}

interface DailyEventConfig {
  id: string;
  name: string;
  description: string;
  weight: number;
  spawnIntervalMultiplier?: number;
  incomeMultiplier?: number;
  readyTeaFreshSeconds?: number;
  supplyCost?: number;
  supplyBonus?: Partial<IngredientStock>;
  scholarUnlockLevel?: number;
  scholarWeightMultiplier?: number;
  gradeBonusMultiplier?: number;
  everyFifthServeBonus?: number;
  reputationBonusOnFifth?: number;
}

interface ServicePressure {
  waitingCups: number;
  urgentTables: number;
  queueCount: number;
  freeSeats: number;
}

const READY_TEA_LIMIT = 2;
const READY_TEA_FRESH_SECONDS = 10;
const BUSINESS_DAY_SECONDS = 150;
const FIRST_DAY_TARGET = 150;
const FIRST_DAY_FAST_ORDER_COUNT = 3;
const RESEARCH_COST: IngredientStock = { teaLeaf: 6, sugar: 3, flower: 3, fruit: 1 };
const DEVELOPED_RECIPE_MENU_LIMIT = 3;
const DEBUG_CONTROLS_DEFAULT_VISIBLE = false;
const WORKSTATION_SPEED_BY_LEVEL = [1, 1.25, 1.55, 1.9];
const EXTEND_BUSINESS_SECONDS = 30;
const WEEK_LENGTH_DAYS = 7;
const LONG_TERM_LOG_LIMIT = 14;
const SPECIAL_REQUEST_BASE_CHANCE = 0.05;
const SPECIAL_REQUEST_MAX_CHANCE = 0.15;
const SPECIAL_REQUEST_INCOME_MULTIPLIER = 1.25;
const STAFF_STAMINA_MAX = 100;
const WAITER_BASE_INTERVAL = 8;
const DESIGN_RESOLUTION_WIDTH = 720;
const DESIGN_RESOLUTION_HEIGHT = 1280;
const BACKGROUND_SOURCE_WIDTH = 1408;
const BACKGROUND_SOURCE_HEIGHT = 2503;
const DECORATION_TIP_BONUS_PER_BEAUTY = 0.001;

interface WeeklyGoalConfig {
  revenue: number;
  servedCups: number;
  sGrades: number;
  researchCount: number;
}

interface AchievementConfig {
  id: string;
  name: string;
  description: string;
  rewardText: string;
}

interface DecorationConfig {
  id: string;
  name: string;
  cost: number;
  beautyScore: number;
}

interface ActivityConfig {
  id: string;
  name: string;
  description: string;
  revenueMultiplier?: number;
  tipMultiplier?: number;
  patienceMultiplier?: number;
  farmYieldMultiplier?: number;
  researchCostMultiplier?: number;
}

const STAFF_NAMES: Record<StaffId, string> = {
  waiter: '小二',
  teaMaster: '茶师',
  buyer: '采办',
};

const ACHIEVEMENTS: AchievementConfig[] = [
  { id: 'first_day', name: '初开茶肆', description: '完成第 1 天经营', rewardText: '金币 +80' },
  { id: 'level_2', name: '小有起色', description: '店铺升到 2 级', rewardText: '茶叶 +10' },
  { id: 'serve_100', name: '四方来客', description: '累计服务 100 杯', rewardText: '金币 +300' },
  { id: 'perfect_day', name: '零失误营业', description: '单日 0 流失 0 浪费', rewardText: '糖 +10、花 +6' },
  { id: 'first_s', name: '完美一日', description: '获得 1 次 S 评级', rewardText: '雅致币 +30' },
  { id: 'streak_a_3', name: '连续好评', description: '连续 3 天 A 级以上', rewardText: '果 +5' },
  { id: 'research_1', name: '研发入门', description: '研发 1 次茶饮', rewardText: '金币 +100' },
  { id: 'research_ss', name: '神品问世', description: '研发出 SS 饮品', rewardText: '雅致币 +80' },
  { id: 'farm_all', name: '丰收茶园', description: '三个农场全部解锁', rewardText: '茶叶 +30' },
  { id: 'farm_max', name: '农场满级', description: '三个农场全部满级', rewardText: '金币 +1000' },
  { id: 'week_goal', name: '周周兴旺', description: '完成一次周目标', rewardText: '雅致币 +50' },
  { id: 'prestige_5', name: '茶名远扬', description: '声望达到 5 级', rewardText: '雅致币 +100' },
];

const DECORATIONS: DecorationConfig[] = [
  { id: 'wood_sign', name: '旧木招牌', cost: 30, beautyScore: 5 },
  { id: 'paper_lamp', name: '纸灯', cost: 25, beautyScore: 3 },
  { id: 'celadon_set', name: '青瓷茶具', cost: 45, beautyScore: 4 },
  { id: 'flower_vase', name: '山花瓶', cost: 35, beautyScore: 4 },
  { id: 'screen', name: '山水屏风', cost: 80, beautyScore: 8 },
];

const ACTIVITIES: ActivityConfig[] = [
  { id: 'none', name: '常规经营', description: '无活动加成' },
  { id: 'tea_fair', name: '品茶大会', description: '绿茶、红茶、茉莉收入翻倍', revenueMultiplier: 2 },
  { id: 'rush_challenge', name: '急单挑战', description: '客人耐心 -30%，小费翻倍', patienceMultiplier: 0.7, tipMultiplier: 2 },
  { id: 'vip_week', name: '贵客常驻', description: '整体收入 +10%，适合冲榜', revenueMultiplier: 1.1 },
  { id: 'harvest_day', name: '丰收日', description: '农场产出翻倍', farmYieldMultiplier: 2 },
  { id: 'research_fever', name: '研发热潮', description: '研发消耗降低 30%', researchCostMultiplier: 0.7 },
];

const DAILY_EVENTS: DailyEventConfig[] = [
  {
    id: 'none',
    name: '平常日',
    description: '无特殊变化，适合熟悉经营节奏',
    weight: 0,
  },
  {
    id: 'rain',
    name: '雨天',
    description: '客流 -20%，每单收入 +15%',
    weight: 25,
    spawnIntervalMultiplier: 1.2,
    incomeMultiplier: 1.15,
  },
  {
    id: 'exam_day',
    name: '赶考日',
    description: '书生 2 级出现，书生订单明显增加',
    weight: 25,
    scholarUnlockLevel: 2,
    scholarWeightMultiplier: 3,
  },
  {
    id: 'flower_market',
    name: '花市日',
    description: '补货价降到 60，补货额外花 +4',
    weight: 25,
    supplyCost: 60,
    supplyBonus: { flower: 4 },
  },
  {
    id: 'fragrant',
    name: '香气远扬',
    description: '客流 +15%，成品茶保鲜 8 秒',
    weight: 25,
    spawnIntervalMultiplier: 0.85,
    readyTeaFreshSeconds: 8,
  },
  {
    id: 'vip_visit',
    name: '贵客来访',
    description: '当天每第 5 单额外 +100 金币、口碑 +5',
    weight: 8,
    everyFifthServeBonus: 100,
    reputationBonusOnFifth: 5,
  },
  {
    id: 'shortage',
    name: '食材紧俏',
    description: '补货价升到 120，但评级奖励翻倍',
    weight: 10,
    supplyCost: 120,
    gradeBonusMultiplier: 2,
  },
];

const INGREDIENT_NAMES: Record<IngredientKey, string> = {
  teaLeaf: '茶叶',
  sugar: '糖',
  flower: '花',
  fruit: '果',
};

const TEXTURE_PATHS: Record<TextureKey, readonly string[]> = TEAHOUSE_TEXTURE_PATHS;

function addTextureSprite(node: Node, textureKey: TextureKey, width: number, height: number): Sprite {
  const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  const transform = node.getComponent(UITransform) ?? addUiTransform(node, width, height);
  transform.setContentSize(width, height);

  const paths = TEXTURE_PATHS[textureKey];
  const tryLoadPath = (index: number): void => {
    const path = paths[index];
    if (!path) {
      console.warn(`图片加载失败：${textureKey}。已尝试路径：${paths.join('、')}。请确认图片在 assets/resources/image/ 下并已刷新导入。`);
      return;
    }

    resources.load(path, Texture2D, (textureError: Error | null, texture: Texture2D | null) => {
      if (!textureError && texture) {
        const spriteFrame = new SpriteFrame();
        spriteFrame.reset({
          originalSize: new Size(texture.width, texture.height),
          rect: new Rect(0, 0, texture.width, texture.height),
          texture,
        });
        sprite.spriteFrame = spriteFrame;
        console.log(`图片加载成功：${path}`);
        return;
      }

      resources.load(path, SpriteFrame, (frameError: Error | null, spriteFrame: SpriteFrame | null) => {
        if (!frameError && spriteFrame) {
          sprite.spriteFrame = spriteFrame;
          console.log(`SpriteFrame 加载成功：${path}`);
          return;
        }

        if (index < paths.length - 1) {
          console.warn(`图片路径未命中，尝试回退：${path}`, textureError, frameError);
          tryLoadPath(index + 1);
          return;
        }

        console.warn(`图片加载失败：${textureKey}。已尝试路径：${paths.join('、')}。`, textureError, frameError);
      });
    });
  };

  tryLoadPath(0);
  return sprite;
}

function createImageNode(name: string, textureKey: TextureKey, width: number, height: number): Node {
  const node = new Node(name);
  addUiTransform(node, width, height);
  addTextureSprite(node, textureKey, width, height);
  return node;
}

function addUiTransform(node: Node, width: number, height: number): UITransform {
  const transform = node.addComponent(UITransform);
  transform.setContentSize(width, height);
  return transform;
}

function addPanelGraphics(node: Node, width: number, height: number, color: Color): Graphics {
  const graphics = node.addComponent(Graphics);
  graphics.fillColor = color;
  graphics.roundRect(-width / 2, -height / 2, width, height, 12);
  graphics.fill();
  return graphics;
}

function createPanel(name: string, width: number, height: number, color: Color): Node {
  const node = new Node(name);
  addUiTransform(node, width, height);
  addPanelGraphics(node, width, height, color);
  return node;
}

function createLabel(name: string, text: string, fontSize = 24, color = new Color(60, 45, 30, 255)): Node {
  const node = new Node(name);
  const label = node.addComponent(Label);
  label.string = text;
  label.fontSize = fontSize;
  label.lineHeight = fontSize + 8;
  label.color = color;
  return node;
}

function createButton(name: string, text: string, width: number, height: number, callback: () => void): Node {
  const node = createPanel(name, width, height, new Color(235, 185, 95, 245));
  const button = node.addComponent(Button);
  button.transition = Button.Transition.COLOR;
  button.normalColor = new Color(225, 185, 115, 255);
  button.pressedColor = new Color(190, 145, 80, 255);
  button.hoverColor = new Color(240, 205, 135, 255);

  const labelNode = createLabel(`${name}_Label`, text, 13, new Color(55, 35, 22, 255));
  node.addChild(labelNode);
  labelNode.setPosition(0, -1, 0);

  node.on(Button.EventType.CLICK, callback);
  return node;
}

function createProgressBar(name: string, width: number, height: number): Node {
  const root = createPanel(name, width, height, new Color(85, 70, 50, 255));
  const bar = createPanel(`${name}_Bar`, width, height, new Color(85, 190, 95, 255));
  root.addChild(bar);
  bar.setPosition(0, 0, 0);
  const progress = root.addComponent(ProgressBar);
  progress.barSprite = null;
  progress.mode = ProgressBar.Mode.HORIZONTAL;
  progress.totalLength = width;
  progress.progress = 0;
  return root;
}

function ensureCamera(canvasNode: Node): void {
  let cameraNode = find('DemoCamera');
  if (!cameraNode) {
    cameraNode = new Node('DemoCamera');
    canvasNode.parent?.addChild(cameraNode);
  }

  cameraNode.setPosition(0, 0, 1000);
  const camera = cameraNode.getComponent(Camera) ?? cameraNode.addComponent(Camera);
  camera.projection = Camera.ProjectionType.ORTHO;
  camera.orthoHeight = DESIGN_RESOLUTION_HEIGHT / 2;
  camera.visibility = Layers.Enum.UI_2D | Layers.Enum.DEFAULT;

  const canvas = canvasNode.getComponent(Canvas);
  if (canvas) {
    canvas.cameraComponent = camera;
  }
}

function findNodeByName(parent: Node, name: string): Node | null {
  for (const child of parent.children) {
    if (child.name === name) {
      return child;
    }

    const found = findNodeByName(child, name);
    if (found) {
      return found;
    }
  }

  return null;
}

function isSceneTableGroupNode(node: Node): boolean {
  return /^Table_Group(?:_\d+)?$/.test(node.name) || /^Table_\d+_Group$/.test(node.name);
}

function collectSceneTableGroupNodes(parent: Node): Node[] {
  const nodes: Node[] = [];
  const visit = (node: Node): void => {
    for (const child of node.children) {
      if (isSceneTableGroupNode(child)) {
        nodes.push(child);
        continue;
      }
      visit(child);
    }
  };
  visit(parent);
  return nodes
    .sort((a, b) => {
      const yDiff = b.position.y - a.position.y;
      if (Math.abs(yDiff) > 48) {
        return yDiff;
      }
      return a.position.x - b.position.x;
    })
    .slice(0, TEAHOUSE_TABLE_FURNITURE.length);
}

function applyLayerRecursively(node: Node, layer: number): void {
  node.layer = layer;
  for (const child of node.children) {
    applyLayerRecursively(child, layer);
  }
}

function removeGeneratedTableBadges(node: Node): void {
  const children = [...node.children];
  for (const child of children) {
    if (/^Table_\d+_(Badge|StatusBadge)$/.test(child.name)) {
      child.removeFromParent();
      child.destroy();
    }
  }
}

function isManualCustomerNode(node: Node): boolean {
  return /^(Manual)?(Customer|Scholar|书生|赶考书生)(Template)?(_\d+)?$/.test(node.name)
    || node.name === 'Customer_赶考书生'
    || node.name === 'Scholar_Template';
}

function findManualCustomerTemplate(parent: Node): Node | null {
  for (const child of parent.children) {
    if (isManualCustomerNode(child)) {
      return child;
    }

    const found = findManualCustomerTemplate(child);
    if (found) {
      return found;
    }
  }
  return null;
}

function clearGeneratedCustomerUi(node: Node): void {
  const generatedNames = ['OrderBubble_对话框', 'PatienceBar'];
  for (const name of generatedNames) {
    const child = node.getChildByName(name);
    if (!child) {
      continue;
    }
    child.removeFromParent();
    child.destroy();
  }
}

function getOrAddUiTransform(node: Node, width: number, height: number): UITransform {
  const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
  transform.setContentSize(width, height);
  return transform;
}

function getOrCreateChild(parent: Node, name: string): Node {
  const existed = parent.getChildByName(name);
  if (existed) {
    return existed;
  }

  const node = new Node(name);
  parent.addChild(node);
  node.setPosition(0, 0, 0);
  node.layer = Layers.Enum.UI_2D;
  return node;
}

function getOrCreateManualLayer(root: Node, name: string, siblingIndex: number): Node {
  const existed = findNodeByName(root, name);
  const node = existed ?? getOrCreateChild(root, name);
  node.setSiblingIndex(siblingIndex);
  applyLayerRecursively(node, Layers.Enum.UI_2D);
  return node;
}

function clearChildrenByName(parent: Node, names: string[]): void {
  for (const name of names) {
    const child = parent.getChildByName(name);
    if (!child) {
      continue;
    }
    child.removeFromParent();
    child.destroy();
  }
}

function getIngredientCostEntries(cost: IngredientCostConfig): Array<[IngredientKey, number]> {
  return (Object.keys(cost) as IngredientKey[])
    .map((key) => [key, cost[key] ?? 0] as [IngredientKey, number])
    .filter(([, amount]) => amount > 0);
}

function getRestaurantTableConfig(index: number): TeahouseTableFurnitureConfig {
  return TEAHOUSE_TABLE_FURNITURE[index] ?? TEAHOUSE_TABLE_FURNITURE[TEAHOUSE_TABLE_FURNITURE.length - 1];
}

function findCustomFurnitureNode(parent: Node, config: { fallbackNodeNames: string[] }): Node | null {
  for (const nodeName of config.fallbackNodeNames) {
    const node = findNodeByName(parent, nodeName);
    if (node) {
      return node;
    }
  }
  return null;
}

function getFurnitureFallbackColor(config: TeahouseFurnitureConfig): Color {
  return new Color(config.color.r, config.color.g, config.color.b, config.color.a);
}

function getDecorationFallbackColor(config: TeahouseDecorationVisualConfig): Color {
  return new Color(config.fallbackColor.r, config.fallbackColor.g, config.fallbackColor.b, config.fallbackColor.a);
}

function createConfiguredDecorationNode(config: TeahouseDecorationVisualConfig): Node {
  const node = createPanel(config.nodeName, config.width, config.height, getDecorationFallbackColor(config));
  const image = createImageNode(`${config.nodeName}_Image`, config.textureKey, config.width, config.height);
  node.addChild(image);
  image.setPosition(0, 0, 0);
  image.setSiblingIndex(0);
  return node;
}

function createConfiguredFurnitureNode(config: TeahouseFurnitureConfig): Node {
  const node = createPanel(config.nodeName, config.width, config.height, getFurnitureFallbackColor(config));
  if (config.textureKey) {
    const image = createImageNode(`${config.nodeName}_Image`, config.textureKey, config.width, config.height);
    node.addChild(image);
    image.setPosition(0, 0, 0);
    image.setSiblingIndex(0);
  }
  return node;
}

function createRestaurantTableNode(config: TeahouseTableFurnitureConfig): Node {
  const node = createImageNode(config.nodeName, config.textureKey, config.width, config.height);
  node.setPosition(config.x, config.y, 0);
  return node;
}

function getRestaurantTablePosition(index: number): Vec3 {
  const config = getRestaurantTableConfig(index);
  return new Vec3(config.x, config.y, 0);
}

function getRestaurantTableSize(index: number): { width: number; height: number } {
  const config = getRestaurantTableConfig(index);
  return { width: config.width, height: config.height };
}

function getRecipeIconConfig(recipeId: RecipeId): { textureKey?: TextureKey; text: string; color: Color } {
  switch (recipeId) {
    case RecipeId.GreenTea:
      return { textureKey: 'greenTea', text: '绿', color: new Color(116, 176, 92, 230) };
    case RecipeId.BlackTea:
      return { textureKey: 'blackTea', text: '红', color: new Color(166, 92, 62, 230) };
    case RecipeId.JasmineTea:
      return { textureKey: 'greenTea', text: '茉', color: new Color(210, 184, 92, 230) };
    case RecipeId.OsmanthusTea:
      return { text: '桂', color: new Color(221, 157, 64, 230) };
    case RecipeId.PearFruitTea:
      return { text: '梨', color: new Color(189, 204, 98, 230) };
    case RecipeId.PeachBrew:
      return { text: '桃', color: new Color(221, 126, 128, 230) };
    default:
      return { text: '茶', color: new Color(155, 120, 78, 230) };
  }
}

function addRecipeVisualToButton(buttonNode: Node, recipeId: RecipeId): void {
  const config = getRecipeIconConfig(recipeId);
  const badge = createPanel(`${buttonNode.name}_IconBadge`, 32, 32, config.color);
  buttonNode.addChild(badge);
  badge.setPosition(-43, 6, 0);

  if (config.textureKey) {
    const image = createImageNode(`${buttonNode.name}_IconImage`, config.textureKey, 28, 28);
    badge.addChild(image);
    image.setPosition(0, 0, 0);
    return;
  }

  const iconLabelNode = createLabel(`${buttonNode.name}_IconText`, config.text, 17, new Color(255, 245, 220, 255));
  badge.addChild(iconLabelNode);
  iconLabelNode.setPosition(0, -1, 0);
}

@ccclass('AutoDemoGame')
export class AutoDemoGame extends Component {
  private saveData: GameSaveData = SaveManager.load();
  private levelLabel: Label | null = null;
  private coinsLabel: Label | null = null;
  private messageLabel: Label | null = null;
  private goalLabel: Label | null = null;
  private ingredientLabel: Label | null = null;
  private actionHintLabel: Label | null = null;
  private urgentAlertLabel: Label | null = null;
  private readyTeaLabel: Label | null = null;
  private settlementPanel: Node | null = null;
  private settlementLabel: Label | null = null;
  private recipeButtonLabels: Partial<Record<RecipeId, Label>> = {};
  private upgradeButtonLabel: Label | null = null;
  private supplyButtonLabel: Label | null = null;
  private researchButtonLabel: Label | null = null;
  private nextDayButtonLabel: Label | null = null;
  private farmButtonLabels: Partial<Record<FarmPlotId, Label>> = {};
  private farmDescriptionLabels: Partial<Record<FarmPlotId, Label>> = {};
  private farmPanel: Node | null = null;
  private farmSummaryLabel: Label | null = null;
  private teahousePageRoot: Node | null = null;
  private researchPanel: Node | null = null;
  private researchSummaryLabel: Label | null = null;
  private researchListLabel: Label | null = null;
  private mainTabLabels: Partial<Record<MainTab, Label>> = {};
  private currentMainTab: MainTab = 'teahouse';
  private helpPanel: Node | null = null;
  private debugControlsRoot: Node | null = null;
  private debugToggleLabel: Label | null = null;
  private debugControlsVisible = true;
  private customerRoot: Node | null = null;
  private manualCustomerTemplate: Node | null = null;
  private runtimeRoot: Node | null = null;
  private decorationVisualRoot: Node | null = null;
  private controlLayer: Node | null = null;
  private workstation: Workstation | null = null;
  private seatNodes: Node[] = [];
  private seatStatusLabels: Array<Label | null> = [];
  private customers: Customer[] = [];
  private readyTeas: ReadyTea[] = [];
  private occupiedSeats = new Set<number>();
  private spawnTimer = 1;
  private spawnPaused = false;
  private lostCount = 0;
  private servedCount = 0;
  private wastedTeaCount = 0;
  private serveStreak = 0;
  private reputationScore = 100;
  private businessDay = 1;
  private businessDayTimer = BUSINESS_DAY_SECONDS;
  private dayRevenue = 0;
  private dayTarget = 180;
  private dayServedCount = 0;
  private dayLostCount = 0;
  private dayWastedTeaCount = 0;
  private isDayEnded = false;
  private lastDayGrade = '';
  private activeDailyEvent: DailyEventConfig = DAILY_EVENTS[0];
  private developedRecipeMenu: DevelopedRecipeRuntime[] = [];
  private specialRequestCustomers = new Set<Customer>();
  private staffTimer = 0;
  private sameRecipeStreak = 0;
  private lastQueuedRecipeId = '';
  private productionRhythmBonus = 0;
  private idlePreparationBonus = 0;
  private workstationIdleSeconds = 0;
  private extendButtonLabel: Label | null = null;
  private staffPanel: Node | null = null;
  private staffSummaryLabel: Label | null = null;
  private staffButtonLabels: Partial<Record<StaffId, Label>> = {};
  private decorationPanel: Node | null = null;
  private decorationSummaryLabel: Label | null = null;
  private decorationButtonLabels: Record<string, Label> = {};
  private backgroundNode: Node | null = null;
  private safeAreaRoot: Node | null = null;
  private topHudRoot: Node | null = null;
  private mainPlayRoot: Node | null = null;
  private bottomHudRoot: Node | null = null;
  private debugRailRoot: Node | null = null;
  private entrancePosition = new Vec3(-360, 235, 0);
  private exitPosition = new Vec3(360, 235, 0);

  onLoad(): void {
    const canvas = this.node.getComponent(Canvas);
    if (canvas) {
      canvas.fitWidth = true;
      canvas.fitHeight = false;
      canvas.alignCanvasWithScreen = true;
    }
    this.applyAdaptiveLayout();
    view.setResizeCallback(() => {
      this.applyAdaptiveLayout();
    });
  }

  start(): void {
    this.saveData = SaveManager.load();
    this.businessDay = this.saveData.businessDay;
    this.syncUnlockedTablesWithLevel();
    const workstationSyncText = this.syncWorkstationLevelWithShopLevel();
    if (workstationSyncText) {
      SaveManager.save(this.saveData);
    }
    this.refreshDevelopedRecipeMenu();
    this.buildScene();
    this.dayTarget = this.calculateDayTarget();
    this.activeDailyEvent = this.pickDailyEvent();
    this.initializeLongTermSystems();
    this.workstation?.setTeaReadyCallback((recipe) => this.onTeaReady(recipe));
    this.hideSettlementPanel();
    this.refreshHud(`餐厅版启动：${getLevelConfig(this.saveData.level).seatCount} 张桌｜首日目标 ${FIRST_DAY_TARGET} 金币｜先完成 3 单熟悉流程`);
  }

  update(deltaTime: number): void {
    this.updateReadyTeas(deltaTime);
    this.updateBusinessDay(deltaTime);
    this.updateLongTermAutomation(deltaTime);

    if (this.spawnPaused || this.isDayEnded) {
      return;
    }

    this.spawnTimer -= deltaTime;
    const levelConfig = getLevelConfig(this.saveData.level);
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.getAdjustedSpawnInterval(levelConfig.customerSpawnInterval);
      this.trySpawnCustomer();
    }
  }

  private buildScene(): void {
    const root = this.node;
    ensureCamera(root);
    root.layer = Layers.Enum.UI_2D;
    applyLayerRecursively(root, Layers.Enum.UI_2D);

    const backgroundLayer = getOrCreateManualLayer(root, 'BackgroundLayer', 0);
    const manualBackground = findNodeByName(root, 'bg_teahouse') ?? findNodeByName(root, 'BackgroundImage_茶铺');
    if (manualBackground) {
      this.backgroundNode = null;
      manualBackground.setSiblingIndex(0);
    } else {
      const bg = createImageNode('BackgroundImage_茶铺', 'background', 1408, 2503);
      backgroundLayer.addChild(bg);
      this.backgroundNode = bg;
    }

    const safeAreaRoot = getOrCreateManualLayer(root, 'UI_Layer', 10);
    this.safeAreaRoot = safeAreaRoot;
    this.runtimeRoot = safeAreaRoot;

    const topHudRoot = getOrCreateManualLayer(safeAreaRoot, 'Top_Panel', 20);
    clearChildrenByName(topHudRoot, ['TopStatusBar', 'GuidePanel', 'IngredientLabel', 'UrgentAlertPanel']);
    this.topHudRoot = topHudRoot;

    const mainPlayRoot = getOrCreateManualLayer(safeAreaRoot, 'Middle_PlayArea', 30);
    this.mainPlayRoot = mainPlayRoot;

    const decorationVisualRoot = getOrCreateManualLayer(mainPlayRoot, 'DecorationVisualRoot', 150);
    decorationVisualRoot.removeAllChildren();
    this.decorationVisualRoot = decorationVisualRoot;

    const bottomHudRoot = getOrCreateManualLayer(safeAreaRoot, 'Bottom_Panel', 40);
    clearChildrenByName(bottomHudRoot, ['WorkstationPanel', 'TeaHousePageRoot', 'MainTabBar']);
    this.bottomHudRoot = bottomHudRoot;

    const controlLayer = getOrCreateManualLayer(root, 'ControlLayer', 9999);
    clearChildrenByName(controlLayer, ['FarmPanel', 'ResearchPanel', 'StaffPanel', 'DecorationPanel', 'HelpPanel']);
    this.controlLayer = controlLayer;

    const debugRailRoot = getOrCreateManualLayer(controlLayer, 'Debug_Rail', 10000);
    debugRailRoot.removeAllChildren();
    this.debugRailRoot = debugRailRoot;

    console.log('AutoDemoGame started in manual scene mode.');

    const topBar = createPanel('TopStatusBar', 680, 96, new Color(45, 28, 18, 190));
    topHudRoot.addChild(topBar);
    topBar.setPosition(0, 560, 0);

    const levelNode = createLabel('LevelLabel', '第1天  口碑100', 16, new Color(255, 236, 195, 255));
    topBar.addChild(levelNode);
    levelNode.setPosition(-220, 24, 0);
    this.levelLabel = levelNode.getComponent(Label);

    const coinsNode = createLabel('CoinsLabel', '金币 0', 18, new Color(255, 236, 195, 255));
    topBar.addChild(coinsNode);
    coinsNode.setPosition(220, 24, 0);
    this.coinsLabel = coinsNode.getComponent(Label);

    const messageNode = createLabel('MessageLabel', '看订单，点茶饮，自动上茶', 13, new Color(255, 236, 195, 255));
    topBar.addChild(messageNode);
    messageNode.setPosition(0, -26, 0);
    this.messageLabel = messageNode.getComponent(Label);

    const guidePanel = createPanel('GuidePanel', 640, 58, new Color(45, 28, 18, 118));
    topHudRoot.addChild(guidePanel);
    guidePanel.setPosition(0, 486, 0);

    const goalNode = createLabel('GoalLabel', '', 14, new Color(255, 245, 220, 255));
    guidePanel.addChild(goalNode);
    goalNode.setPosition(0, 16, 0);
    this.goalLabel = goalNode.getComponent(Label);

    const actionHintNode = createLabel('ActionHintLabel', '', 14, new Color(255, 226, 150, 255));
    guidePanel.addChild(actionHintNode);
    actionHintNode.setPosition(0, -14, 0);
    this.actionHintLabel = actionHintNode.getComponent(Label);

    const ingredientNode = createLabel('IngredientLabel', '', 13, new Color(255, 245, 220, 230));
    topHudRoot.addChild(ingredientNode);
    ingredientNode.setPosition(0, 456, 0);
    this.ingredientLabel = ingredientNode.getComponent(Label);

    const urgentAlertPanel = createPanel('UrgentAlertPanel', 220, 54, new Color(120, 32, 22, 190));
    topHudRoot.addChild(urgentAlertPanel);
    urgentAlertPanel.setPosition(-232, 390, 0);
    const urgentAlertNode = createLabel('UrgentAlertLabel', '无急单', 14, new Color(255, 238, 210, 255));
    urgentAlertPanel.addChild(urgentAlertNode);
    urgentAlertNode.setPosition(0, -1, 0);
    this.urgentAlertLabel = urgentAlertNode.getComponent(Label);

    this.customerRoot = getOrCreateManualLayer(mainPlayRoot, 'CustomerRoot', 2000);
    this.customerRoot.removeAllChildren();
    this.manualCustomerTemplate = findManualCustomerTemplate(root);
    if (this.manualCustomerTemplate) {
      this.manualCustomerTemplate.active = false;
    }

    const customEntrance = findNodeByName(root, 'EntrancePoint');
    const customExit = findNodeByName(root, 'ExitPoint');
    if (customEntrance) {
      this.entrancePosition = customEntrance.position.clone();
    }
    if (customExit) {
      this.exitPosition = customExit.position.clone();
    }

    this.seatNodes = [];
    this.seatStatusLabels = [];
    const sceneTableGroups = collectSceneTableGroupNodes(root);
    for (let i = 0; i < TEAHOUSE_TABLE_FURNITURE.length; i += 1) {
      const tableConfig = getRestaurantTableConfig(i);
      const customSeat = sceneTableGroups[i] ?? findCustomFurnitureNode(root, tableConfig);
      const tableSize = getRestaurantTableSize(i);
      const seat = customSeat ?? createRestaurantTableNode(tableConfig);
      if (customSeat) {
        removeGeneratedTableBadges(seat);
        applyLayerRecursively(seat, Layers.Enum.UI_2D);
      }
      const tableBadge = createPanel(`Table_${i + 1}_Badge`, 42, 22, new Color(62, 38, 24, 170));
      seat.addChild(tableBadge);
      tableBadge.setPosition(0, tableSize.height * tableConfig.badgeOffsetRatio, 0);
      const label = createLabel(`Table_${i + 1}_Label`, `${i + 1}桌`, 11, new Color(255, 245, 220, 230));
      tableBadge.addChild(label);
      label.setPosition(0, -1, 0);

      const statusBadge = createPanel(`Table_${i + 1}_StatusBadge`, 54, 22, new Color(82, 125, 72, 165));
      seat.addChild(statusBadge);
      statusBadge.setPosition(0, tableSize.height * tableConfig.statusOffsetRatio, 0);
      const statusLabelNode = createLabel(`Table_${i + 1}_StatusLabel`, '空座', 11, new Color(255, 245, 220, 230));
      statusBadge.addChild(statusLabelNode);
      statusLabelNode.setPosition(0, -1, 0);

      if (customSeat && customSeat.parent !== mainPlayRoot) {
        customSeat.removeFromParent();
        mainPlayRoot.addChild(customSeat);
      } else if (!customSeat) {
        mainPlayRoot.addChild(seat);
      }
      if (!customSeat) {
        seat.setPosition(getRestaurantTablePosition(i));
      }
      seat.setSiblingIndex(i);
      this.seatNodes.push(seat);
      this.seatStatusLabels.push(statusLabelNode.getComponent(Label));
    }
    if (this.customerRoot) {
      this.customerRoot.setSiblingIndex(2000);
    }
    this.refreshDecorationVisuals();
    this.refreshSeatVisibility();

    const workstationConfig = TEAHOUSE_FURNITURE.workstationCounter;
    const customWorkstationNode = findCustomFurnitureNode(root, workstationConfig);
    const workstationNode = customWorkstationNode ?? createConfiguredFurnitureNode(workstationConfig);
    bottomHudRoot.addChild(workstationNode);
    workstationNode.setPosition(0, -430, 0);
    const workstation = workstationNode.addComponent(Workstation);
    this.workstation = workstation;

    const queueLabelNode = createLabel('QueueLabel', '制作：空闲｜排队：0/3', 15, new Color(255, 245, 220, 255));
    workstationNode.addChild(queueLabelNode);
    queueLabelNode.setPosition(0, workstationConfig.labelArea.queueY, 0);
    workstation.queueLabel = queueLabelNode.getComponent(Label);

    const progressNode = createProgressBar('WorkstationProgress', 360, 12);
    workstationNode.addChild(progressNode);
    progressNode.setPosition(0, workstationConfig.labelArea.progressY, 0);
    workstation.progressBar = progressNode.getComponent(ProgressBar);
    this.applyWorkstationLevel();

    const readyTeaNode = createLabel('ReadyTeaLabel', '成品台：空', 15, new Color(255, 245, 220, 255));
    workstationNode.addChild(readyTeaNode);
    readyTeaNode.setPosition(0, workstationConfig.labelArea.readyTeaY, 0);
    this.readyTeaLabel = readyTeaNode.getComponent(Label);

    const settlementPanel = createPanel('SettlementPanel', 560, 238, new Color(55, 32, 20, 225));
    mainPlayRoot.addChild(settlementPanel);
    settlementPanel.setPosition(0, 78, 0);
    settlementPanel.active = false;
    settlementPanel.setSiblingIndex(8888);
    this.settlementPanel = settlementPanel;

    const settlementTitleNode = createLabel('SettlementTitleLabel', '今日结算', 24, new Color(255, 226, 160, 255));
    settlementPanel.addChild(settlementTitleNode);
    settlementTitleNode.setPosition(0, 86, 0);

    const settlementLabelNode = createLabel('SettlementLabel', '', 17, new Color(255, 245, 220, 255));
    settlementPanel.addChild(settlementLabelNode);
    settlementLabelNode.setPosition(0, -18, 0);
    this.settlementLabel = settlementLabelNode.getComponent(Label);

    const teahousePageRoot = new Node('TeaHousePageRoot');
    bottomHudRoot.addChild(teahousePageRoot);
    teahousePageRoot.setSiblingIndex(9998);
    this.teahousePageRoot = teahousePageRoot;

    const buttonRows: Array<{ name: string; text: string; x: number; y: number; callback: () => void; recipeId?: RecipeId; role?: 'upgrade' | 'supply' | 'nextDay' | 'extend' | 'help'; width?: number; height?: number }> = [
      { name: 'BtnGreenTea', text: '绿茶', x: -240, y: -490, callback: () => this.enqueueRecipe(RecipeId.GreenTea), recipeId: RecipeId.GreenTea, width: 142 },
      { name: 'BtnBlackTea', text: '红茶', x: -80, y: -490, callback: () => this.enqueueRecipe(RecipeId.BlackTea), recipeId: RecipeId.BlackTea, width: 142 },
      { name: 'BtnJasmineTea', text: '茉莉', x: 80, y: -490, callback: () => this.enqueueRecipe(RecipeId.JasmineTea), recipeId: RecipeId.JasmineTea, width: 142 },
      { name: 'BtnOsmanthusTea', text: '桂花', x: 240, y: -490, callback: () => this.enqueueRecipe(RecipeId.OsmanthusTea), recipeId: RecipeId.OsmanthusTea, width: 142 },
      { name: 'BtnPearFruitTea', text: '雪梨', x: -160, y: -548, callback: () => this.enqueueRecipe(RecipeId.PearFruitTea), recipeId: RecipeId.PearFruitTea, width: 142 },
      { name: 'BtnPeachBrew', text: '桃酿', x: 0, y: -548, callback: () => this.enqueueRecipe(RecipeId.PeachBrew), recipeId: RecipeId.PeachBrew, width: 142 },
      { name: 'BtnBuySupplies', text: '补货', x: 160, y: -548, callback: () => this.buySupplies(), role: 'supply', width: 112, height: 40 },
      { name: 'BtnUpgrade', text: '升级', x: 300, y: -548, callback: () => this.upgradeShop(), role: 'upgrade', width: 112, height: 40 },
      { name: 'BtnExtendDay', text: '延长', x: -240, y: -604, callback: () => this.extendBusinessDay(), role: 'extend', width: 112, height: 40 },
      { name: 'BtnNextDay', text: '打烊', x: -80, y: -604, callback: () => this.handleDayButton(), role: 'nextDay', width: 112, height: 40 },
      { name: 'BtnHelp', text: '说明', x: 80, y: -604, callback: () => this.showHelpPanel(), role: 'help', width: 82, height: 34 },
    ];

    const debugButtons: Array<{ name: string; text: string; x: number; y: number; callback: () => void; width?: number; height?: number }> = [
      { name: 'BtnDebugSpawn', text: 'Debug\n刷客', x: 0, y: 60, callback: () => this.trySpawnCustomer(true), width: 82, height: 34 },
      { name: 'BtnDebugClear', text: 'Debug\n清档', x: 0, y: 20, callback: () => this.debugClearSave(), width: 82, height: 34 },
      { name: 'BtnDebugLevel', text: 'Debug\n升1级', x: 0, y: -20, callback: () => this.debugLevelUp(), width: 82, height: 34 },
    ];

    this.recipeButtonLabels = {};
    this.upgradeButtonLabel = null;
    this.supplyButtonLabel = null;
    this.researchButtonLabel = null;
    this.nextDayButtonLabel = null;
    this.extendButtonLabel = null;
    this.farmButtonLabels = {};
    this.staffButtonLabels = {};
    this.decorationButtonLabels = {};
    this.mainTabLabels = {};
    this.debugControlsRoot = null;
    this.debugToggleLabel = null;

    for (const config of buttonRows) {
      const button = createButton(config.name, config.text, config.width ?? 128, config.height ?? 46, config.callback);
      teahousePageRoot.addChild(button);
      button.setSiblingIndex(9999);
      button.setPosition(config.x, config.y, 0);
      if (config.recipeId) {
        addRecipeVisualToButton(button, config.recipeId);
      }
      const buttonLabel = button.getChildByName(`${config.name}_Label`)?.getComponent(Label) ?? null;
      if (config.recipeId && buttonLabel) {
        this.recipeButtonLabels[config.recipeId] = buttonLabel;
      }
      if (config.role === 'upgrade') {
        this.upgradeButtonLabel = buttonLabel;
      } else if (config.role === 'supply') {
        this.supplyButtonLabel = buttonLabel;
      } else if (config.role === 'nextDay') {
        this.nextDayButtonLabel = buttonLabel;
      } else if (config.role === 'extend') {
        this.extendButtonLabel = buttonLabel;
      }
    }

    this.buildMainTabBar(bottomHudRoot);

    const debugToggleButton = createButton('BtnDebugToggle', 'Debug', 82, 34, () => this.toggleDebugControls());
    debugRailRoot.addChild(debugToggleButton);
    debugToggleButton.setSiblingIndex(9999);
    debugToggleButton.setPosition(0, 104, 0);
    this.debugToggleLabel = debugToggleButton.getChildByName('BtnDebugToggle_Label')?.getComponent(Label) ?? null;

    const debugRoot = new Node('DebugControlsRoot');
    debugRailRoot.addChild(debugRoot);
    debugRoot.setSiblingIndex(9999);
    this.debugControlsRoot = debugRoot;

    for (const config of debugButtons) {
      const button = createButton(config.name, config.text, config.width ?? 82, config.height ?? 34, config.callback);
      debugRoot.addChild(button);
      button.setSiblingIndex(9999);
      button.setPosition(config.x, config.y, 0);
    }
    this.refreshDebugControls();

    this.buildFarmPanel(controlLayer);
    this.buildResearchPanel(controlLayer);
    this.buildStaffPanel(controlLayer);
    this.buildDecorationPanel(controlLayer);
    this.buildHelpPanel(controlLayer);
    this.applyAdaptiveLayout();
  }


  private applyAdaptiveLayout(): void {
    this.applyBackgroundCover();
    this.applySafeAreaLayout();
  }

  private applyBackgroundCover(): void {
    if (!this.backgroundNode) {
      return;
    }

    const visible = view.getVisibleSize();
    const coverScale = Math.max(
      visible.width / BACKGROUND_SOURCE_WIDTH,
      visible.height / BACKGROUND_SOURCE_HEIGHT,
    );
    this.backgroundNode.setScale(coverScale, coverScale, 1);
    this.backgroundNode.setPosition(0, 0, 0);
  }

  private applySafeAreaLayout(): void {
    if (this.safeAreaRoot) {
      const ui = this.safeAreaRoot.getComponent(UITransform) ?? this.safeAreaRoot.addComponent(UITransform);
      ui.setContentSize(DESIGN_RESOLUTION_WIDTH, DESIGN_RESOLUTION_HEIGHT);
      this.safeAreaRoot.setPosition(0, 0, 0);
      const widget = this.safeAreaRoot.getComponent(Widget) ?? this.safeAreaRoot.addComponent(Widget);
      widget.isAlignHorizontalCenter = true;
      widget.isAlignVerticalCenter = true;
      widget.horizontalCenter = 0;
      widget.verticalCenter = 0;
      widget.updateAlignment();
    }

    if (this.topHudRoot) {
      const ui = this.topHudRoot.getComponent(UITransform) ?? this.topHudRoot.addComponent(UITransform);
      ui.setContentSize(DESIGN_RESOLUTION_WIDTH, DESIGN_RESOLUTION_HEIGHT);
      this.topHudRoot.setPosition(0, 0, 0);
      const widget = this.topHudRoot.getComponent(Widget) ?? this.topHudRoot.addComponent(Widget);
      widget.isAlignTop = true;
      widget.top = 0;
      widget.isAlignHorizontalCenter = true;
      widget.horizontalCenter = 0;
      widget.updateAlignment();
    }

    if (this.mainPlayRoot) {
      const ui = this.mainPlayRoot.getComponent(UITransform) ?? this.mainPlayRoot.addComponent(UITransform);
      ui.setContentSize(DESIGN_RESOLUTION_WIDTH, DESIGN_RESOLUTION_HEIGHT);
      this.mainPlayRoot.setPosition(0, 0, 0);
      const widget = this.mainPlayRoot.getComponent(Widget) ?? this.mainPlayRoot.addComponent(Widget);
      widget.isAlignHorizontalCenter = true;
      widget.horizontalCenter = 0;
      widget.isAlignVerticalCenter = true;
      widget.verticalCenter = 0;
      widget.updateAlignment();
    }

    if (this.bottomHudRoot) {
      const ui = this.bottomHudRoot.getComponent(UITransform) ?? this.bottomHudRoot.addComponent(UITransform);
      ui.setContentSize(DESIGN_RESOLUTION_WIDTH, DESIGN_RESOLUTION_HEIGHT);
      this.bottomHudRoot.setPosition(0, 0, 0);
      const widget = this.bottomHudRoot.getComponent(Widget) ?? this.bottomHudRoot.addComponent(Widget);
      widget.isAlignBottom = true;
      widget.bottom = 0;
      widget.isAlignHorizontalCenter = true;
      widget.horizontalCenter = 0;
      widget.updateAlignment();
    }

    if (this.debugRailRoot) {
      const ui = this.debugRailRoot.getComponent(UITransform) ?? this.debugRailRoot.addComponent(UITransform);
      ui.setContentSize(DESIGN_RESOLUTION_WIDTH, DESIGN_RESOLUTION_HEIGHT);
      const widget = this.debugRailRoot.getComponent(Widget) ?? this.debugRailRoot.addComponent(Widget);
      widget.isAlignRight = true;
      widget.right = 20;
      widget.isAlignVerticalCenter = true;
      widget.verticalCenter = 0;
      widget.updateAlignment();
    }
  }


  private buildMainTabBar(parent: Node): void {
    const tabs: Array<{ id: MainTab; text: string; x: number }> = [
      { id: 'teahouse', text: '茶肆', x: -240 },
      { id: 'farm', text: '农场', x: -80 },
      { id: 'research', text: '员工', x: 80 },
      { id: 'decoration', text: '更多', x: 240 },
    ];
    const bar = createPanel('MainTabBar', 660, 58, new Color(45, 28, 18, 210));
    parent.addChild(bar);
    bar.setSiblingIndex(10000);
    bar.setPosition(0, -600, 0);
    this.mainTabLabels = {};
    for (const tab of tabs) {
      const button = createButton(`Tab_${tab.id}`, tab.text, 144, 42, () => this.switchMainTab(tab.id));
      bar.addChild(button);
      button.setPosition(tab.x, 0, 0);
      const label = button.getChildByName(`Tab_${tab.id}_Label`)?.getComponent(Label) ?? null;
      if (label) {
        this.mainTabLabels[tab.id] = label;
      }
    }
  }

  private switchMainTab(tab: MainTab): void {
    this.currentMainTab = tab;
    if (this.teahousePageRoot) {
      this.teahousePageRoot.active = tab === 'teahouse';
    }
    if (this.farmPanel) {
      this.farmPanel.active = tab === 'farm';
    }
    if (this.researchPanel) {
      this.researchPanel.active = tab === 'research';
    }
    if (this.decorationPanel) {
      this.decorationPanel.active = tab === 'decoration';
    }
    if (this.staffPanel) {
      this.staffPanel.active = false;
    }
    const labels: Array<{ id: MainTab; text: string }> = [
      { id: 'teahouse', text: '茶肆' },
      { id: 'farm', text: '农场' },
      { id: 'research', text: '员工' },
      { id: 'decoration', text: '更多' },
    ];
    for (const item of labels) {
      const label = this.mainTabLabels[item.id];
      if (label) {
        label.string = item.id === tab ? `【${item.text}】` : item.text;
      }
    }
    if (tab === 'farm') this.refreshFarmPanel();
    if (tab === 'research') this.refreshResearchPanel();
    if (tab === 'decoration') this.refreshDecorationPanel();
    this.refreshStatusLabels();
  }


  private buildHelpPanel(parent: Node): void {
    const panel = createPanel('HelpPanel', 590, 340, new Color(55, 32, 20, 238));
    parent.addChild(panel);
    panel.setSiblingIndex(9997);
    panel.setPosition(0, 36, 0);
    panel.active = false;
    this.helpPanel = panel;

    const titleNode = createLabel('HelpTitleLabel', '试玩说明', 24, new Color(255, 226, 160, 255));
    panel.addChild(titleNode);
    titleNode.setPosition(0, 132, 0);

    const bodyNode = createLabel('HelpBodyLabel', [
      '1. 看客人气泡订单，点击对应茶饮制作。',
      '2. 制作台会自动排队，成品会自动上茶。',
      '3. 急单优先做；制作忙时系统会暂缓新客。',
      '4. 金币用于升级，升级会解锁茶饮、桌位和制作台速度。',
      '5. 缺料时先补货；农场每天开业前提供长期补给。',
      '6. 打烊后看结算，点击“新一天”继续经营。',
    ].join('\n'), 17, new Color(255, 245, 220, 255));
    const bodyLabel = bodyNode.getComponent(Label);
    if (bodyLabel) {
      bodyLabel.lineHeight = 25;
    }
    panel.addChild(bodyNode);
    bodyNode.setPosition(0, 18, 0);

    const closeButton = createButton('HelpCloseButton', '返回茶肆', 150, 44, () => this.hideHelpPanel());
    panel.addChild(closeButton);
    closeButton.setPosition(0, -138, 0);
  }

  private showHelpPanel(): void {
    if (this.helpPanel) {
      this.helpPanel.active = true;
      this.helpPanel.setSiblingIndex(9997);
    }
  }

  private hideHelpPanel(): void {
    if (this.helpPanel) {
      this.helpPanel.active = false;
    }
  }

  private toggleDebugControls(): void {
    this.debugControlsVisible = true;
    this.refreshDebugControls();
    this.refreshHud('调试按钮已固定显示在右侧');
  }

  private refreshDebugControls(): void {
    if (this.debugControlsRoot) {
      this.debugControlsRoot.active = true;
    }
    if (this.debugToggleLabel) {
      this.debugToggleLabel.string = 'Debug';
    }
  }

  private enqueueRecipe(recipeId: RecipeId): void {
    if (this.isDayEnded) {
      this.refreshHud('今天已打烊，点击“新一天”再开始制作');
      return;
    }

    const levelConfig = getLevelConfig(this.saveData.level);
    if (levelConfig.unlockedRecipeIds.indexOf(recipeId) < 0) {
      this.refreshHud('该茶饮尚未解锁，先升级店铺');
      return;
    }

    const recipe = getRecipe(recipeId);
    const missingText = this.getMissingIngredientText(recipe);
    if (missingText) {
      this.refreshHud(`${recipe.name} 原料不足：${missingText}`);
      return;
    }

    const sameRecipeBonus = this.lastQueuedRecipeId === recipe.id && this.sameRecipeStreak < 3 ? 0.1 : 0;
    const idleBonus = this.workstationIdleSeconds >= 5 ? 0.15 : 0;
    const totalBonus = Math.min(0.25, sameRecipeBonus + idleBonus);
    const runtimeRecipe = totalBonus > 0
      ? { ...recipe, makeSeconds: Math.max(1, recipe.makeSeconds * (1 - totalBonus)) }
      : recipe;
    const success = this.workstation?.enqueue(runtimeRecipe) ?? false;
    if (!success) {
      this.refreshHud('制作台忙不过来：队列已满，先等一杯完成，优先处理急单');
      return;
    }

    this.consumeIngredients(recipe);
    if (this.lastQueuedRecipeId === recipe.id) {
      this.sameRecipeStreak = Math.min(3, this.sameRecipeStreak + 1);
    } else {
      this.lastQueuedRecipeId = recipe.id;
      this.sameRecipeStreak = 1;
    }
    this.productionRhythmBonus = sameRecipeBonus;
    this.idlePreparationBonus = idleBonus;
    this.workstationIdleSeconds = 0;
    this.recordRecipeUnlocked(recipe);
    const queueCount = this.workstation?.getQueueCount() ?? 0;
    const bonusText = totalBonus > 0 ? `，节奏加速 ${Math.round(totalBonus * 100)}%` : '';
    this.refreshHud(`已加入制作：${recipe.name}（队列 ${queueCount}/3，消耗 ${this.formatIngredientCost(recipe.ingredientCost)}${bonusText}）`);
  }

  private upgradeShop(): void {
    const currentConfig = getLevelConfig(this.saveData.level);
    if (this.saveData.level >= getMaxDemoLevel()) {
      this.refreshHud('Demo 已达到最高等级，可以继续挑战每日评级');
      return;
    }

    if (this.saveData.coins < currentConfig.upgradeCost) {
      const need = currentConfig.upgradeCost - this.saveData.coins;
      this.refreshHud(`金币不足：升级需要 ${currentConfig.upgradeCost} 金币，还差 ${need}；继续接单或先完成日目标`);
      return;
    }

    this.saveData.coins -= currentConfig.upgradeCost;
    this.saveData.level += 1;
    this.saveData.unlockedSeatCount = getLevelConfig(this.saveData.level).seatCount;
    const workstationUpgradeText = this.syncWorkstationLevelWithShopLevel();
    this.grantUpgradeSupplies(this.saveData.level);
    const staffUnlockText = this.unlockStaffByProgress();
    this.checkAchievements();
    SaveManager.save(this.saveData);
    this.applyWorkstationLevel();
    this.refreshSeatVisibility();
    const newRecipes = RECIPES
      .filter((recipe) => recipe.unlockLevel === this.saveData.level)
      .map((recipe) => recipe.name);
    const recipeText = newRecipes.length > 0 ? `｜新茶饮：${newRecipes.join('、')}` : '';
    const workstationText = workstationUpgradeText ? `｜${workstationUpgradeText}` : '';
    const staffText = staffUnlockText ? `｜${staffUnlockText}` : '';
    this.refreshHud(`升级成功：店铺 ${this.saveData.level} 级｜${getLevelConfig(this.saveData.level).unlockText}${recipeText}${workstationText}${staffText}`);
  }

  private buySupplies(): void {
    const cost = this.getSupplyCost();
    if (this.saveData.coins < cost) {
      this.refreshHud(`金币不足，补货需要 ${cost} 金币`);
      return;
    }

    this.saveData.coins -= cost;
    this.saveData.longTerm.dailySupplyCount += 1;
    this.saveData.ingredients.teaLeaf += 10 + (this.activeDailyEvent.supplyBonus?.teaLeaf ?? 0);
    this.saveData.ingredients.sugar += 6 + (this.activeDailyEvent.supplyBonus?.sugar ?? 0);
    this.saveData.ingredients.flower += 6 + (this.activeDailyEvent.supplyBonus?.flower ?? 0);
    this.saveData.ingredients.fruit += 2 + (this.activeDailyEvent.supplyBonus?.fruit ?? 0);
    SaveManager.save(this.saveData);
    this.refreshHud(`补货成功：${cost} 金币（今日第 ${this.saveData.longTerm.dailySupplyCount} 次），茶叶 +${10 + (this.activeDailyEvent.supplyBonus?.teaLeaf ?? 0)} 糖 +${6 + (this.activeDailyEvent.supplyBonus?.sugar ?? 0)} 花 +${6 + (this.activeDailyEvent.supplyBonus?.flower ?? 0)} 果 +${2 + (this.activeDailyEvent.supplyBonus?.fruit ?? 0)}`);
  }

  private researchDrink(): void {
    const cost = this.getResearchCost();
    const missingText = this.getMissingIngredientTextFromCost(cost);
    if (missingText) {
      this.refreshHud(`研发食材不足：${missingText}`);
      return;
    }

    this.consumeIngredientCost(cost);
    const drink = this.generateDevelopedDrink();
    this.saveData.developedRecipes.unshift(drink);
    this.saveData.developedRecipes = this.saveData.developedRecipes.slice(0, 30);
    this.saveData.longTerm.totalResearchCount += 1;
    this.saveData.longTerm.weeklyResearchCount += 1;
    this.saveData.season.seasonExp += 10;
    this.recordRecipeUnlocked(drink);
    SaveManager.save(this.saveData);
    this.refreshDevelopedRecipeMenu();
    this.checkAchievements();
    this.refreshHud(`研发成功：${drink.tier}｜${drink.name}｜味 ${drink.taste} 香 ${drink.aroma} 人气 ${drink.popularity}｜售价 ${drink.price}`);
  }

  private handleDayButton(): void {
    if (this.isDayEnded) {
      this.startNextBusinessDay();
      return;
    }
    this.manualCloseBusinessDay();
  }

  private manualCloseBusinessDay(): void {
    if (this.isDayEnded) {
      return;
    }
    this.saveData.longTerm.manualClosedToday = true;
    if (this.dayRevenue < this.dayTarget) {
      if (this.businessDayTimer > 60) {
        this.reputationScore = Math.max(0, this.reputationScore - 4);
      } else if (this.businessDayTimer > 30) {
        this.reputationScore = Math.max(0, this.reputationScore - 2);
      }
    }
    this.refreshHud(this.dayRevenue >= this.dayTarget ? '今日目标已达成，稳健打烊' : '提前打烊：收入未达标时会影响口碑');
    this.endBusinessDay();
  }

  private extendBusinessDay(): void {
    if (this.isDayEnded) {
      this.refreshHud('今天已打烊，不能延长营业');
      return;
    }
    if (this.saveData.longTerm.extendedToday) {
      this.refreshHud('今天已经延长过一次营业');
      return;
    }
    const cost = this.getExtendCost();
    if (this.saveData.coins < cost) {
      this.refreshHud(`金币不足，延长营业需要 ${cost} 金币`);
      return;
    }
    this.saveData.coins -= cost;
    this.saveData.longTerm.extendedToday = true;
    this.businessDayTimer += EXTEND_BUSINESS_SECONDS;
    SaveManager.save(this.saveData);
    this.refreshHud(`已延长营业 ${EXTEND_BUSINESS_SECONDS} 秒，继续冲今日评级`);
  }

  private startNextBusinessDay(): void {
    if (!this.isDayEnded && this.businessDayTimer > 0) {
      this.refreshHud('当前仍在营业中，可先点击“打烊”结束今天');
      return;
    }

    this.businessDay += 1;
    this.saveData.businessDay = this.businessDay;
    const nextWeek = this.getWeekForDay(this.businessDay);
    if (nextWeek !== this.saveData.longTerm.currentWeek) {
      this.saveData.longTerm.currentWeek = nextWeek;
      this.saveData.longTerm.weeklyRevenue = 0;
      this.saveData.longTerm.weeklyServedCups = 0;
      this.saveData.longTerm.weeklySGrades = 0;
      this.saveData.longTerm.weeklyResearchCount = 0;
      this.saveData.longTerm.weeklyGoalClaimed = false;
    }
    this.saveData.longTerm.dailySupplyCount = 0;
    this.saveData.longTerm.extendedToday = false;
    this.saveData.longTerm.manualClosedToday = false;
    this.restoreStaffForNewDay();
    this.rotateActivityForNewDay();
    SaveManager.save(this.saveData);
    this.businessDayTimer = BUSINESS_DAY_SECONDS;
    this.dayRevenue = 0;
    this.dayTarget = this.calculateDayTarget();
    this.dayServedCount = 0;
    this.dayLostCount = 0;
    this.dayWastedTeaCount = 0;
    this.isDayEnded = false;
    this.spawnPaused = false;
    this.lastDayGrade = '';
    this.hideSettlementPanel();
    this.activeDailyEvent = this.pickDailyEvent();
    this.readyTeas.length = 0;
    this.serveStreak = 0;
    this.sameRecipeStreak = 0;
    this.lastQueuedRecipeId = '';
    this.workstationIdleSeconds = 0;
    this.spawnTimer = 1;
    this.clearAllCustomers();
    this.workstation?.clearQueue();
    this.applyWorkstationLevel();
    const harvestText = this.harvestFarmForNewDay();
    const buyerText = this.applyBuyerSuppliesForNewDay();
    const harvestPrefix = [harvestText, buyerText].filter(Boolean).join('｜');
    this.refreshHud(`第 ${this.businessDay} 天开始：${harvestPrefix ? `${harvestPrefix}｜` : ''}事件｜${this.activeDailyEvent.name}｜活动｜${this.getActiveActivity().name}`);
  }

  private updateBusinessDay(deltaTime: number): void {
    if (this.isDayEnded) {
      return;
    }

    this.businessDayTimer = Math.max(0, this.businessDayTimer - deltaTime);
    if (this.businessDayTimer <= 0) {
      this.endBusinessDay();
    }
  }

  private endBusinessDay(): void {
    if (this.isDayEnded) {
      return;
    }

    this.isDayEnded = true;
    this.spawnPaused = true;
    this.clearAllCustomers();
    this.workstation?.clearQueue();
    this.readyTeas.length = 0;
    const grade = this.calculateDayGrade();
    this.lastDayGrade = grade;
    const bonus = this.calculateDayBonus(grade);
    if (bonus > 0) {
      this.saveData.coins += bonus;
    }
    const weeklyRewardText = this.recordLongTermDayResult(grade);
    this.addPrestigeExpForDay(grade);
    this.checkAchievements();
    SaveManager.save(this.saveData);
    this.showSettlementPanel(grade, bonus, weeklyRewardText);
    this.refreshHud(`打烊结算：评级 ${grade}｜收入 ${this.dayRevenue}/${this.dayTarget}｜服务 ${this.dayServedCount} 杯｜点击“新一天”继续`);
  }

  private calculateDayTarget(): number {
    if (this.businessDay === 1) {
      return FIRST_DAY_TARGET;
    }
    return 190 + (this.saveData.level - 1) * 115;
  }

  private calculateDayGrade(): string {
    const completion = this.dayTarget <= 0 ? 1 : this.dayRevenue / this.dayTarget;
    if (completion >= 1.2 && this.reputationScore >= 90 && this.dayLostCount === 0 && this.dayWastedTeaCount === 0) {
      return 'S';
    }
    if (completion >= 1 && this.reputationScore >= 75) {
      return 'A';
    }
    if (completion >= 0.75 && this.reputationScore >= 55) {
      return 'B';
    }
    return 'C';
  }

  private calculateDayBonus(grade: string): number {
    let baseBonus = 0;
    if (grade === 'S') {
      baseBonus = 120;
    } else if (grade === 'A') {
      baseBonus = 70;
    } else if (grade === 'B') {
      baseBonus = 30;
    }
    return Math.floor(baseBonus * (this.activeDailyEvent.gradeBonusMultiplier ?? 1));
  }

  private showSettlementPanel(grade: string, bonus: number, weeklyRewardText = ''): void {
    if (!this.settlementPanel || !this.settlementLabel) {
      return;
    }

    const completion = this.dayTarget <= 0 ? 100 : Math.floor((this.dayRevenue / this.dayTarget) * 100);
    const weeklyGoal = this.getWeeklyGoal();
    const weeklyText = `本周：收入 ${this.saveData.longTerm.weeklyRevenue}/${weeklyGoal.revenue}｜服务 ${this.saveData.longTerm.weeklyServedCups}/${weeklyGoal.servedCups}｜S ${this.saveData.longTerm.weeklySGrades}/${weeklyGoal.sGrades}`;
    const nextHint = this.saveData.level >= getMaxDemoLevel()
      ? `声望 Lv.${this.saveData.prestige.level}｜继续挑战周目标、成就和活动`
      : `下一步：攒金币升级到 ${this.saveData.level + 1} 级`;
    const gradeHint = grade === 'S'
      ? '完美经营：收入、口碑和服务稳定性都很优秀'
      : grade === 'A'
        ? '表现很好：继续减少流失和浪费可冲 S'
        : grade === 'B'
          ? '基本达标：优先处理急单，别让茶变凉'
          : '仍需改进：先保住口碑，再追求高价订单';

    this.settlementPanel.active = true;
    this.settlementPanel.setSiblingIndex(8888);
    this.settlementLabel.string = [
      `评级 ${grade}｜完成度 ${completion}%｜事件：${this.activeDailyEvent.name}`,
      `收入 ${this.dayRevenue}/${this.dayTarget}｜奖励 +${bonus}｜当前金币 ${this.saveData.coins}`,
      `服务 ${this.dayServedCount} 杯｜流失 ${this.dayLostCount} 桌｜浪费 ${this.dayWastedTeaCount} 杯｜口碑 ${this.reputationScore}`,
      weeklyText,
      this.formatRecentDayResults(),
      weeklyRewardText || gradeHint,
      nextHint,
      '点击“新一天”开始下一轮营业',
    ].join('\n');
  }

  private getWorkstationSpeedMultiplier(level = this.saveData.workstationLevel): number {
    const safeLevel = Math.max(1, Math.min(WORKSTATION_SPEED_BY_LEVEL.length, Math.floor(level || 1)));
    return (WORKSTATION_SPEED_BY_LEVEL[safeLevel - 1] ?? 1) + this.getTeaMasterSpeedBonus();
  }

  private getExpectedWorkstationLevel(): number {
    if (this.saveData.level >= 7) {
      return 4;
    }
    if (this.saveData.level >= 4) {
      return 3;
    }
    if (this.saveData.level >= 2) {
      return 2;
    }
    return 1;
  }

  private syncWorkstationLevelWithShopLevel(): string {
    const expectedLevel = this.getExpectedWorkstationLevel();
    const currentLevel = Math.max(1, this.saveData.workstationLevel || 1);
    if (expectedLevel <= currentLevel) {
      this.saveData.workstationLevel = currentLevel;
      return '';
    }

    this.saveData.workstationLevel = expectedLevel;
    const speed = this.getWorkstationSpeedMultiplier(expectedLevel);
    return `制作台 Lv.${expectedLevel}，速度×${speed.toFixed(2)}`;
  }

  private applyWorkstationLevel(): void {
    const level = Math.max(1, this.saveData.workstationLevel || 1);
    this.saveData.workstationLevel = level;
    this.workstation?.setStationLevel(level, this.getWorkstationSpeedMultiplier(level));
  }

  private calculateServicePressure(): ServicePressure {
    const waitingCups = this.customers
      .filter((customer) => customer.recipe && customer.remainingCups > 0)
      .reduce((sum, customer) => sum + customer.remainingCups, 0);
    const urgentTables = this.customers.filter((customer) => customer.isUrgent()).length;
    const queueCount = this.workstation?.getQueueCount() ?? 0;
    const freeSeats = this.findFreeSeatIndex() >= 0 ? 1 : 0;
    return { waitingCups, urgentTables, queueCount, freeSeats };
  }

  private hideSettlementPanel(): void {
    if (this.settlementPanel) {
      this.settlementPanel.active = false;
    }
  }

  private getAdjustedSpawnInterval(baseInterval: number): number {
    let interval = baseInterval;
    if (this.businessDay === 1 && this.dayServedCount < FIRST_DAY_FAST_ORDER_COUNT) {
      interval = Math.min(2.8, baseInterval * 0.55);
    }

    let reputationMultiplier = 1.6;
    if (this.reputationScore >= 90) {
      reputationMultiplier = 0.85;
    } else if (this.reputationScore >= 70) {
      reputationMultiplier = 1;
    } else if (this.reputationScore >= 40) {
      reputationMultiplier = 1.25;
    }

    const pressure = this.calculateServicePressure();
    let pressureMultiplier = 1;
    if (pressure.urgentTables > 0) {
      pressureMultiplier = 2.2;
    } else if (pressure.waitingCups >= 4) {
      pressureMultiplier = 1.8;
    } else if (pressure.queueCount >= 2 && pressure.waitingCups >= 2) {
      pressureMultiplier = 1.35;
    }

    return interval * reputationMultiplier * pressureMultiplier * (this.activeDailyEvent.spawnIntervalMultiplier ?? 1) * (this.getActiveActivity().id === 'tea_fair' ? 0.95 : 1);
  }

  private clearAllCustomers(): void {
    for (const customer of this.customers) {
      if (customer.node && customer.node.isValid) {
        customer.node.destroy();
      }
    }
    this.customers.length = 0;
    this.occupiedSeats.clear();
    this.refreshSeatVisibility();
  }

  private syncUnlockedTablesWithLevel(): void {
    const levelSeatCount = getLevelConfig(this.saveData.level).seatCount;
    if (this.saveData.unlockedSeatCount !== levelSeatCount) {
      this.saveData.unlockedSeatCount = levelSeatCount;
      SaveManager.save(this.saveData);
    }
  }

  private debugClearSave(): void {
    SaveManager.clear();
    this.saveData = SaveManager.load();
    this.clearAllCustomers();
    this.readyTeas.length = 0;
    this.lostCount = 0;
    this.servedCount = 0;
    this.wastedTeaCount = 0;
    this.serveStreak = 0;
    this.reputationScore = 100;
    this.businessDay = 1;
    this.saveData.businessDay = this.businessDay;
    this.businessDayTimer = BUSINESS_DAY_SECONDS;
    this.dayRevenue = 0;
    this.dayTarget = this.calculateDayTarget();
    this.dayServedCount = 0;
    this.dayLostCount = 0;
    this.dayWastedTeaCount = 0;
    this.isDayEnded = false;
    this.spawnPaused = false;
    this.lastDayGrade = '';
    this.hideSettlementPanel();
    this.activeDailyEvent = this.pickDailyEvent();
    this.refreshDevelopedRecipeMenu();
    this.applyWorkstationLevel();
    this.refreshSeatVisibility();
    this.workstation?.clearQueue();
    this.spawnTimer = 1;
    this.refreshHud('调试：已清空存档');
  }

  private debugLevelUp(): void {
    if (this.saveData.level >= getMaxDemoLevel()) {
      this.refreshHud('调试：已经是 V1.0 Demo 最高等级');
      return;
    }

    this.saveData.level += 1;
    this.saveData.unlockedSeatCount = getLevelConfig(this.saveData.level).seatCount;
    this.syncWorkstationLevelWithShopLevel();
    this.grantUpgradeSupplies(this.saveData.level);
    const staffUnlockText = this.unlockStaffByProgress();
    this.checkAchievements();
    SaveManager.save(this.saveData);
    this.applyWorkstationLevel();
    this.refreshSeatVisibility();
    this.refreshHud(`调试：升到 ${this.saveData.level} 级，解锁 ${getLevelConfig(this.saveData.level).seatCount} 张桌`);
  }

  private trySpawnCustomer(force = false): void {
    const levelConfig = getLevelConfig(this.saveData.level);
    if (this.isDayEnded && !force) {
      this.refreshHud('今天已打烊，点击“新一天”开始下一轮营业');
      return;
    }

    if (!force && this.customers.length >= levelConfig.maxCustomers) {
      return;
    }

    if (!force && this.workstation?.isFull()) {
      this.spawnTimer = Math.max(this.spawnTimer, 1.8);
      this.refreshStatusLabels();
      return;
    }

    const pressure = this.calculateServicePressure();
    if (!force && pressure.urgentTables > 0 && pressure.waitingCups >= 2) {
      this.spawnTimer = Math.max(this.spawnTimer, 2.4);
      this.refreshStatusLabels();
      return;
    }

    const seatIndex = this.findFreeSeatIndex();
    if (seatIndex < 0 || !this.customerRoot) {
      this.refreshHud('当前没有空座位');
      return;
    }

    const customerNode = this.createCustomerNode();
    this.customerRoot.addChild(customerNode);
    const seatNode = this.seatNodes[seatIndex];
    const tableConfig = getRestaurantTableConfig(seatIndex);
    const targetPosition = seatNode.position.clone().add(new Vec3(0, tableConfig.customerYOffset, 0));
    customerNode.setPosition(this.entrancePosition);

    const customer = customerNode.getComponent(Customer)!;
    const customerType = this.pickCustomerType();
    const recipe = this.pickRecipeForCustomer(customerType.allowedRecipeIds);
    const groupSize = this.pickCustomerGroupSize();
    this.occupiedSeats.add(seatIndex);
    customer.init({
      recipe,
      customerName: customerType.name,
      groupSize,
      spendMultiplier: customerType.spendMultiplier,
      patienceSeconds: Math.max(6, Math.floor(customerType.patienceSeconds * (this.getActiveActivity().patienceMultiplier ?? 1) * (1 + this.getPrestigePatienceBonus()))),
      seatIndex,
      targetPosition,
      exitPosition: this.exitPosition,
      moveSpeed: customerType.moveSpeed * 4,
      onLost: (lostCustomer: Customer) => this.onCustomerLost(lostCustomer),
    });
    this.customers.push(customer);
    const specialText = this.maybeApplySpecialRequest(customer);
    this.refreshSeatVisibility();
    this.refreshHud(`${customerType.name}x${groupSize} 入座第 ${seatIndex + 1} 桌，点了 ${recipe.name}x${groupSize}${specialText}`);
  }

  private createManualCustomerInstance(): Node {
    if (!this.manualCustomerTemplate) {
      return createImageNode('Customer_客人组', 'scholar', 88, 88);
    }

    const node = new Node('Customer_客人组');
    getOrAddUiTransform(node, 88, 88);
    const templateSprite = this.manualCustomerTemplate.getComponent(Sprite);
    if (templateSprite?.spriteFrame) {
      const sprite = node.addComponent(Sprite);
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      sprite.spriteFrame = templateSprite.spriteFrame;
    } else {
      addTextureSprite(node, 'scholar', 88, 88);
    }
    node.setScale(this.manualCustomerTemplate.scale);
    applyLayerRecursively(node, Layers.Enum.UI_2D);
    return node;
  }

  private createCustomerNode(): Node {
    const node = this.manualCustomerTemplate ? this.createManualCustomerInstance() : createImageNode('Customer_客人组', 'scholar', 88, 88);
    const customer = node.getComponent(Customer) ?? node.addComponent(Customer);

    clearGeneratedCustomerUi(node);
    getOrAddUiTransform(node, 88, 88);

    const orderBubble = createPanel('OrderBubble_对话框', 112, 82, new Color(255, 248, 224, 240));
    addTextureSprite(orderBubble, 'dialog', 112, 82);
    node.addChild(orderBubble);
    orderBubble.setPosition(0, 76, 0);
    orderBubble.setSiblingIndex(50);
    customer.orderBubbleNode = orderBubble;

    const normalStrip = createPanel('OrderBubbleNormalStrip', 104, 7, new Color(104, 150, 78, 210));
    orderBubble.addChild(normalStrip);
    normalStrip.setPosition(0, 35, 0);
    customer.orderBubbleNormalNode = normalStrip;

    const warningStrip = createPanel('OrderBubbleWarningStrip', 104, 7, new Color(198, 54, 36, 235));
    orderBubble.addChild(warningStrip);
    warningStrip.setPosition(0, 35, 0);
    warningStrip.active = false;
    customer.orderBubbleWarningNode = warningStrip;

    const urgentBadgeNode = createPanel('UrgentBadge', 32, 24, new Color(198, 54, 36, 245));
    orderBubble.addChild(urgentBadgeNode);
    urgentBadgeNode.setPosition(-42, 20, 0);
    urgentBadgeNode.active = false;

    const urgentBadgeLabelNode = createLabel('UrgentBadgeLabel', '急', 14, new Color(255, 245, 220, 255));
    urgentBadgeNode.addChild(urgentBadgeLabelNode);
    urgentBadgeLabelNode.setPosition(0, -1, 0);
    customer.urgentBadgeLabel = urgentBadgeLabelNode.getComponent(Label);

    const orderLabelNode = createLabel('OrderLabel', '', 12, new Color(78, 42, 24, 255));
    const orderLabel = orderLabelNode.getComponent(Label);
    if (orderLabel) {
      orderLabel.lineHeight = 17;
    }
    orderBubble.addChild(orderLabelNode);
    orderLabelNode.setPosition(0, -4, 0);
    customer.orderLabel = orderLabel;

    const patienceNode = createProgressBar('PatienceBar', 88, 10);
    node.addChild(patienceNode);
    patienceNode.setPosition(0, -52, 0);
    customer.patienceBar = patienceNode.getComponent(ProgressBar);
    return node;
  }

  private onTeaReady(recipe: RecipeConfig): void {
    let message = `${recipe.name} 完成，放入成品台`;
    if (this.readyTeas.length >= READY_TEA_LIMIT) {
      const discarded = this.readyTeas.shift();
      this.applyWastePenalty(1);
      message = `成品台已满，${discarded?.recipe.name ?? '旧茶'} 变凉报废，口碑 -2，${recipe.name} 入台`;
    }

    this.readyTeas.push({
      recipe,
      remainingFreshSeconds: this.getReadyTeaFreshSeconds(),
    });

    const deliveredMessages = this.tryDeliverReadyTeas();
    if (deliveredMessages.length > 0) {
      message = deliveredMessages.join('；');
    }
    this.refreshHud(message);
  }

  private updateReadyTeas(deltaTime: number): void {
    let expiredCount = 0;
    for (let i = this.readyTeas.length - 1; i >= 0; i -= 1) {
      this.readyTeas[i].remainingFreshSeconds -= deltaTime;
      if (this.readyTeas[i].remainingFreshSeconds <= 0) {
        this.readyTeas.splice(i, 1);
        expiredCount += 1;
      }
    }

    if (expiredCount > 0) {
      this.applyWastePenalty(expiredCount);
      this.refreshHud(`${expiredCount} 杯成品茶放太久变凉报废，口碑 -${expiredCount * 2}`);
    }

    const deliveredMessages = this.tryDeliverReadyTeas();
    if (deliveredMessages.length > 0) {
      this.refreshHud(deliveredMessages.join('；'));
    } else {
      this.refreshStatusLabels();
    }
  }

  private tryDeliverReadyTeas(): string[] {
    const messages: string[] = [];
    for (let i = 0; i < this.readyTeas.length;) {
      const readyTea = this.readyTeas[i];
      const target = this.customers.find((customer) => customer.canReceive(readyTea.recipe.id));
      if (!target) {
        i += 1;
        continue;
      }

      this.readyTeas.splice(i, 1);
      const rawIncome = target.markServed();
      this.servedCount += 1;
      this.dayServedCount += 1;
      if (!this.saveData.tutorialCompleted && this.businessDay === 1 && this.dayServedCount >= FIRST_DAY_FAST_ORDER_COUNT) {
        this.saveData.tutorialCompleted = true;
      }
      this.serveStreak += 1;
      const baseIncome = Math.floor(rawIncome * (this.activeDailyEvent.incomeMultiplier ?? 1) * this.getActivityRevenueMultiplier(readyTea.recipe) * this.getSpecialRequestMultiplier(target));
      const tip = this.calculateStreakTip(baseIncome);
      const eventBonus = this.calculateDailyEventServeBonus();
      const income = baseIncome + tip + eventBonus;
      this.saveData.coins += income;
      this.dayRevenue += income;
      this.recordRecipeSale(readyTea.recipe, income);
      this.reputationScore = Math.min(100, this.reputationScore + 1 + this.getDailyEventReputationBonus());
      SaveManager.save(this.saveData);
      messages.push(this.formatServeMessage(target, readyTea.recipe.name, baseIncome, tip, eventBonus));
      this.refreshSeatVisibility();
      if (target.isOrderComplete()) {
        this.removeCustomer(target, 0.1, true);
      }
    }
    return messages;
  }

  private onCustomerLost(customer: Customer): void {
    this.lostCount += 1;
    this.dayLostCount += 1;
    this.serveStreak = 0;
    this.reputationScore = Math.max(0, this.reputationScore - 6);
    this.refreshHud('客人等太久流失了，连续服务中断，口碑 -6');
    this.removeCustomer(customer, 0.1, true);
  }

  private removeCustomer(customer: Customer, delaySeconds: number, walkOut = false): void {
    this.occupiedSeats.delete(customer.seatIndex);
    this.customers = this.customers.filter((item) => item !== customer);
    this.specialRequestCustomers.delete(customer);
    this.refreshSeatVisibility();

    if (walkOut) {
      customer.leave();
      return;
    }

    this.scheduleOnce(() => {
      if (customer.node && customer.node.isValid) {
        customer.node.destroy();
      }
    }, delaySeconds);
  }

  private findFreeSeatIndex(): number {
    const maxSeatCount = Math.min(this.saveData.unlockedSeatCount, this.seatNodes.length);
    for (let i = 0; i < maxSeatCount; i += 1) {
      if (!this.occupiedSeats.has(i)) {
        return i;
      }
    }
    return -1;
  }

  private refreshSeatVisibility(): void {
    const unlockedCount = Math.min(this.saveData.unlockedSeatCount, this.seatNodes.length);
    for (let i = 0; i < this.seatNodes.length; i += 1) {
      const seat = this.seatNodes[i];
      const isUnlocked = i < unlockedCount;
      const isOccupied = this.occupiedSeats.has(i);
      seat.active = isUnlocked;
      if (!isUnlocked) {
        continue;
      }

      const sprite = seat.getComponent(Sprite);
      if (sprite) {
        sprite.color = isOccupied
          ? new Color(255, 232, 185, 255)
          : new Color(255, 255, 255, 235);
      }

      const statusLabel = this.seatStatusLabels[i];
      if (statusLabel) {
        statusLabel.string = isOccupied ? '等茶' : '空座';
        statusLabel.color = isOccupied
          ? new Color(255, 226, 150, 255)
          : new Color(220, 255, 205, 235);
      }
    }
  }

  private refreshDecorationVisuals(): void {
    if (!this.decorationVisualRoot) {
      return;
    }

    this.decorationVisualRoot.removeAllChildren();
    const ownedDecorationIds = this.saveData.decoration?.ownedDecorationIds ?? this.saveData.ownedDecorations ?? [];
    for (const config of TEAHOUSE_DECORATION_VISUALS) {
      if (ownedDecorationIds.indexOf(config.decorationId) < 0) {
        continue;
      }

      const node = createConfiguredDecorationNode(config);
      this.decorationVisualRoot.addChild(node);
      node.setPosition(config.x, config.y, 0);
      node.setSiblingIndex(config.zIndex);
    }
  }

  private pickCustomerType() {
    const availableTypes = CUSTOMER_TYPES.filter((item) => this.getCustomerUnlockLevel(item.id, item.unlockLevel) <= this.saveData.level);
    const totalWeight = availableTypes.reduce((sum, item) => sum + this.getCustomerWeight(item.id, item.weight), 0);
    let roll = Math.random() * totalWeight;
    for (const type of availableTypes) {
      roll -= this.getCustomerWeight(type.id, type.weight);
      if (roll <= 0) {
        return type;
      }
    }
    return availableTypes[0];
  }

  private pickRecipeForCustomer(allowedRecipeIds: RecipeId[]): RecipeConfig {
    const developedRecipe = this.pickDevelopedRecipeForCustomer();
    if (developedRecipe) {
      return developedRecipe;
    }

    const levelConfig = getLevelConfig(this.saveData.level);
    const availableRecipeIds = allowedRecipeIds.filter((id) => levelConfig.unlockedRecipeIds.indexOf(id) >= 0);
    const recipeId = availableRecipeIds.length > 0
      ? availableRecipeIds[Math.floor(Math.random() * availableRecipeIds.length)]
      : levelConfig.unlockedRecipeIds[0];
    return getRecipe(recipeId as RecipeId);
  }

  private pickCustomerGroupSize(): number {
    if (this.businessDay === 1 && this.dayServedCount < FIRST_DAY_FAST_ORDER_COUNT) {
      return 1;
    }

    const level = this.saveData.level;
    const roll = Math.random();
    if (level <= 1) {
      return roll > 0.8 ? 2 : 1;
    }
    if (level < 5) {
      return roll > 0.6 ? 2 : 1;
    }

    const maxGroupSize = level >= 10 ? 4 : 3;
    if (maxGroupSize >= 4 && roll > 0.9) {
      return 4;
    }
    if (roll > 0.7) {
      return 3;
    }
    if (roll > 0.35) {
      return 2;
    }
    return 1;
  }

  private getMissingIngredientText(recipe: RecipeConfig): string {
    return this.getMissingIngredientTextFromCost(recipe.ingredientCost);
  }

  private getMissingIngredientTextFromCost(cost: IngredientCostConfig): string {
    const missing = getIngredientCostEntries(cost)
      .filter(([key, amount]) => this.saveData.ingredients[key] < amount)
      .map(([key, amount]) => `${INGREDIENT_NAMES[key]}缺${amount - this.saveData.ingredients[key]}`);
    return missing.join('、');
  }

  private consumeIngredients(recipe: RecipeConfig): void {
    this.consumeIngredientCost(recipe.ingredientCost);
  }

  private consumeIngredientCost(cost: IngredientCostConfig): void {
    for (const [key, amount] of getIngredientCostEntries(cost)) {
      this.saveData.ingredients[key] = Math.max(0, this.saveData.ingredients[key] - amount);
    }
    SaveManager.save(this.saveData);
  }

  private calculateStreakTip(baseIncome: number): number {
    if (this.serveStreak < 3) {
      return 0;
    }

    const multiplier = this.serveStreak >= 6 ? 0.3 : 0.15;
    return Math.max(1, Math.floor(baseIncome * multiplier * (this.getActiveActivity().tipMultiplier ?? 1) * (1 + this.getDecorationTipBonus() + this.getPrestigeTipBonus())));
  }

  private applyWastePenalty(count: number): void {
    this.wastedTeaCount += count;
    this.dayWastedTeaCount += count;
    this.serveStreak = 0;
    this.reputationScore = Math.max(0, this.reputationScore - count * 2);
  }

  private getSupplyCost(): number {
    return (this.activeDailyEvent.supplyCost ?? 90) + this.saveData.longTerm.dailySupplyCount * 8;
  }

  private getReadyTeaFreshSeconds(): number {
    return this.activeDailyEvent.readyTeaFreshSeconds ?? READY_TEA_FRESH_SECONDS;
  }

  private getCustomerUnlockLevel(typeId: CustomerTypeId, defaultLevel: number): number {
    if (typeId === CustomerTypeId.Scholar && this.activeDailyEvent.scholarUnlockLevel !== undefined) {
      return this.activeDailyEvent.scholarUnlockLevel;
    }
    return defaultLevel;
  }

  private getCustomerWeight(typeId: CustomerTypeId, defaultWeight: number): number {
    if (typeId === CustomerTypeId.Scholar) {
      return defaultWeight * (this.activeDailyEvent.scholarWeightMultiplier ?? 1);
    }
    return defaultWeight;
  }

  private calculateDailyEventServeBonus(): number {
    if (!this.activeDailyEvent.everyFifthServeBonus || this.dayServedCount % 5 !== 0) {
      return 0;
    }
    return this.activeDailyEvent.everyFifthServeBonus;
  }

  private getDailyEventReputationBonus(): number {
    if (!this.activeDailyEvent.reputationBonusOnFifth || this.dayServedCount % 5 !== 0) {
      return 0;
    }
    return this.activeDailyEvent.reputationBonusOnFifth;
  }

  private formatServeMessage(customer: Customer, recipeName: string, baseIncome: number, tip: number, eventBonus: number): string {
    const progressText = customer.isOrderComplete()
      ? `第 ${customer.seatIndex + 1} 桌完成`
      : `第 ${customer.seatIndex + 1} 桌上茶 ${customer.getServedCups()}/${customer.totalCups}`;
    const totalIncome = baseIncome + tip + eventBonus;
    const parts = [`${progressText}：${recipeName}，收入 +${totalIncome}`];
    if (tip > 0) {
      parts.push(`连击 ${this.serveStreak} 杯小费 +${tip}`);
    }
    if (eventBonus > 0) {
      parts.push(`${this.activeDailyEvent.name}奖励 +${eventBonus}`);
    }
    const need = this.saveData.level >= getMaxDemoLevel()
      ? 0
      : Math.max(0, getLevelConfig(this.saveData.level).upgradeCost - this.saveData.coins);
    if (need <= 0 && this.saveData.level < getMaxDemoLevel()) {
      parts.push('金币已够升级');
    }
    return parts.join('；');
  }

  private pickDailyEvent(): DailyEventConfig {
    if (this.businessDay <= 1) {
      return DAILY_EVENTS[0];
    }

    const candidates = DAILY_EVENTS.filter((event) => event.weight > 0);
    const totalWeight = candidates.reduce((sum, event) => sum + event.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const event of candidates) {
      roll -= event.weight;
      if (roll <= 0) {
        return event;
      }
    }
    return candidates[0] ?? DAILY_EVENTS[0];
  }

  private refreshDevelopedRecipeMenu(): void {
    this.developedRecipeMenu = this.saveData.developedRecipes
      .slice(0, DEVELOPED_RECIPE_MENU_LIMIT)
      .map((drink) => this.toRuntimeDevelopedRecipe(drink));
  }

  private toRuntimeDevelopedRecipe(drink: DevelopedDrinkSave): DevelopedRecipeRuntime {
    return {
      id: drink.id,
      name: drink.name,
      unlockLevel: 1,
      makeSeconds: drink.makeSeconds,
      price: drink.price,
      ingredientCost: drink.ingredientCost,
      isDeveloped: true,
      tier: drink.tier,
      taste: drink.taste,
      aroma: drink.aroma,
      popularity: drink.popularity,
      rarity: drink.rarity,
    };
  }

  private pickDevelopedRecipeForCustomer(): RecipeConfig | null {
    if (this.developedRecipeMenu.length === 0) {
      return null;
    }

    const totalPopularity = this.developedRecipeMenu.reduce((sum, recipe) => sum + recipe.popularity, 0);
    const chance = Math.min(0.45, 0.08 + totalPopularity / 1200);
    if (Math.random() > chance) {
      return null;
    }

    let roll = Math.random() * totalPopularity;
    for (const recipe of this.developedRecipeMenu) {
      roll -= recipe.popularity;
      if (roll <= 0) {
        return recipe;
      }
    }
    return this.developedRecipeMenu[0];
  }

  private generateDevelopedDrink(): DevelopedDrinkSave {
    const taste = this.rollDrinkStat();
    const aroma = this.rollDrinkStat();
    const popularity = this.rollDrinkStat();
    const rarity = this.rollDrinkStat();
    const score = taste + aroma + popularity + rarity;
    const tier = this.getDrinkTier(score);
    const name = this.generateDrinkName(tier, taste, aroma, popularity, rarity);
    const price = Math.floor(20 + taste * 2.2 + aroma * 1.5 + popularity * 2.8 + rarity * 3.2);
    return {
      id: `dev_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      name,
      tier,
      taste,
      aroma,
      popularity,
      rarity,
      price,
      makeSeconds: Math.max(3, Math.min(12, Math.floor(3 + rarity / 18 + taste / 30))),
      ingredientCost: this.getDevelopedDrinkCost(tier, rarity),
    };
  }

  private rollDrinkStat(): number {
    const roll = Math.random();
    if (roll > 0.96) {
      return 90 + Math.floor(Math.random() * 11);
    }
    if (roll > 0.82) {
      return 70 + Math.floor(Math.random() * 20);
    }
    if (roll > 0.45) {
      return 45 + Math.floor(Math.random() * 25);
    }
    return 20 + Math.floor(Math.random() * 25);
  }

  private getDrinkTier(score: number): string {
    if (score >= 340) {
      return 'SS';
    }
    if (score >= 290) {
      return 'S';
    }
    if (score >= 230) {
      return 'A';
    }
    if (score >= 170) {
      return 'B';
    }
    return 'C';
  }

  private generateDrinkName(tier: string, taste: number, aroma: number, popularity: number, rarity: number): string {
    const prefixes = rarity >= 80 ? ['桃源', '云雾', '月下', '金桂'] : ['山泉', '清露', '蜜香', '花影'];
    const cores = taste >= aroma ? ['甘露', '春茶', '玉饮', '茶汤'] : ['香茗', '花茶', '凝香', '清茗'];
    const suffixes = popularity >= 75 ? ['招牌', '人气款', '上品', '佳饮'] : ['新饮', '试制', '小盏', '初品'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const core = cores[Math.floor(Math.random() * cores.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix}${core}${suffix}${tier}`;
  }

  private getDevelopedDrinkCost(tier: string, rarity: number): IngredientStock {
    const extra = tier === 'SS' || tier === 'S' ? 2 : tier === 'A' ? 1 : 0;
    return {
      teaLeaf: 1 + extra,
      sugar: rarity >= 55 ? 1 : 0,
      flower: rarity >= 70 ? 1 + extra : extra,
      fruit: rarity >= 85 ? 1 : 0,
    };
  }

  private grantUpgradeSupplies(level: number): void {
    if (level === 2) {
      this.saveData.ingredients.teaLeaf += 8;
      this.saveData.ingredients.sugar += 8;
    }
    if (level === 3) {
      this.saveData.ingredients.teaLeaf += 8;
      this.saveData.ingredients.flower += 8;
    }
  }

  private getFarmSavePlot(plotId: FarmPlotId) {
    if (plotId === FarmPlotId.TeaTree) {
      return this.saveData.farm.teaTree;
    }
    if (plotId === FarmPlotId.FlowerBed) {
      return this.saveData.farm.flowerBed;
    }
    return this.saveData.farm.fruitTree;
  }

  private buildFarmPanel(parent: Node): void {
    const panel = createPanel('FarmPanel', 610, 430, new Color(55, 32, 20, 238));
    parent.addChild(panel);
    panel.setSiblingIndex(9998);
    panel.setPosition(0, 8, 0);
    panel.active = false;
    this.farmPanel = panel;

    const titleNode = createLabel('FarmTitleLabel', '桃源小农场', 25, new Color(255, 226, 160, 255));
    panel.addChild(titleNode);
    titleNode.setPosition(0, 174, 0);

    const summaryNode = createLabel('FarmSummaryLabel', '', 15, new Color(255, 245, 220, 255));
    const summaryLabel = summaryNode.getComponent(Label);
    if (summaryLabel) {
      summaryLabel.lineHeight = 21;
    }
    panel.addChild(summaryNode);
    summaryNode.setPosition(0, 128, 0);
    this.farmSummaryLabel = summaryLabel;

    const plotRows: Array<{ id: FarmPlotId; y: number }> = [
      { id: FarmPlotId.TeaTree, y: 62 },
      { id: FarmPlotId.FlowerBed, y: -28 },
      { id: FarmPlotId.FruitTree, y: -118 },
    ];

    this.farmButtonLabels = {};
    this.farmDescriptionLabels = {};
    for (const row of plotRows) {
      const config = getFarmPlotConfig(row.id);
      const card = createPanel(`FarmCard_${config.id}`, 520, 72, new Color(255, 245, 220, 45));
      panel.addChild(card);
      card.setPosition(0, row.y, 0);

      const descNode = createLabel(`FarmDesc_${config.id}`, this.getFarmPlotDescription(row.id), 15, new Color(255, 245, 220, 255));
      const descLabel = descNode.getComponent(Label);
      if (descLabel) {
        descLabel.lineHeight = 20;
        this.farmDescriptionLabels[row.id] = descLabel;
      }
      card.addChild(descNode);
      descNode.setPosition(-100, 0, 0);

      const button = createButton(`FarmUpgrade_${config.id}`, config.shortName, 150, 48, () => this.upgradeFarmPlot(row.id));
      card.addChild(button);
      button.setPosition(166, 0, 0);
      const buttonLabel = button.getChildByName(`FarmUpgrade_${config.id}_Label`)?.getComponent(Label) ?? null;
      if (buttonLabel) {
        this.farmButtonLabels[row.id] = buttonLabel;
      }
    }

    const closeButton = createButton('FarmCloseButton', '返回茶肆', 150, 44, () => this.hideFarmPanel());
    panel.addChild(closeButton);
    closeButton.setPosition(0, -184, 0);
    this.refreshFarmPanel();
  }

  private showFarmPanel(): void {
    this.switchMainTab('farm');
  }

  private hideFarmPanel(): void {
    if (this.farmPanel) {
      this.farmPanel.active = false;
    }
  }

  private getFarmPlotDescription(plotId: FarmPlotId): string {
    const config = getFarmPlotConfig(plotId);
    const savePlot = this.getFarmSavePlot(plotId);
    if (this.saveData.level < config.unlockShopLevel && !savePlot.unlocked) {
      return `${config.name}\n店铺 ${config.unlockShopLevel} 级解锁，之后每天产出${config.ingredientName}`;
    }
    if (!savePlot.unlocked || savePlot.level <= 0) {
      return `${config.name}\n可解锁，明天开始产出${config.ingredientName}`;
    }
    return `${config.name} Lv.${savePlot.level}\n明天产出 ${calculateFarmYield(config, savePlot)} ${config.ingredientName}`;
  }

  private refreshFarmPanel(): void {
    if (this.farmSummaryLabel) {
      this.farmSummaryLabel.string = `今天第 ${this.businessDay} 天｜农场每天开业前收获一次\n长期升级农场补原料，临时缺料仍可用补货救急`;
    }
    if (this.extendButtonLabel) {
      this.extendButtonLabel.string = this.saveData.longTerm.extendedToday ? '延长\n已用' : `延长\n${this.getExtendCost()}金`;
    }

    for (const plotId of FARM_PLOT_ORDER) {
      const descLabel = this.farmDescriptionLabels[plotId];
      if (descLabel) {
        descLabel.string = this.getFarmPlotDescription(plotId);
      }
      const label = this.farmButtonLabels[plotId];
      if (label) {
        label.string = this.getFarmButtonText(plotId);
      }
    }
  }

  private harvestFarmForNewDay(): string {
    if (this.saveData.farm.lastHarvestDay >= this.businessDay) {
      return '';
    }

    const gained: string[] = [];
    if (this.extendButtonLabel) {
      this.extendButtonLabel.string = this.saveData.longTerm.extendedToday ? '延长\n已用' : `延长\n${this.getExtendCost()}金`;
    }

    for (const plotId of FARM_PLOT_ORDER) {
      const config = getFarmPlotConfig(plotId);
      const savePlot = this.getFarmSavePlot(plotId);
      if (!savePlot.unlocked || savePlot.level <= 0) {
        continue;
      }
      const amount = Math.floor(calculateFarmYield(config, savePlot) * (this.getActiveActivity().farmYieldMultiplier ?? 1));
      this.saveData.ingredients[config.ingredientKey] += amount;
      gained.push(`${config.shortName}+${amount}${config.ingredientName}`);
    }

    this.saveData.farm.lastHarvestDay = this.businessDay;
    SaveManager.save(this.saveData);
    return gained.length > 0 ? `农场收获：${gained.join('、')}` : '';
  }

  private upgradeFarmPlot(plotId: FarmPlotId): void {
    const config = getFarmPlotConfig(plotId);
    const savePlot = this.getFarmSavePlot(plotId);

    if (this.saveData.level < config.unlockShopLevel) {
      this.refreshHud(`${config.name} 需要店铺 ${config.unlockShopLevel} 级解锁`);
      return;
    }

    if (!savePlot.unlocked || savePlot.level <= 0) {
      savePlot.unlocked = true;
      savePlot.level = 1;
      this.unlockStaffByProgress();
      this.checkAchievements();
      SaveManager.save(this.saveData);
      this.refreshFarmPanel();
      this.refreshHud(`解锁 ${config.name}，明天开始产出 ${config.ingredientName}`);
      return;
    }

    if (savePlot.level >= config.maxLevel) {
      this.refreshHud(`${config.name} 已满级，每天产出 ${calculateFarmYield(config, savePlot)} ${config.ingredientName}`);
      return;
    }

    const cost = getFarmUpgradeCost(config, savePlot);
    if (this.saveData.coins < cost) {
      this.refreshHud(`金币不足，升级 ${config.name} 需要 ${cost} 金币`);
      return;
    }

    this.saveData.coins -= cost;
    savePlot.level += 1;
    this.unlockStaffByProgress();
    this.checkAchievements();
    SaveManager.save(this.saveData);
    this.refreshFarmPanel();
    this.refreshHud(`${config.name} 升到 ${savePlot.level} 级，明天产量提升到 ${calculateFarmYield(config, savePlot)} ${config.ingredientName}`);
  }

  private formatFarmText(): string {
    return FARM_PLOT_ORDER
      .map((plotId) => {
        const config = getFarmPlotConfig(plotId);
        const savePlot = this.getFarmSavePlot(plotId);
        if (this.saveData.level < config.unlockShopLevel && !savePlot.unlocked) {
          return `${config.shortName}${config.unlockShopLevel}级`;
        }
        if (!savePlot.unlocked || savePlot.level <= 0) {
          return `${config.shortName}可解锁`;
        }
        return `${config.shortName}${savePlot.level}`;
      })
      .join(' ');
  }

  private getFarmButtonText(plotId: FarmPlotId): string {
    const config = getFarmPlotConfig(plotId);
    const savePlot = this.getFarmSavePlot(plotId);
    if (this.saveData.level < config.unlockShopLevel && !savePlot.unlocked) {
      return `${config.shortName}
${config.unlockShopLevel}级解锁`;
    }
    if (!savePlot.unlocked || savePlot.level <= 0) {
      return `${config.shortName}
解锁`;
    }
    if (savePlot.level >= config.maxLevel) {
      return `${config.shortName}
满级${calculateFarmYield(config, savePlot)}`;
    }
    return `${config.shortName}
升${savePlot.level + 1}级 ${getFarmUpgradeCost(config, savePlot)}金`;
  }

  private formatIngredientCost(cost: IngredientCostConfig): string {
    const text = getIngredientCostEntries(cost)
      .map(([key, amount]) => `${INGREDIENT_NAMES[key]}${amount}`)
      .join('、');
    return text || '无';
  }

  private formatIngredientStock(): string {
    const stock = this.saveData.ingredients;
    return `茶底：茶叶${stock.teaLeaf} 糖${stock.sugar} 花${stock.flower} 果${stock.fruit}｜雅致${this.saveData.decoration.elegantCoins} 美观${this.saveData.decoration.beautyScore}｜农场 ${this.formatFarmText()}`;
  }

  private formatActionHint(): string {
    if (this.isDayEnded) {
      return '今天已打烊：查看结算面板，点击“新一天”继续经营';
    }

    if (this.businessDay === 1 && this.dayServedCount === 0 && this.customers.length === 0 && this.readyTeas.length === 0) {
      return `新手提示：首日目标 ${FIRST_DAY_TARGET} 金币；前 3 单会放慢压力，先看气泡订单，再点对应茶饮`;
    }

    if (this.businessDay === 1 && this.dayServedCount === 0 && this.customers.length > 0) {
      return '新手提示：先完成第一单；按钮会显示等茶桌号，成品会自动上桌';
    }

    const pressure = this.calculateServicePressure();
    if (pressure.urgentTables > 0) {
      return `制作台压力高：先救急单，系统会暂缓新客；当前待做 ${pressure.waitingCups} 杯，队列 ${pressure.queueCount}/3`;
    }

    if (!this.saveData.longTerm.extendedToday && !this.isDayEnded && this.dayRevenue + 80 >= this.dayTarget && this.businessDayTimer < 25) {
      return `经营提示：快达成今日目标，可花 ${this.getExtendCost()} 金延长营业冲评级`;
    }

    if (this.workstation?.isFull()) {
      return `制作台已满：先等一杯完成再点新茶；当前待做 ${pressure.waitingCups} 杯`;
    }

    if (this.businessDay === 1 && this.dayServedCount > 0 && this.dayServedCount < FIRST_DAY_FAST_ORDER_COUNT) {
      return `新手提示：已完成 ${this.dayServedCount}/${FIRST_DAY_FAST_ORDER_COUNT} 单，继续接单攒金币准备升级`;
    }

    const expiringTea = this.readyTeas
      .filter((tea) => tea.remainingFreshSeconds <= 3)
      .sort((a, b) => a.remainingFreshSeconds - b.remainingFreshSeconds)[0];
    if (expiringTea) {
      return `优先处理：成品台的 ${expiringTea.recipe.name} 快凉了，没有对应订单就别继续囤同款`;
    }

    const urgentCustomer = this.customers
      .filter((customer) => customer.recipe && customer.remainingCups > 0)
      .sort((a, b) => a.remainingPatience - b.remainingPatience)[0];
    if (urgentCustomer?.recipe && urgentCustomer.isUrgent()) {
      return `优先处理：第 ${urgentCustomer.seatIndex + 1} 桌剩 ${Math.ceil(urgentCustomer.remainingPatience)} 秒，急需 ${urgentCustomer.recipe.name}`;
    }

    const readyMatch = this.readyTeas.find((tea) => this.getWaitingOrderCount(tea.recipe.id) > 0);
    if (readyMatch) {
      return `经营提示：${readyMatch.recipe.name} 已在成品台，等待自动上茶结算`;
    }

    const firstOrder = this.customers
      .filter((customer) => customer.recipe && customer.remainingCups > 0)
      .sort((a, b) => a.remainingPatience - b.remainingPatience)[0];
    if (firstOrder?.recipe) {
      return `经营提示：先做第 ${firstOrder.seatIndex + 1} 桌的 ${firstOrder.recipe.name}，避免耐心耗尽`;
    }

    const levelConfig = getLevelConfig(this.saveData.level);
    if (this.customers.length >= levelConfig.maxCustomers || this.findFreeSeatIndex() < 0) {
      return '经营提示：座位已满，先完成订单再迎接新客';
    }

    if (this.saveData.coins >= this.getSupplyCost() && this.isAnyCoreIngredientLow()) {
      return '经营提示：食材偏低，可以先补货，避免接到订单却做不了';
    }

    return '经营提示：等客人入座后，按订单点击茶饮按钮制作';
  }


  private initializeLongTermSystems(): void {
    this.saveData.longTerm.currentWeek = this.getWeekForDay(this.businessDay);
    this.saveData.season.activeActivityId = this.saveData.season.activeActivityId || 'none';
    for (const recipe of RECIPES) {
      if (recipe.unlockLevel <= this.saveData.level) {
        this.recordRecipeUnlocked(recipe);
      }
    }
    this.unlockStaffByProgress();
    this.applyWorkstationLevel();
    SaveManager.save(this.saveData);
  }

  private updateLongTermAutomation(deltaTime: number): void {
    if ((this.workstation?.getQueueCount() ?? 0) === 0 && this.readyTeas.length === 0) {
      this.workstationIdleSeconds += deltaTime;
    } else {
      this.workstationIdleSeconds = 0;
    }

    if (this.isDayEnded) {
      return;
    }

    this.staffTimer -= deltaTime;
    if (this.staffTimer <= 0) {
      const waiter = this.getStaffMember('waiter');
      const interval = Math.max(3, WAITER_BASE_INTERVAL - (waiter?.level ?? 1) * 0.6);
      this.staffTimer = interval;
      this.tryWaiterAutoAction();
    }
  }

  private getWeekForDay(day: number): number {
    return Math.max(1, Math.ceil(day / WEEK_LENGTH_DAYS));
  }

  private getWeeklyGoal(): WeeklyGoalConfig {
    const week = this.saveData.longTerm.currentWeek || this.getWeekForDay(this.businessDay);
    if (week === 1) {
      return { revenue: 1200, servedCups: 30, sGrades: 0, researchCount: 0 };
    }
    if (week === 2) {
      return { revenue: 3500, servedCups: 60, sGrades: 1, researchCount: 0 };
    }
    if (week === 3) {
      return { revenue: 8000, servedCups: 90, sGrades: 2, researchCount: 2 };
    }
    return {
      revenue: 8000 + (week - 3) * 2600,
      servedCups: 90 + (week - 3) * 24,
      sGrades: Math.min(5, 2 + Math.floor((week - 3) / 2)),
      researchCount: Math.min(5, 2 + Math.floor((week - 3) / 3)),
    };
  }

  private isWeeklyGoalMet(): boolean {
    const goal = this.getWeeklyGoal();
    return this.saveData.longTerm.weeklyRevenue >= goal.revenue
      && this.saveData.longTerm.weeklyServedCups >= goal.servedCups
      && this.saveData.longTerm.weeklySGrades >= goal.sGrades
      && this.saveData.longTerm.weeklyResearchCount >= goal.researchCount;
  }

  private recordLongTermDayResult(grade: string): string {
    const longTerm = this.saveData.longTerm;
    longTerm.totalRevenue += this.dayRevenue;
    longTerm.totalServedCups += this.dayServedCount;
    longTerm.totalLostCustomers += this.dayLostCount;
    longTerm.totalWastedTea += this.dayWastedTeaCount;
    longTerm.weeklyRevenue += this.dayRevenue;
    longTerm.weeklyServedCups += this.dayServedCount;
    if (grade === 'S') {
      longTerm.totalSGrades += 1;
      longTerm.weeklySGrades += 1;
      longTerm.consecutiveSGrades += 1;
      longTerm.consecutiveAGradesOrBetter += 1;
    } else if (grade === 'A') {
      longTerm.totalAGrades += 1;
      longTerm.consecutiveSGrades = 0;
      longTerm.consecutiveAGradesOrBetter += 1;
    } else {
      longTerm.consecutiveSGrades = 0;
      longTerm.consecutiveAGradesOrBetter = 0;
    }
    longTerm.recentDayResults.push({
      day: this.businessDay,
      week: longTerm.currentWeek,
      revenue: this.dayRevenue,
      target: this.dayTarget,
      grade,
      servedCups: this.dayServedCount,
      lostCustomers: this.dayLostCount,
      wastedTea: this.dayWastedTeaCount,
      eventName: this.activeDailyEvent.name,
    });
    longTerm.recentDayResults = longTerm.recentDayResults.slice(-LONG_TERM_LOG_LIMIT);
    this.saveData.season.seasonExp += grade === 'S' ? 30 : grade === 'A' ? 20 : 10;

    if (this.isWeeklyGoalMet() && !longTerm.weeklyGoalClaimed) {
      longTerm.weeklyGoalClaimed = true;
      this.saveData.coins += 300 + longTerm.currentWeek * 80;
      this.saveData.ingredients.teaLeaf += 20;
      this.saveData.ingredients.sugar += 10;
      this.saveData.ingredients.flower += 8;
      this.saveData.ingredients.fruit += 4;
      this.saveData.decoration.elegantCoins += 50;
      return `周目标达成：金币 +${300 + longTerm.currentWeek * 80}、食材包、雅致币 +50`;
    }
    return '';
  }

  private formatRecentDayResults(): string {
    const items = this.saveData.longTerm.recentDayResults.slice(-3);
    if (items.length === 0) {
      return '近况：暂无历史记录';
    }
    return `近况：${items.map((item) => `第${item.day}天${item.grade}`).join('｜')}`;
  }

  private getExtendCost(): number {
    return 80 + this.saveData.level * 20;
  }

  private getResearchCost(): IngredientStock {
    const multiplier = this.getActiveActivity().researchCostMultiplier ?? 1;
    return {
      teaLeaf: Math.max(1, Math.ceil(RESEARCH_COST.teaLeaf * multiplier)),
      sugar: Math.max(1, Math.ceil(RESEARCH_COST.sugar * multiplier)),
      flower: Math.max(1, Math.ceil(RESEARCH_COST.flower * multiplier)),
      fruit: Math.max(1, Math.ceil(RESEARCH_COST.fruit * multiplier)),
    };
  }

  private getActiveActivity(): ActivityConfig {
    return ACTIVITIES.find((activity) => activity.id === this.saveData.season.activeActivityId) ?? ACTIVITIES[0];
  }

  private rotateActivityForNewDay(): void {
    if (this.saveData.season.lastActivityDay === this.businessDay) {
      return;
    }
    this.saveData.season.lastActivityDay = this.businessDay;
    if (this.businessDay < 4) {
      this.saveData.season.activeActivityId = 'none';
      return;
    }
    if (this.businessDay % 3 !== 1) {
      return;
    }
    const candidates = ACTIVITIES.filter((activity) => activity.id !== 'none');
    const picked = candidates[Math.floor(Math.random() * candidates.length)] ?? ACTIVITIES[0];
    this.saveData.season.activeActivityId = picked.id;
  }

  private getActivityRevenueMultiplier(recipe: RecipeConfig): number {
    const activity = this.getActiveActivity();
    if (activity.id === 'tea_fair') {
      return [RecipeId.GreenTea, RecipeId.BlackTea, RecipeId.JasmineTea].indexOf(recipe.id as RecipeId) >= 0 ? 2 : 1;
    }
    return activity.revenueMultiplier ?? 1;
  }

  private getSpecialRequestChance(): number {
    const progress = Math.max(0, this.saveData.level - 1) / 9;
    return SPECIAL_REQUEST_BASE_CHANCE + (SPECIAL_REQUEST_MAX_CHANCE - SPECIAL_REQUEST_BASE_CHANCE) * progress;
  }

  private maybeApplySpecialRequest(customer: Customer): string {
    if (Math.random() > this.getSpecialRequestChance()) {
      return '';
    }
    this.specialRequestCustomers.add(customer);
    return '｜特殊请求：加糖，收入提升';
  }

  private getSpecialRequestMultiplier(customer: Customer): number {
    return this.specialRequestCustomers.has(customer) ? SPECIAL_REQUEST_INCOME_MULTIPLIER : 1;
  }

  private getDecorationTipBonus(): number {
    return (this.saveData.decoration?.beautyScore ?? this.saveData.beautyScore ?? 0) * DECORATION_TIP_BONUS_PER_BEAUTY;
  }

  private getPrestigeTipBonus(): number {
    return this.saveData.level >= getMaxDemoLevel() ? (this.saveData.prestige.level - 1) * 0.005 : 0;
  }

  private getPrestigePatienceBonus(): number {
    return this.saveData.level >= getMaxDemoLevel() ? Math.floor((this.saveData.prestige.level - 1) / 5) * 0.005 : 0;
  }

  private addPrestigeExpForDay(grade: string): void {
    if (this.saveData.level < getMaxDemoLevel()) {
      return;
    }
    let gained = this.dayServedCount + Math.floor(this.dayRevenue / 80);
    if (grade === 'S') {
      gained += 80;
    } else if (grade === 'A') {
      gained += 40;
    }
    this.saveData.prestige.exp += gained;
    this.saveData.prestige.totalExp += gained;
    while (this.saveData.prestige.level < 50 && this.saveData.prestige.exp >= this.getPrestigeNeed()) {
      this.saveData.prestige.exp -= this.getPrestigeNeed();
      this.saveData.prestige.level += 1;
      this.saveData.coins += 120 + this.saveData.prestige.level * 20;
    }
  }

  private getPrestigeNeed(): number {
    return 180 + this.saveData.prestige.level * 45;
  }

  private recordRecipeUnlocked(recipe: RecipeConfig | DevelopedRecipeRuntime | DevelopedDrinkSave): void {
    const id = recipe.id;
    if (this.saveData.collection.unlockedRecipeIds.indexOf(id) < 0) {
      this.saveData.collection.unlockedRecipeIds.push(id);
    }
    let stat = this.saveData.collection.recipeStats.find((item) => item.id === id);
    if (!stat) {
      stat = {
        id,
        name: recipe.name,
        soldCups: 0,
        totalRevenue: 0,
        bestIncome: 0,
        firstUnlockedDay: this.businessDay,
        tier: 'tier' in recipe ? recipe.tier : undefined,
        taste: 'taste' in recipe ? recipe.taste : undefined,
        aroma: 'aroma' in recipe ? recipe.aroma : undefined,
        popularity: 'popularity' in recipe ? recipe.popularity : undefined,
        rarity: 'rarity' in recipe ? recipe.rarity : undefined,
      };
      this.saveData.collection.recipeStats.push(stat);
    }
  }

  private recordRecipeSale(recipe: RecipeConfig, income: number): void {
    this.recordRecipeUnlocked(recipe);
    const stat = this.saveData.collection.recipeStats.find((item) => item.id === recipe.id);
    if (!stat) {
      return;
    }
    stat.soldCups += 1;
    stat.totalRevenue += income;
    stat.bestIncome = Math.max(stat.bestIncome, income);
  }

  private checkAchievements(): void {
    for (const achievement of ACHIEVEMENTS) {
      if (this.saveData.achievements.claimedAchievementIds.indexOf(achievement.id) >= 0) {
        continue;
      }
      if (this.isAchievementMet(achievement.id)) {
        this.saveData.achievements.claimedAchievementIds.push(achievement.id);
        this.applyAchievementReward(achievement.id);
      }
    }
  }

  private isAchievementMet(id: string): boolean {
    switch (id) {
      case 'first_day': return this.businessDay > 1 || this.saveData.longTerm.recentDayResults.length > 0;
      case 'level_2': return this.saveData.level >= 2;
      case 'serve_100': return this.saveData.longTerm.totalServedCups >= 100;
      case 'perfect_day': return this.dayServedCount > 0 && this.dayLostCount === 0 && this.dayWastedTeaCount === 0;
      case 'first_s': return this.saveData.longTerm.totalSGrades >= 1 || this.lastDayGrade === 'S';
      case 'streak_a_3': return this.saveData.longTerm.consecutiveAGradesOrBetter >= 3;
      case 'research_1': return this.saveData.longTerm.totalResearchCount >= 1;
      case 'research_ss': return this.saveData.developedRecipes.some((drink) => drink.tier === 'SS');
      case 'farm_all': return FARM_PLOT_ORDER.every((plotId) => this.getFarmSavePlot(plotId).unlocked);
      case 'farm_max': return FARM_PLOT_ORDER.every((plotId) => this.getFarmSavePlot(plotId).level >= getFarmPlotConfig(plotId).maxLevel);
      case 'week_goal': return this.saveData.longTerm.weeklyGoalClaimed;
      case 'prestige_5': return this.saveData.prestige.level >= 5;
      default: return false;
    }
  }

  private applyAchievementReward(id: string): void {
    if (id === 'first_day') this.saveData.coins += 80;
    if (id === 'level_2') this.saveData.ingredients.teaLeaf += 10;
    if (id === 'serve_100') this.saveData.coins += 300;
    if (id === 'perfect_day') { this.saveData.ingredients.sugar += 10; this.saveData.ingredients.flower += 6; }
    if (id === 'first_s') this.saveData.decoration.elegantCoins += 30;
    if (id === 'streak_a_3') this.saveData.ingredients.fruit += 5;
    if (id === 'research_1') this.saveData.coins += 100;
    if (id === 'research_ss') this.saveData.decoration.elegantCoins += 80;
    if (id === 'farm_all') this.saveData.ingredients.teaLeaf += 30;
    if (id === 'farm_max') this.saveData.coins += 1000;
    if (id === 'week_goal') this.saveData.decoration.elegantCoins += 50;
    if (id === 'prestige_5') this.saveData.decoration.elegantCoins += 100;
  }

  private getStaffMember(id: StaffId): StaffMemberSave | null {
    return this.saveData.staff.members.find((member) => member.id === id) ?? null;
  }

  private unlockStaffByProgress(): string {
    const unlocked: string[] = [];
    const waiter = this.getStaffMember('waiter');
    if (waiter && !waiter.unlocked && this.saveData.level >= 3) {
      waiter.unlocked = true;
      unlocked.push('小二入职');
    }
    const teaMaster = this.getStaffMember('teaMaster');
    if (teaMaster && !teaMaster.unlocked && this.saveData.level >= 5) {
      teaMaster.unlocked = true;
      unlocked.push('茶师入职');
    }
    const buyer = this.getStaffMember('buyer');
    if (buyer && !buyer.unlocked && FARM_PLOT_ORDER.every((plotId) => this.getFarmSavePlot(plotId).unlocked)) {
      buyer.unlocked = true;
      unlocked.push('采办入职');
    }
    return unlocked.join('、');
  }

  private getTeaMasterSpeedBonus(): number {
    const teaMaster = this.getStaffMember('teaMaster');
    if (!teaMaster?.unlocked) {
      return 0;
    }
    const staminaFactor = teaMaster.stamina <= 0 ? 0.5 : 1;
    return (0.15 + (teaMaster.level - 1) * 0.05) * staminaFactor;
  }

  private tryWaiterAutoAction(): void {
    const waiter = this.getStaffMember('waiter');
    if (!waiter?.unlocked || waiter.stamina <= 0 || this.workstation?.isFull()) {
      return;
    }
    const candidates = this.customers
      .filter((customer) => customer.recipe && customer.remainingCups > 0 && this.getMissingIngredientText(customer.recipe) === '')
      .filter((customer) => RECIPES.some((recipe) => recipe.id === customer.recipe?.id));
    if (candidates.length === 0) {
      return;
    }
    if (waiter.strategy === 'expensive') {
      candidates.sort((a, b) => (b.recipe?.price ?? 0) - (a.recipe?.price ?? 0));
    } else if (waiter.strategy === 'queue') {
      candidates.sort((a, b) => b.remainingCups - a.remainingCups);
    } else {
      candidates.sort((a, b) => (a.isUrgent() === b.isUrgent() ? a.remainingPatience - b.remainingPatience : a.isUrgent() ? -1 : 1));
    }
    const recipeId = candidates[0].recipe?.id as RecipeId | undefined;
    if (!recipeId) {
      return;
    }
    waiter.stamina = Math.max(0, waiter.stamina - 1);
    this.enqueueRecipe(recipeId);
  }

  private restoreStaffForNewDay(): void {
    for (const staff of this.saveData.staff.members) {
      staff.stamina = Math.min(STAFF_STAMINA_MAX, staff.stamina + 35);
    }
  }

  private applyBuyerSuppliesForNewDay(): string {
    const buyer = this.getStaffMember('buyer');
    if (!buyer?.unlocked) {
      return '';
    }
    const staminaFactor = buyer.stamina <= 0 ? 0.5 : 1;
    const levelBonus = buyer.level - 1;
    const tea = Math.floor((3 + levelBonus) * staminaFactor);
    const sugar = Math.floor((1 + Math.floor(levelBonus / 2)) * staminaFactor);
    const flower = Math.floor((1 + Math.floor(levelBonus / 2)) * staminaFactor);
    this.saveData.ingredients.teaLeaf += tea;
    this.saveData.ingredients.sugar += sugar;
    this.saveData.ingredients.flower += flower;
    buyer.stamina = Math.max(0, buyer.stamina - 5);
    return `采办补给：茶叶+${tea} 糖+${sugar} 花+${flower}`;
  }

  private upgradeStaff(id: StaffId): void {
    const staff = this.getStaffMember(id);
    if (!staff?.unlocked) {
      this.refreshHud(`${STAFF_NAMES[id]}尚未解锁`);
      return;
    }
    if (staff.level >= 10) {
      this.refreshHud(`${STAFF_NAMES[id]}已满级`);
      return;
    }
    const cost = 280 + staff.level * 160;
    if (this.saveData.coins < cost) {
      this.refreshHud(`金币不足，升级${STAFF_NAMES[id]}需要 ${cost}`);
      return;
    }
    this.saveData.coins -= cost;
    staff.level += 1;
    staff.stamina = STAFF_STAMINA_MAX;
    this.applyWorkstationLevel();
    SaveManager.save(this.saveData);
    this.refreshHud(`${STAFF_NAMES[id]}升到 Lv.${staff.level}`);
  }


  private buildResearchPanel(parent: Node): void {
    const panel = createPanel('ResearchPanel', 610, 430, new Color(55, 32, 20, 238));
    parent.addChild(panel);
    panel.setSiblingIndex(9998);
    panel.setPosition(0, 8, 0);
    panel.active = false;
    this.researchPanel = panel;

    const titleNode = createLabel('ResearchTitleLabel', '茶谱研发', 25, new Color(255, 226, 160, 255));
    panel.addChild(titleNode);
    titleNode.setPosition(0, 174, 0);

    const summaryNode = createLabel('ResearchSummaryLabel', '', 15, new Color(255, 245, 220, 255));
    panel.addChild(summaryNode);
    summaryNode.setPosition(0, 124, 0);
    this.researchSummaryLabel = summaryNode.getComponent(Label);

    const actionButton = createButton('ResearchActionButton', '研发新茶', 180, 52, () => this.researchDrink());
    panel.addChild(actionButton);
    actionButton.setPosition(0, 66, 0);

    const listNode = createLabel('ResearchListLabel', '', 15, new Color(255, 245, 220, 255));
    const listLabel = listNode.getComponent(Label);
    if (listLabel) listLabel.lineHeight = 22;
    panel.addChild(listNode);
    listNode.setPosition(0, -54, 0);
    this.researchListLabel = listLabel;
    this.refreshResearchPanel();
  }

  private refreshResearchPanel(): void {
    if (this.researchSummaryLabel) {
      const cost = this.getResearchCost();
      this.researchSummaryLabel.string = `消耗：${this.formatIngredientCost(cost)}｜已研发 ${this.saveData.developedRecipes.length}/30｜图鉴 ${this.saveData.collection.unlockedRecipeIds.length}`;
    }
    if (this.researchListLabel) {
      const drinks = this.saveData.developedRecipes.slice(0, 6);
      this.researchListLabel.string = drinks.length === 0
        ? '暂无研发饮品。点击“研发新茶”生成带品阶和属性的新茶谱。'
        : drinks.map((drink, index) => `${index + 1}. ${drink.tier} ${drink.name}｜价${drink.price}｜味${drink.taste} 香${drink.aroma} 人气${drink.popularity} 稀有${drink.rarity}`).join('\n');
    }
  }

  private buildStaffPanel(parent: Node): void {
    const panel = createPanel('StaffPanel', 610, 390, new Color(55, 32, 20, 238));
    parent.addChild(panel);
    panel.setSiblingIndex(9998);
    panel.setPosition(0, 20, 0);
    panel.active = false;
    this.staffPanel = panel;
    const titleNode = createLabel('StaffTitleLabel', '员工与排班', 25, new Color(255, 226, 160, 255));
    panel.addChild(titleNode);
    titleNode.setPosition(0, 154, 0);
    const summaryNode = createLabel('StaffSummaryLabel', '', 15, new Color(255, 245, 220, 255));
    panel.addChild(summaryNode);
    summaryNode.setPosition(0, 110, 0);
    this.staffSummaryLabel = summaryNode.getComponent(Label);
    this.staffButtonLabels = {};
    const rows: Array<{ id: StaffId; y: number }> = [
      { id: 'waiter', y: 50 },
      { id: 'teaMaster', y: -35 },
      { id: 'buyer', y: -120 },
    ];
    for (const row of rows) {
      const button = createButton(`Staff_${row.id}`, STAFF_NAMES[row.id], 460, 58, () => this.upgradeStaff(row.id));
      panel.addChild(button);
      button.setPosition(0, row.y, 0);
      const label = button.getChildByName(`Staff_${row.id}_Label`)?.getComponent(Label) ?? null;
      if (label) this.staffButtonLabels[row.id] = label;
    }
    const closeButton = createButton('StaffCloseButton', '返回茶肆', 150, 44, () => this.hideStaffPanel());
    panel.addChild(closeButton);
    closeButton.setPosition(0, -168, 0);
    this.refreshStaffPanel();
  }

  private showStaffPanel(): void {
    this.refreshStaffPanel();
    if (this.staffPanel) this.staffPanel.active = true;
  }

  private hideStaffPanel(): void {
    if (this.staffPanel) this.staffPanel.active = false;
  }

  private refreshStaffPanel(): void {
    if (this.staffSummaryLabel) {
      this.staffSummaryLabel.string = `小二自动制茶｜茶师加速｜采办每日补给｜茶点 ${this.saveData.staff.teaSnack}`;
    }
    for (const staff of this.saveData.staff.members) {
      const label = this.staffButtonLabels[staff.id];
      if (!label) continue;
      if (!staff.unlocked) {
        const unlock = staff.id === 'waiter' ? '店铺3级' : staff.id === 'teaMaster' ? '店铺5级' : '农场全解锁';
        label.string = `${STAFF_NAMES[staff.id]}\n未解锁：${unlock}`;
      } else {
        label.string = `${STAFF_NAMES[staff.id]} Lv.${staff.level}｜体力${staff.stamina}\n升级 ${280 + staff.level * 160} 金`;
      }
    }
  }

  private buildDecorationPanel(parent: Node): void {
    const panel = createPanel('DecorationPanel', 610, 430, new Color(55, 32, 20, 238));
    parent.addChild(panel);
    panel.setSiblingIndex(9998);
    panel.setPosition(0, 8, 0);
    panel.active = false;
    this.decorationPanel = panel;
    const titleNode = createLabel('DecorationTitleLabel', '茶肆装饰', 25, new Color(255, 226, 160, 255));
    panel.addChild(titleNode);
    titleNode.setPosition(0, 174, 0);
    const summaryNode = createLabel('DecorationSummaryLabel', '', 15, new Color(255, 245, 220, 255));
    panel.addChild(summaryNode);
    summaryNode.setPosition(0, 132, 0);
    this.decorationSummaryLabel = summaryNode.getComponent(Label);
    this.decorationButtonLabels = {};
    DECORATIONS.forEach((decor, index) => {
      const x = index % 2 === 0 ? -145 : 145;
      const y = 62 - Math.floor(index / 2) * 76;
      const button = createButton(`Decor_${decor.id}`, decor.name, 250, 54, () => this.buyDecoration(decor.id));
      panel.addChild(button);
      button.setPosition(x, y, 0);
      const label = button.getChildByName(`Decor_${decor.id}_Label`)?.getComponent(Label) ?? null;
      if (label) this.decorationButtonLabels[decor.id] = label;
    });
    const closeButton = createButton('DecorationCloseButton', '返回茶肆', 150, 44, () => this.hideDecorationPanel());
    panel.addChild(closeButton);
    closeButton.setPosition(0, -184, 0);
    this.refreshDecorationPanel();
  }

  private showDecorationPanel(): void {
    this.switchMainTab('decoration');
  }

  private hideDecorationPanel(): void {
    if (this.decorationPanel) this.decorationPanel.active = false;
  }

  private buyDecoration(id: string): void {
    const decor = DECORATIONS.find((item) => item.id === id);
    if (!decor) return;
    if (this.saveData.decoration.ownedDecorationIds.indexOf(id) >= 0) {
      this.refreshHud(`${decor.name} 已拥有`);
      return;
    }
    if (this.saveData.decoration.elegantCoins < decor.cost) {
      this.refreshHud(`雅致币不足，购买 ${decor.name} 需要 ${decor.cost}`);
      return;
    }
    this.saveData.decoration.elegantCoins -= decor.cost;
    this.saveData.decoration.ownedDecorationIds.push(id);
    this.saveData.decoration.beautyScore += decor.beautyScore;
    this.saveData.beautyScore = this.saveData.decoration.beautyScore;
    this.saveData.ownedDecorations = [...this.saveData.decoration.ownedDecorationIds];
    SaveManager.save(this.saveData);
    this.refreshDecorationVisuals();
    this.refreshDecorationPanel();
    this.refreshHud(`购入装饰：${decor.name}，美观 +${decor.beautyScore}`);
  }

  private refreshDecorationPanel(): void {
    if (this.decorationSummaryLabel) {
      this.decorationSummaryLabel.string = `雅致币 ${this.saveData.decoration.elegantCoins}｜美观 ${this.saveData.decoration.beautyScore}｜小费加成 ${(this.getDecorationTipBonus() * 100).toFixed(1)}%`;
    }
    for (const decor of DECORATIONS) {
      const label = this.decorationButtonLabels[decor.id];
      if (!label) continue;
      const owned = this.saveData.decoration.ownedDecorationIds.indexOf(decor.id) >= 0;
      label.string = owned ? `${decor.name}\n已拥有｜美观+${decor.beautyScore}` : `${decor.name}\n${decor.cost}雅致币｜美观+${decor.beautyScore}`;
    }
  }

  private isAnyCoreIngredientLow(): boolean {
    const stock = this.saveData.ingredients;
    return stock.teaLeaf <= 5 || stock.sugar <= 2 || stock.flower <= 2 || stock.fruit <= 1;
  }

  private getWaitingOrderCount(recipeId: string): number {
    return this.customers
      .filter((customer) => customer.canReceive(recipeId))
      .reduce((sum, customer) => sum + customer.remainingCups, 0);
  }

  private getWaitingOrderTables(recipeId: string): string {
    const tables = this.customers
      .filter((customer) => customer.canReceive(recipeId))
      .sort((a, b) => a.remainingPatience - b.remainingPatience)
      .slice(0, 3)
      .map((customer) => `${customer.seatIndex + 1}${customer.isUrgent() ? '急' : ''}`);
    return tables.join('/');
  }

  private getUrgentOrderCount(recipeId: string): number {
    return this.customers
      .filter((customer) => customer.canReceive(recipeId) && customer.isUrgent())
      .reduce((sum, customer) => sum + customer.remainingCups, 0);
  }

  private getRecipeButtonText(recipe: RecipeConfig): string {
    const levelConfig = getLevelConfig(this.saveData.level);
    const shortName = recipe.name
      .replace('山野', '')
      .replace('蜜香', '')
      .replace('清茶', '')
      .replace('冻饮', '')
      .replace('果茶', '')
      .replace('桃花', '桃');
    const labelPrefix = `　${shortName}`;
    if (levelConfig.unlockedRecipeIds.indexOf(recipe.id) < 0) {
      return `${labelPrefix}\n未解锁`;
    }

    const waitingCount = this.getWaitingOrderCount(recipe.id);
    const urgentCount = this.getUrgentOrderCount(recipe.id);
    const tableText = this.getWaitingOrderTables(recipe.id);
    const missingText = this.getMissingIngredientText(recipe);
    if (missingText) {
      return `${labelPrefix}
缺料`;
    }

    if (!this.saveData.longTerm.extendedToday && !this.isDayEnded && this.dayRevenue + 80 >= this.dayTarget && this.businessDayTimer < 25) {
      return `经营提示：快达成今日目标，可花 ${this.getExtendCost()} 金延长营业冲评级`;
    }

    if (this.workstation?.isFull()) {
      const queueCount = this.workstation.getQueueCount();
      return `${labelPrefix}
制作忙${queueCount}/3`;
    }

    if (urgentCount > 0) {
      return `${labelPrefix}
急单×${urgentCount}`;
    }
    if (waitingCount > 0) {
      return tableText ? `${labelPrefix}
${tableText}桌｜${waitingCount}` : `${labelPrefix}
订单×${waitingCount}`;
    }
    return `${labelPrefix}
待命`;
  }

  private refreshButtonLabels(): void {
    const recipes = [
      getRecipe(RecipeId.GreenTea),
      getRecipe(RecipeId.BlackTea),
      getRecipe(RecipeId.JasmineTea),
      getRecipe(RecipeId.OsmanthusTea),
      getRecipe(RecipeId.PearFruitTea),
      getRecipe(RecipeId.PeachBrew),
    ];

    for (const recipe of recipes) {
      const label = this.recipeButtonLabels[recipe.id as RecipeId];
      if (label) {
        label.string = this.getRecipeButtonText(recipe);
      }
    }

    if (this.upgradeButtonLabel) {
      if (this.saveData.level >= getMaxDemoLevel()) {
        this.upgradeButtonLabel.string = '满级\n挑战评级';
      } else {
        const cost = getLevelConfig(this.saveData.level).upgradeCost;
        const need = Math.max(0, cost - this.saveData.coins);
        this.upgradeButtonLabel.string = need <= 0 ? '升级\n可升级' : `升级\n差${need}`;
      }
    }

    if (this.supplyButtonLabel) {
      this.supplyButtonLabel.string = `补货\n${this.getSupplyCost()}金`;
    }

    if (this.researchButtonLabel) {
      const missingText = this.getMissingIngredientTextFromCost(this.getResearchCost());
      this.researchButtonLabel.string = missingText ? '研发\n缺料' : '研发\n可试制';
    }

    if (this.nextDayButtonLabel) {
      this.nextDayButtonLabel.string = this.isDayEnded ? '新一天\n开始' : '打烊\n结算';
    }

    if (this.extendButtonLabel) {
      this.extendButtonLabel.string = this.saveData.longTerm.extendedToday ? '延长\n已用' : `延长\n${this.getExtendCost()}金`;
    }

    for (const plotId of FARM_PLOT_ORDER) {
      const label = this.farmButtonLabels[plotId];
      if (label) {
        label.string = this.getFarmButtonText(plotId);
      }
    }
  }

  private formatUrgentAlertText(): string {
    const urgentCustomer = this.customers
      .filter((customer) => customer.recipe && customer.remainingCups > 0 && customer.isUrgent())
      .sort((a, b) => a.remainingPatience - b.remainingPatience)[0];
    if (!urgentCustomer?.recipe) {
      return '急单：暂无';
    }
    return `🔥急单 ${urgentCustomer.seatIndex + 1}桌\n${urgentCustomer.recipe.name}×${urgentCustomer.remainingCups}｜${Math.ceil(urgentCustomer.remainingPatience)}秒`;
  }

  private formatReadyTeas(): string {
    if (this.readyTeas.length === 0) {
      return `成品台：空（最多 ${READY_TEA_LIMIT} 杯，没人点时别囤太久）`;
    }

    const teas = this.readyTeas
      .map((tea) => {
        const seconds = Math.ceil(tea.remainingFreshSeconds);
        const waitingCount = this.getWaitingOrderCount(tea.recipe.id);
        const warning = seconds <= 3 ? '快凉' : waitingCount > 0 ? '可上' : '候单';
        return `${tea.recipe.name}${seconds}秒/${warning}`;
      })
      .join(' / ');
    return `成品台：${teas}`;
  }

  private formatGoalText(): string {
    const currentConfig = getLevelConfig(this.saveData.level);
    const week = this.saveData.longTerm.currentWeek || this.getWeekForDay(this.businessDay);
    const weeklyGoal = this.getWeeklyGoal();
    const dayText = this.isDayEnded
      ? `第 ${this.businessDay} 天｜第 ${week} 周｜已打烊｜评级 ${this.lastDayGrade || '-'}`
      : `第 ${this.businessDay} 天｜第 ${week} 周｜${Math.ceil(this.businessDayTimer)} 秒｜${this.activeDailyEvent.name}｜${this.getActiveActivity().name}`;
    const weekText = `本周 ${this.saveData.longTerm.weeklyRevenue}/${weeklyGoal.revenue} 金｜${this.saveData.longTerm.weeklyServedCups}/${weeklyGoal.servedCups} 杯`;
    if (this.saveData.level >= getMaxDemoLevel()) {
      return `${dayText}｜今日 ${this.dayRevenue}/${this.dayTarget}｜${weekText}｜声望 Lv.${this.saveData.prestige.level}`;
    }

    const nextConfig = getLevelConfig(this.saveData.level + 1);
    const need = Math.max(0, currentConfig.upgradeCost - this.saveData.coins);
    return `${dayText}｜今日 ${this.dayRevenue}/${this.dayTarget}｜${weekText}｜再赚 ${need} 金升 ${this.saveData.level + 1} 级：${nextConfig.unlockText}`;
  }

  private refreshHud(message?: string): void {
    if (this.messageLabel && message) {
      this.messageLabel.string = message;
      this.messageLabel.fontSize = 12;
    }
    this.refreshStatusLabels();
    if (this.farmPanel?.active) {
      this.refreshFarmPanel();
    }
    if (this.staffPanel?.active) {
      this.refreshStaffPanel();
    }
    if (this.decorationPanel?.active) {
      this.refreshDecorationPanel();
    }
    if (this.researchPanel?.active) {
      this.refreshResearchPanel();
    }
  }

  private refreshStatusLabels(): void {
    if (this.levelLabel) {
      this.levelLabel.string = `第${this.businessDay}天｜口碑${this.reputationScore}｜桌${getLevelConfig(this.saveData.level).seatCount}/6`;
      this.levelLabel.fontSize = 15;
    }
    if (this.coinsLabel) {
      this.coinsLabel.string = `金币 ${this.saveData.coins}`;
      this.coinsLabel.fontSize = 18;
    }
    if (this.goalLabel) {
      this.goalLabel.string = this.formatGoalText();
    }
    if (this.ingredientLabel) {
      this.ingredientLabel.string = this.formatIngredientStock();
    }
    if (this.actionHintLabel) {
      this.actionHintLabel.string = this.formatActionHint();
    }
    if (this.urgentAlertLabel) {
      this.urgentAlertLabel.string = this.formatUrgentAlertText();
    }
    if (this.readyTeaLabel) {
      this.readyTeaLabel.string = this.formatReadyTeas();
    }
    this.refreshButtonLabels();
  }
}
