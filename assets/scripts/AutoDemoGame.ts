import { _decorator, Button, Camera, Canvas, Color, Component, find, game, Game, Graphics, instantiate, Label, Layers, Node, Rect, resources, Size, Sprite, SpriteFrame, Texture2D, Tween, tween, UITransform, Vec3, view, Widget } from 'cc';
import { Customer } from './Customer';
import { CUSTOMER_TYPES, CustomerTypeId, getLevelConfig, getMaxDemoLevel, getRecipe, IngredientCostConfig, RecipeConfig, RecipeId, RECIPES, TEAHOUSE_DECORATION_VISUALS, TEAHOUSE_FURNITURE, TEAHOUSE_TABLE_FURNITURE, TEAHOUSE_TEXTURE_PATHS, TeahouseDecorationVisualConfig, TeahouseFurnitureConfig, TeahouseTableFurnitureConfig, TeahouseTextureKey } from './GameConfig';
import { FarmPlotId, getFarmPlotConfig } from './FarmConfig';
import { FarmManager } from './FarmManager';
import { CollectionViewModel, DaySettledPayload, EventBus, GameEventName, HudViewModel, MainTabId, OfflineRewardSummary, OrderCompletedPayload, PlayEffectPayload, PrimaryActionId, RequestRevivePayload, ResearchCompletedPayload, ResearchResultSummary, ReviveOfferPayload, ReviveSuccessPayload, ShopUpgradedPayload, SupplyItemId, SupplyShopViewModel, WorkstationQteStatePayload } from './EventBus';
import { NavigationBar } from './NavigationBar';
import { DevelopedDrinkSave, GameSaveData, IngredientStock, SaveManager, StaffId, StaffMemberSave } from './SaveManager';
import { SeatManager } from './SeatManager';
import { SimpleProgressBar } from './SimpleProgressBar';
import { AchievementSystem } from './systems/AchievementSystem';
import { FARM_PLOT_SEQUENCE, FarmSystem } from './systems/FarmSystem';
import { UIManager } from './UIManager';
import { TeaReadyResult, Workstation } from './Workstation';

const { ccclass, property } = _decorator;

type TextureKey = TeahouseTextureKey;
type MainTab = MainTabId;
type IngredientKey = keyof IngredientStock;

interface ReadyTea {
  recipe: RecipeConfig;
  remainingFreshSeconds: number;
  heatQuality: HeatQuality;
  heatBonusRate: number;
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

type HeatQuality = 'normal' | 'perfect';

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
const SAVE_DEBOUNCE_MS = 600;
const OFFLINE_REWARD_MAX_SECONDS = 60 * 60 * 2;
const OFFLINE_COINS_PER_MINUTE = 18;
const COMBO_WINDOW_SECONDS = 6;
const COMBO_BONUS_STEP = 0.08;
const COMBO_BONUS_MAX = 0.5;
const PERFECT_HEAT_BONUS_RATE = 0.12;
const REVIVE_ELEGANT_COIN_COST = 50;
const REVIVE_REPUTATION_RESTORE = 30;
const REVIVE_CUSTOMER_COUNT = 3;
const REVIVE_MIN_BUSINESS_SECONDS = 25;

interface WeeklyGoalConfig {
  revenue: number;
  servedCups: number;
  sGrades: number;
  researchCount: number;
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

const SUPPLY_SHOP_ITEMS: Array<{ id: SupplyItemId; name: string; basePrice: number; amount: number }> = [
  { id: 'teaLeaf', name: '茶叶', basePrice: 32, amount: 12 },
  { id: 'sugar', name: '糖', basePrice: 28, amount: 8 },
  { id: 'flower', name: '花', basePrice: 34, amount: 8 },
  { id: 'fruit', name: '果', basePrice: 42, amount: 4 },
];

const TEXTURE_PATHS: Record<TextureKey, readonly string[]> = TEAHOUSE_TEXTURE_PATHS;

function addTextureSprite(node: Node, textureKey: TextureKey, width: number, height: number): Sprite {
  const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  const transform = node.getComponent(UITransform) ?? addUiTransform(node, width, height);
  transform.setContentSize(width, height);

  const paths = TEXTURE_PATHS[textureKey];
  const hasLegacyPath = paths.some((path) => /[^\x00-\x7F]/.test(path));
  if (hasLegacyPath) {
    console.warn(`资源 ${textureKey} 仍保留中文回退路径，发布微信小游戏前请完成英文化资源重命名。`);
  }
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
        return;
      }

      resources.load(path, SpriteFrame, (frameError: Error | null, spriteFrame: SpriteFrame | null) => {
        if (!frameError && spriteFrame) {
          sprite.spriteFrame = spriteFrame;
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
  const root = new Node(name);
  addUiTransform(root, width, height);
  const background = createPanel(`${name}_Background`, width, height, new Color(85, 70, 50, 255));
  root.addChild(background);
  background.setPosition(0, 0, 0);
  const bar = createPanel(`${name}_Bar`, width, height, new Color(85, 190, 95, 255));
  root.addChild(bar);
  bar.setPosition(0, 0, 0);
  const progress = root.addComponent(SimpleProgressBar);
  progress.fillNode = bar;
  progress.progress = 0;
  return root;
}

function ensureCamera(canvasNode: Node): void {
  const canvas = canvasNode.getComponent(Canvas);
  const existingCamera = canvas?.cameraComponent ?? canvasNode.getChildByName('Camera')?.getComponent(Camera) ?? find('Main Camera')?.getComponent(Camera);
  if (existingCamera) {
    existingCamera.projection = Camera.ProjectionType.ORTHO;
    existingCamera.orthoHeight = DESIGN_RESOLUTION_HEIGHT / 2;
    existingCamera.visibility = Layers.Enum.UI_2D | Layers.Enum.DEFAULT;
    if (canvas) {
      canvas.cameraComponent = existingCamera;
    }
    return;
  }

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

const MANUAL_CUSTOMER_DEFAULT_HEIGHT = 112;
const MANUAL_CUSTOMER_MIN_HEIGHT = 64;
const MANUAL_CUSTOMER_MAX_HEIGHT = 150;

function getManualCustomerDisplaySize(template: Node, spriteFrame?: SpriteFrame | null): { width: number; height: number } {
  const templateSize = template.getComponent(UITransform)?.contentSize;
  const frameSize = spriteFrame?.originalSize;
  const sourceWidth = templateSize?.width && templateSize.width > 0 ? templateSize.width : (frameSize?.width ?? 74);
  const sourceHeight = templateSize?.height && templateSize.height > 0 ? templateSize.height : (frameSize?.height ?? 155);
  const aspect = sourceHeight > 0 ? sourceWidth / sourceHeight : 74 / 155;
  const requestedHeight = Math.max(sourceHeight * Math.abs(template.scale.y || 1), MANUAL_CUSTOMER_MIN_HEIGHT);
  const height = Math.min(MANUAL_CUSTOMER_MAX_HEIGHT, requestedHeight || MANUAL_CUSTOMER_DEFAULT_HEIGHT);
  return {
    width: Math.max(32, height * aspect),
    height,
  };
}

function safeDestroyNode(node: Node): void {
  if (!node.isValid) {
    return;
  }
  node.removeFromParent();
  node.destroy();
}

function removeGeneratedTableBadges(node: Node): void {
  const children = [...node.children];
  for (const child of children) {
    if (/^Table_\d+_(Badge|StatusBadge)$/.test(child.name)) {
      safeDestroyNode(child);
    }
  }
}

function isManualCustomerNode(node: Node): boolean {
  return /^(Manual)?(Customer|Scholar|customer_scholar)(Template)?(_\d+)?$/i.test(node.name)
    || node.name === 'Customer_Scholar'
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
  const generatedNames = ['order_bubble', 'PatienceBar'];
  for (const name of generatedNames) {
    const child = node.getChildByName(name);
    if (!child) {
      continue;
    }
    safeDestroyNode(child);
  }
}

function findFirstSpriteFrame(node: Node): SpriteFrame | null {
  const sprite = node.getComponent(Sprite);
  if (sprite?.spriteFrame) {
    return sprite.spriteFrame;
  }

  for (const child of node.children) {
    const childFrame = findFirstSpriteFrame(child);
    if (childFrame) {
      return childFrame;
    }
  }

  return null;
}

function findFirstSprite(node: Node): Sprite | null {
  const sprite = node.getComponent(Sprite);
  if (sprite) {
    return sprite;
  }

  for (const child of node.children) {
    const childSprite = findFirstSprite(child);
    if (childSprite) {
      return childSprite;
    }
  }

  return null;
}

function loadFirstAvailableSpriteFrame(paths: readonly string[], onLoaded: (frame: SpriteFrame | null) => void, index = 0): void {
  const path = paths[index];
  if (!path) {
    onLoaded(null);
    return;
  }

  resources.load(path, SpriteFrame, (error, spriteFrame) => {
    if (!error && spriteFrame) {
      onLoaded(spriteFrame);
      return;
    }

    if (index < paths.length - 1) {
      loadFirstAvailableSpriteFrame(paths, onLoaded, index + 1);
      return;
    }

    onLoaded(null);
  });
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
    safeDestroyNode(child);
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
  const node = new Node(config.nodeName);
  addUiTransform(node, config.width, config.height);
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
  @property({ type: SpriteFrame, displayName: 'Farm Background Sprite' })
  farmBackgroundSprite: SpriteFrame | null = null;

  private saveData: GameSaveData = SaveManager.load();
  private uiManager: UIManager | null = null;
  private achievementSystem: AchievementSystem | null = null;
  private farmSystem: FarmSystem | null = null;
  private pendingOfflineReward: OfflineRewardSummary | null = null;
  private pendingEndDayTrigger: 'manual' | 'timeout' | null = null;
  private reviveOfferActive = false;
  private reviveUsedToday = false;
  private readonly handleRequestMakeRecipeEvent = (recipeId: RecipeId) => {
    this.makeRecipe(recipeId);
  };
  private readonly handleRequestPrimaryActionEvent = (actionId: PrimaryActionId) => {
    if (actionId === 'upgrade') {
      this.upgradeShop();
      return;
    }
    if (actionId === 'supply') {
      this.openSupplyShop('选择要补充的原料，按当前缺口采购。');
      return;
    }
    if (actionId === 'extendDay') {
      this.extendBusinessDay();
      return;
    }
    if (actionId === 'dayButton') {
      this.handleDayButton();
      return;
    }
    if (actionId === 'showHelp') {
      this.showHelpPanel();
    }
  };
  private settlementPanel: Node | null = null;
  private settlementLabel: Label | null = null;
  private readonly handleRequestSwitchMainTabEvent = (tabId: MainTab) => {
    this.switchMainTab(tabId);
  };
  private readonly handleWorkstationQteStateEvent = (payload: WorkstationQteStatePayload) => {
    if (this.isDayEnded || !payload.recipeName) {
      return;
    }

    if (payload.active) {
      this.refreshHud(`火候到位：${payload.recipeName} 已进入完美窗口，点击制作台可收茶`);
      return;
    }

    if (payload.progress >= payload.windowEnd) {
      this.refreshHud(`${payload.recipeName} 错过完美窗口，已按普通品质出茶`);
    }
  };
  private readonly handleRequestOpenSupplyShopEvent = () => {
    this.openSupplyShop('选择要补充的原料，按当前缺口采购。');
  };
  private readonly handleRequestBuySupplyItemEvent = (itemId: SupplyItemId) => {
    this.buySupplyItem(itemId);
  };
  private readonly handleRequestDoubleOfflineRewardEvent = () => {
    this.doubleOfflineReward();
  };
  private readonly handleRequestReviveEvent = (payload: RequestRevivePayload) => {
    this.handleReviveRequest(payload);
  };
  private readonly handleReviveSuccessEvent = (payload: ReviveSuccessPayload) => {
    this.handleReviveSuccess(payload);
  };
  private farmButtonLabels: Partial<Record<FarmPlotId, Label>> = {};
  private farmDescriptionLabels: Partial<Record<FarmPlotId, Label>> = {};
  private farmPageBackground: Node | null = null;
  private farmPanel: Node | null = null;
  private farmManager: FarmManager | null = null;
  private farmSummaryLabel: Label | null = null;
  private teahousePageRoot: Node | null = null;
  private researchPanel: Node | null = null;
  private researchSummaryLabel: Label | null = null;
  private researchListLabel: Label | null = null;
  private currentMainTab: MainTab = 'teahouse';
  private helpPanel: Node | null = null;
  private debugControlsRoot: Node | null = null;
  private debugToggleLabel: Label | null = null;
  private debugControlsVisible = DEBUG_CONTROLS_DEFAULT_VISIBLE;
  private customerRoot: Node | null = null;
  private manualCustomerTemplate: Node | null = null;
  private manualTestScholarSprite: Sprite | null = null;
  private manualTestOrderBubble: Node | null = null;
  private manualTestRootNode: Node | null = null;
  private manualTestWaitFrame: SpriteFrame | null = null;
  private manualTestDrinkFrame: SpriteFrame | null = null;
  private manualTestHappyFrame: SpriteFrame | null = null;
  private manualTestButtonsBound = false;
  private runtimeRoot: Node | null = null;
  private decorationVisualRoot: Node | null = null;
  private controlLayer: Node | null = null;
  private workstation: Workstation | null = null;
  private workstationNode: Node | null = null;
  private seatNodes: Node[] = [];
  private seatStatusLabels: Array<Label | null> = [];
  private readonly seatManager = new SeatManager();
  private customers: Customer[] = [];
  private customerPool: Node[] = [];
  private readonly initialCustomerPoolSize = 8;
  private readyTeas: ReadyTea[] = [];
  private spawnTimer = 1;
  private spawnPaused = false;
  private lostCount = 0;
  private servedCount = 0;
  private wastedTeaCount = 0;
  private serveStreak = 0;
  private comboCount = 0;
  private comboTimer = 0;
  private comboBest = 0;
  private perfectHeatCount = 0;
  private perfectHeatBest = 0;
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
  private navigationBar: NavigationBar | null = null;
  private entrancePosition = new Vec3(-360, 235, 0);
  private exitPosition = new Vec3(360, 235, 0);

  onLoad(): void {
    game.on(Game.EVENT_HIDE, this.handleGameHide, this);
    EventBus.on(GameEventName.RequestMakeRecipe, this.handleRequestMakeRecipeEvent, this);
    EventBus.on(GameEventName.RequestPrimaryAction, this.handleRequestPrimaryActionEvent, this);
    EventBus.on(GameEventName.RequestSwitchMainTab, this.handleRequestSwitchMainTabEvent, this);
    EventBus.on(GameEventName.RequestOpenSupplyShop, this.handleRequestOpenSupplyShopEvent, this);
    EventBus.on(GameEventName.RequestBuySupplyItem, this.handleRequestBuySupplyItemEvent, this);
    EventBus.on(GameEventName.RequestDoubleOfflineReward, this.handleRequestDoubleOfflineRewardEvent, this);
    EventBus.on(GameEventName.RequestRevive, this.handleRequestReviveEvent, this);
    EventBus.on(GameEventName.OnReviveSuccess, this.handleReviveSuccessEvent, this);
    EventBus.on(GameEventName.WorkstationQteState, this.handleWorkstationQteStateEvent, this);
    const canvas = this.node.getComponent(Canvas);
    if (canvas) {
      const canvasConfig = canvas as Canvas & { fitWidth?: boolean; fitHeight?: boolean; alignCanvasWithScreen?: boolean };
      canvasConfig.fitWidth = true;
      canvasConfig.fitHeight = false;
      canvasConfig.alignCanvasWithScreen = true;
    }
    this.applyAdaptiveLayout();
    view.setResizeCallback(() => {
      this.applyAdaptiveLayout();
    });
  }

  onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.handleGameHide, this);
    view.setResizeCallback(null);
    EventBus.off(GameEventName.RequestMakeRecipe, this.handleRequestMakeRecipeEvent, this);
    EventBus.off(GameEventName.RequestPrimaryAction, this.handleRequestPrimaryActionEvent, this);
    EventBus.off(GameEventName.RequestSwitchMainTab, this.handleRequestSwitchMainTabEvent, this);
    EventBus.off(GameEventName.RequestOpenSupplyShop, this.handleRequestOpenSupplyShopEvent, this);
    EventBus.off(GameEventName.RequestBuySupplyItem, this.handleRequestBuySupplyItemEvent, this);
    EventBus.off(GameEventName.RequestDoubleOfflineReward, this.handleRequestDoubleOfflineRewardEvent, this);
    EventBus.off(GameEventName.RequestRevive, this.handleRequestReviveEvent, this);
    EventBus.off(GameEventName.OnReviveSuccess, this.handleReviveSuccessEvent, this);
    EventBus.off(GameEventName.WorkstationQteState, this.handleWorkstationQteStateEvent, this);
    this.workstationNode?.off(Node.EventType.TOUCH_END, this.handleWorkstationTouchEnd, this);
    this.achievementSystem?.dispose();
    SaveManager.flushPendingSave();
  }

  start(): void {
    this.saveData = SaveManager.load();
    this.businessDay = this.saveData.businessDay;
    this.syncUnlockedTablesWithLevel();
    const workstationSyncText = this.syncWorkstationLevelWithShopLevel();
    if (workstationSyncText) {
      SaveManager.save(this.saveData);
    }
    this.initFeatureSystems();
    this.refreshDevelopedRecipeMenu();
    this.buildScene();
    this.dayTarget = this.calculateDayTarget();
    this.activeDailyEvent = this.pickDailyEvent();
    this.initializeLongTermSystems();
    this.workstation?.setTeaReadyCallback((result) => this.onTeaReady(result));
    this.hideSettlementPanel();
    this.applyOfflineRewards();
    this.refreshHud(`餐厅版启动：${getLevelConfig(this.saveData.level).seatCount} 张桌｜首日目标 ${FIRST_DAY_TARGET} 金币｜先完成 3 单熟悉流程`);
  }

  update(deltaTime: number): void {
    this.updateComboTimer(deltaTime);
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
    const manualBackground = findNodeByName(root, 'bg_teahouse') ?? findNodeByName(root, 'BackgroundImage_Teahouse');
    if (manualBackground) {
      this.backgroundNode = manualBackground;
      manualBackground.setSiblingIndex(0);
      manualBackground.setPosition(0, 0, 0);
      applyLayerRecursively(manualBackground, Layers.Enum.UI_2D);
    } else {
      const bg = createImageNode('bg_teahouse', 'background', 1408, 2503);
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

    const topBar = createPanel('TopStatusBar', 680, 78, new Color(45, 28, 18, 176));
    topHudRoot.addChild(topBar);
    topBar.setPosition(0, 586, 0);

    const uiManagerNode = controlLayer.getChildByName('UIManagerRoot') ?? new Node('UIManagerRoot');
    if (!uiManagerNode.parent) {
      controlLayer.addChild(uiManagerNode);
    }
    uiManagerNode.setSiblingIndex(20000);
    this.uiManager = uiManagerNode.getComponent(UIManager) ?? uiManagerNode.addComponent(UIManager);

    const levelNode = createLabel('LevelLabel', '第1天  口碑100', 16, new Color(255, 236, 195, 255));
    topBar.addChild(levelNode);
    levelNode.setPosition(-228, 16, 0);
    const levelLabel = levelNode.getComponent(Label);
    this.uiManager.levelLabel = levelLabel;

    const coinsNode = createLabel('CoinsLabel', '金币 0', 18, new Color(255, 236, 195, 255));
    topBar.addChild(coinsNode);
    coinsNode.setPosition(228, 16, 0);
    const coinsLabel = coinsNode.getComponent(Label);
    this.uiManager.coinsLabel = coinsLabel;

    const messageNode = createLabel('MessageLabel', '看订单，点茶饮，自动上茶', 13, new Color(255, 236, 195, 255));
    topBar.addChild(messageNode);
    messageNode.setPosition(0, -16, 0);
    const messageLabel = messageNode.getComponent(Label);
    this.uiManager.messageLabel = messageLabel;

    const guidePanel = createPanel('GuidePanel', 640, 68, new Color(45, 28, 18, 176));
    topHudRoot.addChild(guidePanel);
    guidePanel.setSiblingIndex(9996);
    guidePanel.setPosition(0, 514, 0);

    const goalNode = createLabel('GoalLabel', '', 14, new Color(255, 245, 220, 255));
    guidePanel.addChild(goalNode);
    goalNode.setPosition(0, 12, 0);
    this.uiManager.goalLabel = goalNode.getComponent(Label);

    const actionHintNode = createLabel('ActionHintLabel', '', 14, new Color(255, 226, 150, 255));
    const actionHintLabel = actionHintNode.getComponent(Label);
    if (actionHintLabel) {
      actionHintLabel.lineHeight = 18;
    }
    guidePanel.addChild(actionHintNode);
    actionHintNode.setPosition(0, -14, 0);
    this.uiManager.actionHintLabel = actionHintLabel;

    const ingredientPanel = createPanel('IngredientPanel', 640, 34, new Color(45, 28, 18, 156));
    topHudRoot.addChild(ingredientPanel);
    ingredientPanel.setSiblingIndex(9995);
    ingredientPanel.setPosition(0, 470, 0);

    const ingredientNode = createLabel('IngredientLabel', '', 12, new Color(255, 245, 220, 230));
    ingredientPanel.addChild(ingredientNode);
    ingredientNode.setPosition(0, 0, 0);
    this.uiManager.ingredientLabel = ingredientNode.getComponent(Label);

    const urgentAlertPanel = createPanel('UrgentAlertPanel', 176, 46, new Color(120, 32, 22, 176));
    topHudRoot.addChild(urgentAlertPanel);
    urgentAlertPanel.setPosition(-232, 424, 0);
    const urgentAlertNode = createLabel('UrgentAlertLabel', '无急单', 14, new Color(255, 238, 210, 255));
    urgentAlertPanel.addChild(urgentAlertNode);
    urgentAlertNode.setPosition(0, -1, 0);
    this.uiManager.urgentAlertLabel = urgentAlertNode.getComponent(Label);

    this.customerRoot = getOrCreateManualLayer(mainPlayRoot, 'CustomerRoot', 2000);
    this.customerRoot.removeAllChildren();
    this.customerPool.length = 0;
    this.hideLegacyManualSceneButtons(root);
    this.manualCustomerTemplate = findManualCustomerTemplate(root);
    if (this.manualCustomerTemplate) {
      this.manualCustomerTemplate.active = false;
      this.setupManualSceneTestState();
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
    this.seatManager.setBindings(this.seatNodes, this.seatStatusLabels);
    if (this.customerRoot) {
      this.customerRoot.setSiblingIndex(2000);
    }
    this.refreshDecorationVisuals();
    this.refreshSeatVisibility();
    this.warmCustomerPool();

    const workstationConfig = TEAHOUSE_FURNITURE.workstationCounter;
    const customWorkstationNode = findCustomFurnitureNode(root, workstationConfig);
    const workstationNode = customWorkstationNode ?? createConfiguredFurnitureNode(workstationConfig);
    bottomHudRoot.addChild(workstationNode);
    workstationNode.setPosition(0, -430, 0);
    workstationNode.on(Node.EventType.TOUCH_END, this.handleWorkstationTouchEnd, this);
    this.workstationNode = workstationNode;
    const workstation = workstationNode.addComponent(Workstation);
    this.workstation = workstation;

    const queueLabelNode = createLabel('QueueLabel', '制作：空闲｜排队：0/3', 15, new Color(255, 245, 220, 255));
    workstationNode.addChild(queueLabelNode);
    queueLabelNode.setPosition(0, workstationConfig.labelArea.queueY, 0);
    workstation.queueLabel = queueLabelNode.getComponent(Label);

    const progressNode = createProgressBar('WorkstationProgress', 360, 12);
    workstationNode.addChild(progressNode);
    progressNode.setPosition(0, workstationConfig.labelArea.progressY, 0);
    workstation.progressBar = progressNode.getComponent(SimpleProgressBar);
    this.applyWorkstationLevel();

    const readyTeaNode = createLabel('ReadyTeaLabel', '成品台：空', 15, new Color(255, 245, 220, 255));
    workstationNode.addChild(readyTeaNode);
    readyTeaNode.setPosition(0, workstationConfig.labelArea.readyTeaY, 0);
    this.uiManager.readyTeaLabel = readyTeaNode.getComponent(Label);

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

    const controlPanel = createPanel('TeaHouseControlPanel', 700, 152, new Color(45, 28, 18, 124));
    teahousePageRoot.addChild(controlPanel);
    controlPanel.setSiblingIndex(9997);
    controlPanel.setPosition(0, -478, 0);

    const buttonRows: Array<{ name: string; text: string; x: number; y: number; callback: () => void; role?: 'upgrade' | 'supply' | 'nextDay' | 'extend' | 'help'; width?: number; height?: number }> = [
      { name: 'BtnBuySupplies', text: '补货', x: 160, y: 18, callback: () => this.uiManager?.requestPrimaryAction('supply'), role: 'supply', width: 112, height: 40 },
      { name: 'BtnUpgrade', text: '升级', x: 300, y: 18, callback: () => this.uiManager?.requestPrimaryAction('upgrade'), role: 'upgrade', width: 112, height: 40 },
      { name: 'BtnExtendDay', text: '延长', x: -240, y: -24, callback: () => this.uiManager?.requestPrimaryAction('extendDay'), role: 'extend', width: 112, height: 34 },
      { name: 'BtnNextDay', text: '打烊', x: -80, y: -24, callback: () => this.uiManager?.requestPrimaryAction('dayButton'), role: 'nextDay', width: 112, height: 34 },
      { name: 'BtnHelp', text: '说明', x: 80, y: -24, callback: () => this.uiManager?.requestPrimaryAction('showHelp'), role: 'help', width: 82, height: 34 },
    ];

    const debugButtons: Array<{ name: string; text: string; x: number; y: number; callback: () => void; width?: number; height?: number }> = [
      { name: 'BtnDebugSpawn', text: 'Debug\n刷客', x: 0, y: 60, callback: () => this.trySpawnCustomer(true), width: 82, height: 34 },
      { name: 'BtnDebugClear', text: 'Debug\n清档', x: 0, y: 20, callback: () => this.debugClearSave(), width: 82, height: 34 },
      { name: 'BtnDebugLevel', text: 'Debug\n升1级', x: 0, y: -20, callback: () => this.debugLevelUp(), width: 82, height: 34 },
      { name: 'BtnDebugGuestWait', text: 'Debug\n待客', x: 0, y: -60, callback: () => this.handleManualBrewButtonClick(), width: 82, height: 34 },
      { name: 'BtnDebugGuestServe', text: 'Debug\n上茶', x: 0, y: -100, callback: () => this.handleManualServeButtonClick(), width: 82, height: 34 },
    ];

    this.farmButtonLabels = {};
    this.staffButtonLabels = {};
    this.decorationButtonLabels = {};
    this.debugControlsRoot = null;
    this.debugToggleLabel = null;

    const teaButtonContainer = this.uiManager?.teaButtonContainer ?? new Node('TeaButtonContainer');
    if (!teaButtonContainer.parent) {
      controlPanel.addChild(teaButtonContainer);
    }
    teaButtonContainer.setSiblingIndex(9999);
    teaButtonContainer.setPosition(0, 34, 0);
    const teaButtonContainerTransform = teaButtonContainer.getComponent(UITransform) ?? teaButtonContainer.addComponent(UITransform);
    teaButtonContainerTransform.setContentSize(660, 92);
    if (this.uiManager) {
      this.uiManager.teaButtonContainer = teaButtonContainer;
      this.uiManager.refreshTeaButtons(this.getUnlockedStandardRecipes());
    }

    for (const config of buttonRows) {
      const button = createButton(config.name, config.text, config.width ?? 128, config.height ?? 46, config.callback);
      controlPanel.addChild(button);
      button.setSiblingIndex(9999);
      button.setPosition(config.x, config.y, 0);
      const buttonLabel = button.getChildByName(`${config.name}_Label`)?.getComponent(Label) ?? null;
      if (config.role === 'upgrade') {
        this.uiManager?.bindPrimaryButtonLabel('upgrade', buttonLabel);
      } else if (config.role === 'supply') {
        this.uiManager?.bindPrimaryButtonLabel('supply', buttonLabel);
      } else if (config.role === 'nextDay') {
        this.uiManager?.bindPrimaryButtonLabel('nextDay', buttonLabel);
      } else if (config.role === 'extend') {
        this.uiManager?.bindPrimaryButtonLabel('extend', buttonLabel);
      }
    }

    this.buildMainTabBar(bottomHudRoot, root);

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

    this.buildFarmPanel(safeAreaRoot, root);
    this.buildResearchPanel(controlLayer);
    this.buildStaffPanel(controlLayer);
    this.buildDecorationPanel(controlLayer);
    this.buildHelpPanel(controlLayer);
    uiManagerNode.setSiblingIndex(32767);
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
    const backgroundTransform = this.backgroundNode.getComponent(UITransform);
    const sourceWidth = backgroundTransform?.contentSize.width && backgroundTransform.contentSize.width > 0
      ? backgroundTransform.contentSize.width
      : BACKGROUND_SOURCE_WIDTH;
    const sourceHeight = backgroundTransform?.contentSize.height && backgroundTransform.contentSize.height > 0
      ? backgroundTransform.contentSize.height
      : BACKGROUND_SOURCE_HEIGHT;
    const coverScale = Math.max(
      visible.width / sourceWidth,
      visible.height / sourceHeight,
      DESIGN_RESOLUTION_WIDTH / sourceWidth,
      DESIGN_RESOLUTION_HEIGHT / sourceHeight,
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


  private buildMainTabBar(parent: Node, root: Node): void {
    const tabs: Array<{ id: MainTab; text: string; x: number }> = [
      { id: 'teahouse', text: '茶肆', x: -290 },
      { id: 'farm', text: '农场', x: -174 },
      { id: 'staff', text: '员工', x: -58 },
      { id: 'research', text: '研发', x: 58 },
      { id: 'collection', text: '图鉴', x: 174 },
      { id: 'decoration', text: '更多', x: 290 },
    ];
    const existingNav = findNodeByName(root, 'BottomNav');
    if (existingNav) {
      if (existingNav.parent !== parent) {
        existingNav.removeFromParent();
        parent.addChild(existingNav);
      }
      existingNav.setSiblingIndex(10000);
      existingNav.setPosition(0, -574, 0);
      existingNav.setScale(1, 1, 1);
      applyLayerRecursively(existingNav, Layers.Enum.UI_2D);
      const navTransform = existingNav.getComponent(UITransform) ?? existingNav.addComponent(UITransform);
      if (navTransform.contentSize.width <= 0 || navTransform.contentSize.height <= 0) {
        navTransform.setContentSize(720, 168);
      }

      const nav = existingNav.getComponent(NavigationBar);
      if (nav?.tabPrefab && nav.tabContainer && nav.tabConfigs.length > 0) {
        nav.setActiveTab(this.currentMainTab);
        this.navigationBar = nav;
        this.uiManager?.bindNavigationBar(nav);
        return;
      }
    }

    const bar = createPanel('MainTabBar', 700, 58, new Color(45, 28, 18, 210));
    parent.addChild(bar);
    bar.setSiblingIndex(10000);
    bar.setPosition(0, -574, 0);
    for (const tab of tabs) {
      const button = createButton(`Tab_${tab.id}`, this.getNavigationTabLabel(tab.id), 108, 42, () => this.uiManager?.requestSwitchMainTab(tab.id));
      bar.addChild(button);
      button.setPosition(tab.x, 0, 0);
      const label = button.getChildByName(`Tab_${tab.id}_Label`)?.getComponent(Label) ?? null;
      if (label) {
        this.uiManager?.bindMainTabLabel(tab.id, label);
      }
    }
  }

  private getNavigationTabLabel(tabId: MainTab): string {
    const labels: Record<MainTab, string> = {
      teahouse: '\u8336\u8086',
      farm: '\u519c\u573a',
      staff: '\u5458\u5de5',
      research: '\u7814\u53d1',
      collection: '\u56fe\u9274',
      decoration: '\u66f4\u591a',
    };

    return labels[tabId];
  }

  private switchMainTab(tab: MainTab): void {
    this.currentMainTab = tab;
    this.navigationBar?.setActiveTab(tab);
    const isFarmPage = tab === 'farm';
    const useTeahouseBackdrop = !isFarmPage;
    if (this.bottomHudRoot) {
      this.bottomHudRoot.active = true;
      this.bottomHudRoot.setSiblingIndex(40);
    }
    if (this.backgroundNode) {
      this.backgroundNode.active = useTeahouseBackdrop;
    }
    if (this.topHudRoot) {
      this.topHudRoot.active = useTeahouseBackdrop;
    }
    if (this.farmPageBackground) {
      this.farmPageBackground.active = isFarmPage;
    }
    if (this.mainPlayRoot) {
      this.mainPlayRoot.active = tab === 'teahouse';
    }
    if (this.workstationNode) {
      this.workstationNode.active = tab === 'teahouse';
    }
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
      this.staffPanel.active = tab === 'staff';
    }
    EventBus.emit(GameEventName.CollectionViewModel, tab === 'collection' ? this.createCollectionViewModel(true) : this.createCollectionViewModel(false));
    if (tab === 'farm') this.refreshFarmPanel();
    if (tab === 'staff') this.refreshStaffPanel();
    if (tab === 'research') this.refreshResearchPanel();
    if (tab === 'decoration') this.refreshDecorationPanel();
    this.refreshStatusLabels();
    this.refreshHud();
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
    this.debugControlsVisible = !this.debugControlsVisible;
    this.refreshDebugControls();
    this.refreshHud(this.debugControlsVisible ? '调试按钮已显示' : '调试按钮已隐藏');
  }

  private refreshDebugControls(): void {
    if (this.debugControlsRoot) {
      this.debugControlsRoot.active = this.debugControlsVisible;
    }
    if (this.debugToggleLabel) {
      this.debugToggleLabel.string = this.debugControlsVisible ? 'Debug-' : 'Debug+';
    }
  }

  private enqueueRecipe(recipeId: RecipeId): void {
    this.makeRecipe(recipeId);
  }

  private makeRecipe(recipeId: RecipeId): void {
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
      this.openSupplyShop(`${recipe.name} 缺少 ${missingText}，先补货再制作。`, this.getFirstMissingIngredientId(recipe.ingredientCost));
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

  private applyOfflineRewards(): void {
    const idleMilliseconds = Math.max(0, Date.now() - (this.saveData.lastSaveTime ?? Date.now()));
    const idleSeconds = Math.min(OFFLINE_REWARD_MAX_SECONDS, Math.floor(idleMilliseconds / 1000));
    if (idleSeconds < 60) {
      this.pendingOfflineReward = null;
      return;
    }

    const minutes = Math.floor(idleSeconds / 60);
    const coins = minutes * OFFLINE_COINS_PER_MINUTE;
    const teaLeaf = Math.max(1, Math.floor(minutes / 3));
    const sugar = Math.max(0, Math.floor(minutes / 6));
    const flower = Math.max(0, Math.floor(minutes / 8));
    const fruit = Math.max(0, Math.floor(minutes / 12));

    this.saveData.coins += coins;
    this.saveData.ingredients.teaLeaf += teaLeaf;
    this.saveData.ingredients.sugar += sugar;
    this.saveData.ingredients.flower += flower;
    this.saveData.ingredients.fruit += fruit;
    this.pendingOfflineReward = {
      idleSeconds,
      coins,
      teaLeaf,
      sugar,
      flower,
      fruit,
    };
    SaveManager.save(this.saveData);
    EventBus.emit(GameEventName.PopupOfflineReward, this.pendingOfflineReward);
  }

  private doubleOfflineReward(): void {
    if (!this.pendingOfflineReward) {
      return;
    }

    this.saveData.coins += this.pendingOfflineReward.coins;
    this.saveData.ingredients.teaLeaf += this.pendingOfflineReward.teaLeaf;
    this.saveData.ingredients.sugar += this.pendingOfflineReward.sugar;
    this.saveData.ingredients.flower += this.pendingOfflineReward.flower;
    this.saveData.ingredients.fruit += this.pendingOfflineReward.fruit;
    SaveManager.save(this.saveData);
    this.refreshHud(`离线收益已双倍领取：金币 +${this.pendingOfflineReward.coins}，食材奖励已补发`);
    this.pendingOfflineReward = null;
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
    const upgradePayload: ShopUpgradedPayload = { level: this.saveData.level };
    EventBus.emit(GameEventName.ShopUpgraded, upgradePayload);
    SaveManager.save(this.saveData);
    this.applyWorkstationLevel();
    this.refreshSeatVisibility();
    const newRecipes = RECIPES
      .filter((recipe) => recipe.unlockLevel === this.saveData.level)
      .map((recipe) => recipe.name);
    EventBus.emit(GameEventName.PopupUpgradeUnlock, {
      level: this.saveData.level,
      seatCount: getLevelConfig(this.saveData.level).seatCount,
      unlockText: getLevelConfig(this.saveData.level).unlockText,
      newRecipes,
      workstationText: workstationUpgradeText || undefined,
      staffText: staffUnlockText || undefined,
    });
    this.uiManager?.refreshTeaButtons(this.getUnlockedStandardRecipes());
    const recipeText = newRecipes.length > 0 ? `｜新茶饮：${newRecipes.join('、')}` : '';
    const workstationText = workstationUpgradeText ? `｜${workstationUpgradeText}` : '';
    const staffText = staffUnlockText ? `｜${staffUnlockText}` : '';
    this.refreshHud(`升级成功：店铺 ${this.saveData.level} 级｜${getLevelConfig(this.saveData.level).unlockText}${recipeText}${workstationText}${staffText}`);
  }

  private openSupplyShop(messageText = '选择要补充的原料。', highlightedItemId?: SupplyItemId): void {
    EventBus.emit(GameEventName.SupplyShopViewModel, this.createSupplyShopViewModel(true, messageText, highlightedItemId));
  }

  private buySupplyItem(itemId: SupplyItemId): void {
    const item = SUPPLY_SHOP_ITEMS.find((config) => config.id === itemId);
    if (!item) {
      return;
    }
    const price = this.getSupplyItemPrice(item.id);
    if (this.saveData.coins < price) {
      const need = price - this.saveData.coins;
      const message = `金币不足：购买${item.name}需要 ${price} 金，还差 ${need}。`;
      this.refreshHud(message);
      this.openSupplyShop(message, item.id);
      return;
    }

    const bonus = this.activeDailyEvent.supplyBonus?.[item.id] ?? 0;
    const amount = item.amount + bonus;
    this.saveData.coins -= price;
    this.saveData.longTerm.dailySupplyCount += 1;
    this.saveData.ingredients[item.id] += amount;
    this.requestDeferredSave();

    const message = `补货成功：${item.name} +${amount}，花费 ${price} 金。`;
    this.refreshHud(message);
    this.openSupplyShop(message, item.id);
  }

  private researchDrink(): void {
    const cost = this.getResearchCost();
    const missingText = this.getMissingIngredientTextFromCost(cost);
    if (missingText) {
      this.refreshHud(`研发食材不足：${missingText}`);
      this.openSupplyShop(`研发缺少 ${missingText}，先补齐关键原料再试制新茶。`, this.getFirstMissingIngredientId(cost));
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
    const researchCompletedPayload: ResearchCompletedPayload = {
      name: drink.name,
      tier: drink.tier,
    };
    EventBus.emit(GameEventName.ResearchCompleted, researchCompletedPayload);
    SaveManager.save(this.saveData);
    const researchSummary: ResearchResultSummary = {
      name: drink.name,
      tier: drink.tier,
      price: drink.price,
      taste: drink.taste,
      aroma: drink.aroma,
      popularity: drink.popularity,
      rarity: drink.rarity,
    };
    EventBus.emit(GameEventName.PopupResearchResult, researchSummary);
    this.refreshDevelopedRecipeMenu();
    if (this.currentMainTab === 'collection') {
      EventBus.emit(GameEventName.CollectionViewModel, this.createCollectionViewModel(true));
    }
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
    this.requestEndBusinessDay('manual');
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
    this.requestDeferredSave();
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
    this.reviveOfferActive = false;
    this.reviveUsedToday = false;
    this.pendingEndDayTrigger = null;
    this.spawnPaused = false;
    this.lastDayGrade = '';
    this.hideSettlementPanel();
    this.activeDailyEvent = this.pickDailyEvent();
    this.readyTeas.length = 0;
    this.serveStreak = 0;
    this.resetCombo();
    this.sameRecipeStreak = 0;
    this.lastQueuedRecipeId = '';
    this.workstationIdleSeconds = 0;
    this.spawnTimer = 1;
    this.clearAllCustomers();
    this.workstation?.clearQueue();
    this.applyWorkstationLevel();
    this.resetPerfectHeat();
    const harvestText = this.harvestFarmForNewDay();
    const buyerText = this.applyBuyerSuppliesForNewDay();
    const harvestPrefix = [harvestText, buyerText].filter(Boolean).join('｜');
    this.refreshHud(`第 ${this.businessDay} 天开始：${harvestPrefix ? `${harvestPrefix}｜` : ''}事件｜${this.activeDailyEvent.name}｜活动｜${this.getActiveActivity().name}`);
  }

  private updateBusinessDay(deltaTime: number): void {
    if (this.isDayEnded || this.reviveOfferActive) {
      return;
    }

    this.businessDayTimer = Math.max(0, this.businessDayTimer - deltaTime);
    if (this.businessDayTimer <= 0) {
      this.requestEndBusinessDay('timeout');
    }
  }

  private requestEndBusinessDay(trigger: 'manual' | 'timeout'): void {
    if (this.isDayEnded) {
      return;
    }

    if (this.reviveOfferActive) {
      return;
    }

    if (!this.reviveUsedToday) {
      const reviveReason = this.getReviveOfferReason();
      if (reviveReason) {
        this.pendingEndDayTrigger = trigger;
        this.reviveOfferActive = true;
        const payload: ReviveOfferPayload = {
          coinCost: REVIVE_ELEGANT_COIN_COST,
          restoreReputation: REVIVE_REPUTATION_RESTORE,
          customerCount: REVIVE_CUSTOMER_COUNT,
          reason: reviveReason,
        };
        EventBus.emit(GameEventName.PopupReviveOffer, payload);
        this.refreshHud('经营危险：现在可以通过复活挽回客流，避免今天直接崩盘');
        return;
      }
    }

    this.proceedToEndBusinessDay(trigger);
  }

  private proceedToEndBusinessDay(trigger: 'manual' | 'timeout'): void {
    if (trigger === 'manual') {
      this.saveData.longTerm.manualClosedToday = true;
      if (this.dayRevenue < this.dayTarget) {
        if (this.businessDayTimer > 60) {
          this.reputationScore = Math.max(0, this.reputationScore - 4);
        } else if (this.businessDayTimer > 30) {
          this.reputationScore = Math.max(0, this.reputationScore - 2);
        }
      }
      this.refreshHud(this.dayRevenue >= this.dayTarget ? '今日目标已达成，稳健打烊' : '提前打烊：收入未达标时会影响口碑');
    }

    this.pendingEndDayTrigger = null;
    this.finalizeBusinessDay();
  }

  private finalizeBusinessDay(): void {
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
    const daySettledPayload: DaySettledPayload = {
      day: this.businessDay,
      grade,
      revenue: this.dayRevenue,
      servedCups: this.dayServedCount,
      lostCustomers: this.dayLostCount,
      wastedTea: this.dayWastedTeaCount,
    };
    EventBus.emit(GameEventName.DaySettled, daySettledPayload);
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

  private getReviveOfferReason(): ReviveOfferPayload['reason'] | null {
    if (this.reputationScore <= 0) {
      return 'reputation_zero';
    }

    if (this.calculateDayGrade() === 'C' && this.dayLostCount >= 2) {
      return 'grade_risk';
    }

    return null;
  }

  private handleReviveRequest(payload: RequestRevivePayload): void {
    if (!this.reviveOfferActive) {
      return;
    }

    if (payload.method === 'skip') {
      const trigger = this.pendingEndDayTrigger ?? 'manual';
      this.reviveOfferActive = false;
      this.pendingEndDayTrigger = null;
      this.proceedToEndBusinessDay(trigger);
      return;
    }

    if (payload.method === 'token' && this.saveData.decoration.elegantCoins < payload.coinCost) {
      this.refreshHud(`雅致币不足：复活需要 ${payload.coinCost} 雅致币`);
      return;
    }

    if (payload.method === 'token') {
      this.saveData.decoration.elegantCoins -= payload.coinCost;
    }

    const successPayload: ReviveSuccessPayload = {
      method: payload.method,
      restoreReputation: REVIVE_REPUTATION_RESTORE,
      customerCount: REVIVE_CUSTOMER_COUNT,
    };
    EventBus.emit(GameEventName.OnReviveSuccess, successPayload);
  }

  private handleReviveSuccess(payload: ReviveSuccessPayload): void {
    if (!this.reviveOfferActive) {
      return;
    }

    this.reviveOfferActive = false;
    this.reviveUsedToday = true;
    this.pendingEndDayTrigger = null;
    this.saveData.longTerm.manualClosedToday = false;
    this.reputationScore = Math.min(100, this.reputationScore + payload.restoreReputation);
    this.businessDayTimer = Math.max(this.businessDayTimer, REVIVE_MIN_BUSINESS_SECONDS);
    this.spawnPaused = false;
    const spawnedCount = this.spawnReviveCustomers(payload.customerCount);
    SaveManager.save(this.saveData);
    this.refreshHud(`复活成功：口碑 +${payload.restoreReputation}，已唤回 ${spawnedCount} 位高价值客人继续营业`);
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
      this.recycleCustomer(customer);
    }
    this.customers.length = 0;
    this.seatManager.clearOccupancy();
    this.specialRequestCustomers.clear();
    this.refreshSeatVisibility();
  }

  private syncUnlockedTablesWithLevel(): void {
    const levelSeatCount = getLevelConfig(this.saveData.level).seatCount;
    if (this.saveData.unlockedSeatCount !== levelSeatCount) {
      this.saveData.unlockedSeatCount = levelSeatCount;
      this.requestDeferredSave();
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
    this.uiManager?.refreshTeaButtons(this.getUnlockedStandardRecipes());
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
    const upgradePayload: ShopUpgradedPayload = { level: this.saveData.level };
    EventBus.emit(GameEventName.ShopUpgraded, upgradePayload);
    SaveManager.save(this.saveData);
    this.applyWorkstationLevel();
    this.refreshSeatVisibility();
    this.uiManager?.refreshTeaButtons(this.getUnlockedStandardRecipes());
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

    const seatIndex = this.seatManager.findFreeSeatIndex(this.saveData.unlockedSeatCount);
    if (seatIndex < 0 || !this.customerRoot) {
      this.refreshHud('当前没有空座位');
      return;
    }

    const customerNode = this.obtainCustomerNode();
    this.customerRoot.addChild(customerNode);
    const seatNode = this.seatManager.getSeatNode(seatIndex);
    if (!seatNode) {
      this.refreshHud('桌位节点缺失，无法安排客人');
      const pooledCustomer = customerNode.getComponent(Customer);
      if (pooledCustomer) {
        this.recycleCustomer(pooledCustomer);
      } else {
        safeDestroyNode(customerNode);
      }
      return;
    }
    const tableConfig = getRestaurantTableConfig(seatIndex);
    const targetPosition = seatNode.position.clone().add(new Vec3(0, tableConfig.customerYOffset, 0));
    customerNode.setPosition(this.entrancePosition);
    customerNode.active = true;

    const customer = customerNode.getComponent(Customer)!;
    const customerType = this.pickCustomerType();
    const recipe = this.pickRecipeForCustomer(customerType.allowedRecipeIds);
    const groupSize = this.pickCustomerGroupSize();
    this.finishSpawningCustomer(customer, customerType, recipe, groupSize, seatIndex, targetPosition, false);
    const specialText = this.specialRequestCustomers.has(customer) ? '｜特殊请求：加糖，收入提升' : '';
    this.refreshHud(`${customerType.name}x${groupSize} 入座第 ${seatIndex + 1} 桌，点了 ${recipe.name}x${groupSize}${specialText}`);
  }

  private spawnReviveCustomers(count: number): number {
    let spawnedCount = 0;
    for (let index = 0; index < count; index += 1) {
      const seatIndex = this.findFreeSeatIndex();
      if (seatIndex < 0 || !this.customerRoot) {
        break;
      }

      const seatNode = this.seatManager.getSeatNode(seatIndex);
      if (!seatNode) {
        break;
      }

      const customerNode = this.obtainCustomerNode();
      this.customerRoot.addChild(customerNode);
      customerNode.setPosition(this.entrancePosition);
      customerNode.active = true;
      const customer = customerNode.getComponent(Customer);
      if (!customer) {
        safeDestroyNode(customerNode);
        continue;
      }

      const customerType = this.pickHighValueCustomerType();
      const recipe = this.pickHighValueRecipeForCustomer(customerType.allowedRecipeIds);
      const tableConfig = getRestaurantTableConfig(seatIndex);
      const targetPosition = seatNode.position.clone().add(new Vec3(0, tableConfig.customerYOffset, 0));
      this.finishSpawningCustomer(customer, customerType, recipe, 1, seatIndex, targetPosition, true);
      spawnedCount += 1;
    }

    return spawnedCount;
  }

  private finishSpawningCustomer(
    customer: Customer,
    customerType: (typeof CUSTOMER_TYPES)[number],
    recipe: RecipeConfig,
    groupSize: number,
    seatIndex: number,
    targetPosition: Vec3,
    forceSpecialRequest: boolean,
  ): void {
    this.seatManager.occupy(seatIndex);
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
      onRecycle: (finishedCustomer: Customer) => this.recycleCustomer(finishedCustomer),
    });
    this.customers.push(customer);
    if (forceSpecialRequest) {
      this.specialRequestCustomers.add(customer);
    } else {
      this.maybeApplySpecialRequest(customer);
    }
    this.refreshSeatVisibility();
  }

  private pickHighValueCustomerType(): (typeof CUSTOMER_TYPES)[number] {
    const availableTypes = CUSTOMER_TYPES.filter((item) => this.getCustomerUnlockLevel(item.id, item.unlockLevel) <= this.saveData.level);
    return availableTypes
      .slice()
      .sort((left, right) => right.spendMultiplier - left.spendMultiplier)[0] ?? CUSTOMER_TYPES[0];
  }

  private pickHighValueRecipeForCustomer(allowedRecipeIds: RecipeId[]): RecipeConfig {
    const unlockedRecipeIds = getLevelConfig(this.saveData.level).unlockedRecipeIds;
    const candidateRecipes = RECIPES
      .filter((recipe) => unlockedRecipeIds.indexOf(recipe.id) >= 0 && allowedRecipeIds.indexOf(recipe.id as RecipeId) >= 0);

    return candidateRecipes
      .slice()
      .sort((left, right) => right.price - left.price)[0] ?? this.pickRecipeForCustomer(allowedRecipeIds);
  }

  private createManualCustomerInstance(): Node {
    if (!this.manualCustomerTemplate) {
      return createImageNode('customer_group', 'scholar', 88, 88);
    }

    const templateClone = instantiate(this.manualCustomerTemplate);
    templateClone.name = 'customer_group';
    templateClone.active = true;
    applyLayerRecursively(templateClone, Layers.Enum.UI_2D);
    return templateClone;
  }

  private setupManualSceneTestState(): void {
    if (this.manualTestButtonsBound) {
      return;
    }

    const scholarTemplate = this.manualCustomerTemplate;

    if (!scholarTemplate) {
      return;
    }

    this.manualTestScholarSprite = findFirstSprite(scholarTemplate);
    this.manualTestOrderBubble = findNodeByName(scholarTemplate, 'OrderBubble');
    this.manualTestRootNode = scholarTemplate;
    this.manualTestWaitFrame = this.manualTestScholarSprite?.spriteFrame ?? null;
    this.manualTestDrinkFrame = null;
    this.manualTestHappyFrame = null;
    this.manualTestRootNode.active = false;

    loadFirstAvailableSpriteFrame(['image/customer/customer_scholar_drink/spriteFrame', 'image/customer_scholar_drink/spriteFrame'], (frame) => {
      this.manualTestDrinkFrame = frame;
    });
    loadFirstAvailableSpriteFrame(['image/customer/customer_scholar_happy/spriteFrame', 'image/customer_scholar_happy/spriteFrame'], (frame) => {
      this.manualTestHappyFrame = frame;
    });

    this.manualTestButtonsBound = true;
  }

  private handleManualBrewButtonClick(): void {
    if (this.manualTestScholarSprite && this.manualTestWaitFrame) {
      this.manualTestScholarSprite.spriteFrame = this.manualTestWaitFrame;
    }
    if (this.manualTestOrderBubble) {
      this.manualTestOrderBubble.active = true;
    }
    if (this.manualTestRootNode) {
      this.manualTestRootNode.active = true;
      Tween.stopAllByTarget(this.manualTestRootNode);
      this.manualTestRootNode.setPosition(0, 0, 0);
    }
  }

  private handleManualServeButtonClick(): void {
    if (this.manualTestScholarSprite && this.manualTestDrinkFrame) {
      this.manualTestScholarSprite.spriteFrame = this.manualTestDrinkFrame;
    }
    if (this.manualTestOrderBubble) {
      this.manualTestOrderBubble.active = false;
    }

    if (this.manualTestScholarSprite && this.manualTestHappyFrame) {
      this.scheduleOnce(() => {
        if (this.manualTestScholarSprite && this.manualTestHappyFrame) {
          this.manualTestScholarSprite.spriteFrame = this.manualTestHappyFrame;
        }
        this.scheduleOnce(() => {
          this.moveManualTestScholarToExit();
        }, 1);
      }, 1);
    }
  }

  private moveManualTestScholarToExit(): void {
    if (!this.manualTestRootNode) {
      return;
    }

    const startPosition = this.manualTestRootNode.position.clone();
    const exitNode = findNodeByName(this.node, 'ExitPoint');
    const fallbackExit = new Vec3(320, startPosition.y, 0);
    const exitPosition = exitNode ? exitNode.position.clone() : fallbackExit;

    Tween.stopAllByTarget(this.manualTestRootNode);
    const duration = 1.2;
    tween(this.manualTestRootNode)
      .to(duration, { position: new Vec3(exitPosition.x, exitPosition.y, 0) })
      .call(() => {
        if (this.manualTestRootNode) {
          this.manualTestRootNode.active = false;
          this.manualTestRootNode.setPosition(startPosition);
        }
      })
      .start();
  }

  private createCustomerNode(): Node {
    const node = this.manualCustomerTemplate ? this.createManualCustomerInstance() : createImageNode('customer_group', 'scholar', 88, 88);
    this.configureCustomerNode(node);
    return node;
  }

  private configureCustomerNode(node: Node): Customer {
    const customer = node.getComponent(Customer) ?? node.addComponent(Customer);

    clearGeneratedCustomerUi(node);
    const customerSize = node.getComponent(UITransform)?.contentSize ?? new Size(88, 88);

    const orderBubble = createPanel('order_bubble', 112, 82, new Color(255, 248, 224, 240));
    const orderBubbleImage = createImageNode('OrderBubbleDialogImage', 'dialog', 112, 82);
    orderBubble.addChild(orderBubbleImage);
    orderBubbleImage.setPosition(0, 0, 0);
    orderBubbleImage.setSiblingIndex(0);
    node.addChild(orderBubble);
    orderBubble.setPosition(0, customerSize.height / 2 + 32, 0);
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

    const patienceNode = createProgressBar('PatienceBar', Math.min(88, customerSize.width), 10);
    node.addChild(patienceNode);
    patienceNode.setPosition(0, -customerSize.height / 2 - 8, 0);
    customer.patienceBar = patienceNode.getComponent(SimpleProgressBar);
    customer.resetForReuse();
    return customer;
  }

  private obtainCustomerNode(): Node {
    const reusableNode = this.customerPool.pop();
    if (reusableNode) {
      reusableNode.active = true;
      reusableNode.setParent(null);
      return reusableNode;
    }
    return this.createCustomerNode();
  }

  private recycleCustomer(customer: Customer): void {
    const node = customer.node;
    if (!node || !node.isValid) {
      return;
    }
    customer.resetForReuse();
    node.removeFromParent();
    this.customerPool.push(node);
  }

  private warmCustomerPool(): void {
    while (this.customerPool.length < this.initialCustomerPoolSize) {
      const node = this.createCustomerNode();
      const customer = node.getComponent(Customer);
      customer?.resetForReuse();
      node.removeFromParent();
      this.customerPool.push(node);
    }
  }

  private handleWorkstationTouchEnd(): void {
    if (this.isDayEnded) {
      return;
    }

    const result = this.workstation?.manualFinishTea();
    if (result) {
      return;
    }

    this.refreshHud('火候未到，继续观察进度条，接近尾段时再点击收茶');
  }

  private onTeaReady(result: TeaReadyResult): void {
    const { recipe } = result;
    let message = `${recipe.name} 完成，放入成品台`;
    if (this.readyTeas.length >= READY_TEA_LIMIT) {
      const discarded = this.readyTeas.shift();
      this.applyWastePenalty(1);
      message = `成品台已满，${discarded?.recipe.name ?? '旧茶'} 变凉报废，口碑 -2，${recipe.name} 入台`;
    }

    this.readyTeas.push({
      recipe,
      remainingFreshSeconds: this.getReadyTeaFreshSeconds(),
      heatQuality: result.quality,
      heatBonusRate: result.quality === 'perfect' ? PERFECT_HEAT_BONUS_RATE : 0,
    });
    if (result.quality === 'perfect') {
      this.registerPerfectHeat();
      message = `${recipe.name} 完成：完美火候，若马上上桌收入 +${Math.round(PERFECT_HEAT_BONUS_RATE * 100)}%`;
    } else {
      this.resetPerfectHeat();
      if (result.manualTriggered) {
        message = `${recipe.name} 已手动收茶，但错过完美窗口，按普通品质出杯`;
      }
    }

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
      this.registerComboServe();
      const baseIncome = Math.floor(rawIncome * (this.activeDailyEvent.incomeMultiplier ?? 1) * this.getActivityRevenueMultiplier(readyTea.recipe) * this.getSpecialRequestMultiplier(target));
      const tip = this.calculateStreakTip(baseIncome);
      const comboBonus = this.calculateComboBonus(baseIncome);
      const heatBonus = this.calculateHeatBonus(baseIncome, readyTea);
      const eventBonus = this.calculateDailyEventServeBonus();
      const income = baseIncome + tip + comboBonus + heatBonus + eventBonus;
      this.saveData.coins += income;
      this.dayRevenue += income;
      this.recordRecipeSale(readyTea.recipe, income);
      this.reputationScore = Math.min(100, this.reputationScore + 1 + this.getDailyEventReputationBonus());
      this.requestDeferredSave();
      const effectPayload: PlayEffectPayload = {
        type: 'coinFly',
        position: target.node.worldPosition.clone(),
        value: income,
      };
      EventBus.emit(GameEventName.PlayEffect, effectPayload);
      const orderCompletedPayload: OrderCompletedPayload = {
        recipeId: readyTea.recipe.id,
        income,
        position: target.node.worldPosition.clone(),
        heatQuality: readyTea.heatQuality,
      };
      EventBus.emit(GameEventName.OrderCompleted, orderCompletedPayload);
      messages.push(this.formatServeMessage(target, readyTea.recipe.name, baseIncome, tip, comboBonus, heatBonus, eventBonus, readyTea.heatQuality));
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
    this.resetCombo();
    this.resetPerfectHeat();
    this.reputationScore = Math.max(0, this.reputationScore - 6);
    this.refreshHud('客人等太久流失了，Combo 中断，口碑 -6');
    this.removeCustomer(customer, 0.1, true);
  }

  private removeCustomer(customer: Customer, delaySeconds: number, walkOut = false): void {
    this.seatManager.release(customer.seatIndex);
    this.customers = this.customers.filter((item) => item !== customer);
    this.specialRequestCustomers.delete(customer);
    this.refreshSeatVisibility();

    if (walkOut) {
      customer.leave();
      return;
    }

    this.scheduleOnce(() => {
      this.recycleCustomer(customer);
    }, delaySeconds);
  }

  private findFreeSeatIndex(): number {
    return this.seatManager.findFreeSeatIndex(this.saveData.unlockedSeatCount);
  }

  private refreshSeatVisibility(): void {
    this.seatManager.refreshView(this.saveData.unlockedSeatCount);
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

  private getUnlockedStandardRecipes(): RecipeConfig[] {
    const unlockedIds = getLevelConfig(this.saveData.level).unlockedRecipeIds;
    return RECIPES.filter((recipe) => unlockedIds.indexOf(recipe.id) >= 0);
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

  private getFirstMissingIngredientId(cost: IngredientCostConfig): SupplyItemId | undefined {
    const entry = getIngredientCostEntries(cost)
      .find(([key, amount]) => this.saveData.ingredients[key] < amount);
    return entry?.[0] as SupplyItemId | undefined;
  }

  private getSupplyItemPrice(itemId: SupplyItemId): number {
    const item = SUPPLY_SHOP_ITEMS.find((config) => config.id === itemId);
    if (!item) {
      return 0;
    }
    const eventMultiplier = (this.activeDailyEvent.supplyCost ?? 90) / 90;
    const repeatMarkup = this.saveData.longTerm.dailySupplyCount * 3;
    return Math.max(1, Math.floor(item.basePrice * eventMultiplier + repeatMarkup));
  }

  private createSupplyShopViewModel(active: boolean, messageText?: string, highlightedItemId?: SupplyItemId): SupplyShopViewModel {
    return {
      active,
      coins: this.saveData.coins,
      dailyPurchaseCount: this.saveData.longTerm.dailySupplyCount,
      messageText,
      items: SUPPLY_SHOP_ITEMS.map((item) => ({
        id: item.id,
        name: item.name,
        price: this.getSupplyItemPrice(item.id),
        amount: item.amount + (this.activeDailyEvent.supplyBonus?.[item.id] ?? 0),
        stock: this.saveData.ingredients[item.id],
        highlighted: item.id === highlightedItemId,
      })),
    };
  }

  private consumeIngredients(recipe: RecipeConfig): void {
    this.consumeIngredientCost(recipe.ingredientCost);
  }

  private consumeIngredientCost(cost: IngredientCostConfig): void {
    for (const [key, amount] of getIngredientCostEntries(cost)) {
      this.saveData.ingredients[key] = Math.max(0, this.saveData.ingredients[key] - amount);
    }
    this.requestDeferredSave();
  }

  private resetCombo(): void {
    this.comboCount = 0;
    this.comboTimer = 0;
  }

  private updateComboTimer(deltaTime: number): void {
    if (this.comboCount <= 0 || this.isDayEnded) {
      return;
    }
    this.comboTimer = Math.max(0, this.comboTimer - deltaTime);
    if (this.comboTimer <= 0) {
      this.resetCombo();
      this.refreshHud();
    }
  }

  private registerComboServe(): void {
    this.comboCount = this.comboTimer > 0 ? this.comboCount + 1 : 1;
    this.comboTimer = COMBO_WINDOW_SECONDS;
    this.comboBest = Math.max(this.comboBest, this.comboCount);
  }

  private calculateComboBonus(baseIncome: number): number {
    if (this.comboCount < 2) {
      return 0;
    }
    const multiplier = Math.min(COMBO_BONUS_MAX, (this.comboCount - 1) * COMBO_BONUS_STEP);
    return Math.max(1, Math.floor(baseIncome * multiplier));
  }

  private registerPerfectHeat(): void {
    this.perfectHeatCount += 1;
    this.perfectHeatBest = Math.max(this.perfectHeatBest, this.perfectHeatCount);
  }

  private resetPerfectHeat(): void {
    this.perfectHeatCount = 0;
  }

  private calculateHeatBonus(baseIncome: number, tea: ReadyTea): number {
    if (tea.heatQuality !== 'perfect') {
      return 0;
    }
    return Math.max(1, Math.floor(baseIncome * tea.heatBonusRate));
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
    this.resetCombo();
    this.resetPerfectHeat();
    this.reputationScore = Math.max(0, this.reputationScore - count * 2);
  }

  private getSupplyCost(): number {
    return Math.min(...SUPPLY_SHOP_ITEMS.map((item) => this.getSupplyItemPrice(item.id)));
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

  private initFeatureSystems(): void {
    this.farmSystem = new FarmSystem({
      getActiveFarmYieldMultiplier: () => this.getActiveActivity().farmYieldMultiplier ?? 1,
      getBusinessDay: () => this.businessDay,
      getSaveData: () => this.saveData,
      requestDeferredSave: () => this.requestDeferredSave(),
      unlockStaffByProgress: () => this.unlockStaffByProgress(),
    });
    this.achievementSystem = new AchievementSystem({
      getBusinessDay: () => this.businessDay,
      getDayLostCount: () => this.dayLostCount,
      getDayServedCount: () => this.dayServedCount,
      getDayWastedTeaCount: () => this.dayWastedTeaCount,
      getLastDayGrade: () => this.lastDayGrade,
      getSaveData: () => this.saveData,
      areAllFarmPlotsMaxLevel: () => this.farmSystem?.areAllPlotsMaxLevel() ?? false,
      areAllFarmPlotsUnlocked: () => this.farmSystem?.areAllPlotsUnlocked() ?? false,
      refreshHud: (message) => this.refreshHud(message),
      requestDeferredSave: () => this.requestDeferredSave(),
    });
    this.achievementSystem.init();
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

  private formatServeMessage(customer: Customer, recipeName: string, baseIncome: number, tip: number, comboBonus: number, heatBonus: number, eventBonus: number, heatQuality: HeatQuality): string {
    const progressText = customer.isOrderComplete()
      ? `第 ${customer.seatIndex + 1} 桌完成`
      : `第 ${customer.seatIndex + 1} 桌上茶 ${customer.getServedCups()}/${customer.totalCups}`;
    const totalIncome = baseIncome + tip + comboBonus + heatBonus + eventBonus;
    const parts = [`${progressText}：${recipeName}，收入 +${totalIncome}`];
    if (heatQuality === 'perfect' && heatBonus > 0) {
      parts.push(`完美火候 +${heatBonus}`);
    }
    if (comboBonus > 0) {
      const multiplierText = `+${Math.round(Math.min(COMBO_BONUS_MAX, (this.comboCount - 1) * COMBO_BONUS_STEP) * 100)}%`;
      parts.push(`Combo×${this.comboCount} ${multiplierText} 奖励 +${comboBonus}`);
    }
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
    if (this.farmSystem) {
      return this.farmSystem.getSavePlot(plotId);
    }
    if (plotId === FarmPlotId.TeaTree) {
      return this.saveData.farm.teaTree;
    }
    if (plotId === FarmPlotId.FlowerBed) {
      return this.saveData.farm.flowerBed;
    }
    return this.saveData.farm.fruitTree;
  }

  private createFarmPageBackground(): Node {
    if (!this.farmBackgroundSprite) {
      return createPanel('FarmPageBackground', 720, 1280, new Color(38, 55, 38, 255));
    }

    const node = new Node('FarmPageBackground');
    addUiTransform(node, 720, 1280);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.spriteFrame = this.farmBackgroundSprite;
    sprite.color = Color.WHITE;
    return node;
  }

  private buildFarmPanel(parent: Node, root: Node): void {
    clearChildrenByName(parent, ['FarmPageBackground', 'FarmPageRoot']);

    const pageBackground = this.createFarmPageBackground();
    parent.addChild(pageBackground);
    pageBackground.setSiblingIndex(25);
    pageBackground.setPosition(0, 0, 0);
    pageBackground.active = false;
    this.farmPageBackground = pageBackground;

    if (!this.farmBackgroundSprite) {
      const fieldPanel = createPanel('FarmFieldPanel', 660, 720, new Color(87, 76, 45, 255));
      pageBackground.addChild(fieldPanel);
      fieldPanel.setPosition(0, -70, 0);

      for (let i = 0; i < 5; i += 1) {
        const ridge = createPanel(`FarmRidge_${i + 1}`, 610, 34, new Color(112, 95, 54, 255));
        fieldPanel.addChild(ridge);
        ridge.setPosition(0, 250 - i * 118, 0);
      }

      const skyPanel = createPanel('FarmSkyPanel', 660, 230, new Color(82, 128, 108, 255));
      pageBackground.addChild(skyPanel);
      skyPanel.setPosition(0, 445, 0);
    }

    const panel = createPanel('FarmPageRoot', 680, 900, new Color(58, 35, 23, 232));
    parent.addChild(panel);
    panel.setSiblingIndex(35);
    panel.setPosition(0, -74, 0);
    panel.active = false;
    this.farmPanel = panel;

    const titleNode = createLabel('FarmTitleLabel', '\u6843\u6e90\u5c0f\u519c\u573a', 28, new Color(255, 226, 160, 255));
    panel.addChild(titleNode);
    titleNode.setPosition(0, 384, 0);

    const summaryNode = createLabel('FarmSummaryLabel', '', 15, new Color(255, 245, 220, 255));
    const summaryLabel = summaryNode.getComponent(Label);
    if (summaryLabel) {
      summaryLabel.lineHeight = 21;
    }
    panel.addChild(summaryNode);
    summaryNode.setPosition(0, 334, 0);
    this.farmSummaryLabel = summaryLabel;

    const farmVisualRoot = findNodeByName(root, 'FarmSystem') ?? new Node('FarmSystem');
    if (farmVisualRoot.parent !== panel) {
      farmVisualRoot.removeFromParent();
      panel.addChild(farmVisualRoot);
    }
    farmVisualRoot.setPosition(-220, 120, 0);
    applyLayerRecursively(farmVisualRoot, Layers.Enum.UI_2D);
    const farmVisualTransform = farmVisualRoot.getComponent(UITransform) ?? farmVisualRoot.addComponent(UITransform);
    farmVisualTransform.setContentSize(300, 340);

    const farmManager = farmVisualRoot.getComponent(FarmManager) ?? farmVisualRoot.addComponent(FarmManager);
    farmManager.columns = 1;
    farmManager.plotSize = 104;
    farmManager.cropSize = 72;
    farmManager.horizontalGap = 112;
    farmManager.verticalGap = 112;
    farmManager.cropOffsetY = 0;
    farmManager.buildFarmPlots(FARM_PLOT_SEQUENCE.length);
    this.farmManager = farmManager;

    const plotRows: Array<{ id: FarmPlotId; y: number }> = [
      { id: FarmPlotId.TeaTree, y: 174 },
      { id: FarmPlotId.FlowerBed, y: 34 },
      { id: FarmPlotId.FruitTree, y: -106 },
    ];

    this.farmButtonLabels = {};
    this.farmDescriptionLabels = {};
    for (const row of plotRows) {
      const config = getFarmPlotConfig(row.id);
      const card = createPanel(`FarmCard_${config.id}`, 360, 104, new Color(255, 239, 198, 76));
      panel.addChild(card);
      card.setPosition(122, row.y, 0);

      const descNode = createLabel(`FarmDesc_${config.id}`, this.getFarmPlotDescription(row.id), 15, new Color(255, 245, 220, 255));
      const descLabel = descNode.getComponent(Label);
      if (descLabel) {
        descLabel.lineHeight = 20;
        this.farmDescriptionLabels[row.id] = descLabel;
      }
      card.addChild(descNode);
      descNode.setPosition(-72, 12, 0);

      const button = createButton(`FarmUpgrade_${config.id}`, config.shortName, 126, 48, () => this.upgradeFarmPlot(row.id));
      card.addChild(button);
      button.setPosition(116, -20, 0);
      const buttonLabel = button.getChildByName(`FarmUpgrade_${config.id}_Label`)?.getComponent(Label) ?? null;
      if (buttonLabel) {
        this.farmButtonLabels[row.id] = buttonLabel;
      }
    }

    const closeButton = createButton('FarmCloseButton', '\u8fd4\u56de\u8336\u8086', 150, 44, () => this.hideFarmPanel());
    panel.addChild(closeButton);
    closeButton.setPosition(0, -382, 0);
    this.refreshFarmPanel();
  }

  private showFarmPanel(): void {
    this.switchMainTab('farm');
  }

  private hideFarmPanel(): void {
    this.switchMainTab('teahouse');
  }

  private getFarmPlotDescription(plotId: FarmPlotId): string {
    return this.farmSystem?.getPlotDescription(plotId) ?? '';
  }

  private refreshFarmPanel(): void {
    if (this.farmSummaryLabel) {
      this.farmSummaryLabel.string = `\u7b2c ${this.businessDay} \u5929\uff5c\u5f00\u4e1a\u524d\u81ea\u52a8\u6536\u83b7\u4e00\u6b21\n\u5347\u7ea7\u519c\u573a\u53ef\u957f\u671f\u8865\u539f\u6599\uff0c\u7f3a\u6599\u65f6\u4ecd\u53ef\u7528\u8865\u8d27\u6551\u6025`;
    }

    for (const plotId of FARM_PLOT_SEQUENCE) {
      const descLabel = this.farmDescriptionLabels[plotId];
      if (descLabel) {
        descLabel.string = this.getFarmPlotDescription(plotId);
      }
      const label = this.farmButtonLabels[plotId];
      if (label) {
        label.string = this.getFarmButtonText(plotId);
      }
    }
    this.refreshFarmVisual();
  }

  private refreshFarmVisual(): void {
    if (!this.farmManager) {
      return;
    }

    FARM_PLOT_SEQUENCE.forEach((plotId, index) => {
      const plotSave = this.getFarmSavePlot(plotId);
      const visible = plotSave.unlocked && plotSave.level > 0;
      const stage = Math.max(0, plotSave.level - 1);
      this.farmManager?.updateCrop(index, stage, visible);
    });
  }

  private harvestFarmForNewDay(): string {
    return this.farmSystem?.harvestFarmForNewDay() ?? '';
  }

  private upgradeFarmPlot(plotId: FarmPlotId): void {
    const result = this.farmSystem?.upgradePlot(plotId);
    this.refreshFarmPanel();
    if (result) {
      this.refreshHud(result.message);
    }
  }

  private formatFarmText(): string {
    return this.farmSystem?.formatFarmText() ?? '';
  }

  private getFarmButtonText(plotId: FarmPlotId): string {
    return this.farmSystem?.getButtonText(plotId) ?? '';
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
    if (this.perfectHeatCount >= 2) {
      return `完美火候×${this.perfectHeatCount}：趁有订单时连续出杯可获得火候奖励，当前最高连段 ${this.perfectHeatBest}`;
    }

    if (this.comboCount >= 2 && this.comboTimer > 0) {
      return `Combo×${this.comboCount} 火热中：${Math.ceil(this.comboTimer)} 秒内继续上茶可叠加金币奖励，最高 +${Math.round(COMBO_BONUS_MAX * 100)}%`;
    }

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
    this.requestDeferredSave();
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

  private createCollectionViewModel(active: boolean): CollectionViewModel {
    const unlockedIds = new Set(this.saveData.collection.unlockedRecipeIds);
    const baseRecipes = RECIPES.map((recipe) => {
      const unlockedByLevel = getLevelConfig(this.saveData.level).unlockedRecipeIds.indexOf(recipe.id) >= 0;
      const unlocked = unlockedByLevel || unlockedIds.has(recipe.id);
      const stat = this.saveData.collection.recipeStats.find((item) => item.id === recipe.id);
      return {
        id: recipe.id,
        name: recipe.name,
        unlocked,
        description: unlocked
          ? `售价${recipe.price}｜已售${stat?.soldCups ?? 0}杯｜${this.formatIngredientCost(recipe.ingredientCost)}`
          : `店铺 Lv.${recipe.unlockLevel} 后可见`,
      };
    });
    const developedRecipes = this.saveData.developedRecipes.map((drink) => {
      const stat = this.saveData.collection.recipeStats.find((item) => item.id === drink.id);
      return {
        id: drink.id,
        name: `${drink.tier} ${drink.name}`,
        unlocked: true,
        description: `售价${drink.price}｜已售${stat?.soldCups ?? 0}杯｜味${drink.taste} 香${drink.aroma} 人气${drink.popularity}`,
      };
    });
    const allRecipes = [...baseRecipes, ...developedRecipes];
    const recipes = allRecipes.slice(0, 18);
    const unlockedCount = allRecipes.filter((recipe) => recipe.unlocked).length;
    const recentUnlockText = this.saveData.developedRecipes[0]
      ? `${this.saveData.developedRecipes[0].tier} ${this.saveData.developedRecipes[0].name}`
      : undefined;
    return {
      active,
      unlockedCount,
      totalCount: allRecipes.length,
      recipes,
      recentUnlockText,
    };
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
    if (buyer && !buyer.unlocked && (this.farmSystem?.areAllPlotsUnlocked() ?? false)) {
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
    this.requestDeferredSave();
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
      const collection = this.createCollectionViewModel(false);
      const recentText = collection.recentUnlockText ? `｜最近 ${collection.recentUnlockText}` : '';
      this.researchSummaryLabel.string = `消耗：${this.formatIngredientCost(cost)}｜已研发 ${this.saveData.developedRecipes.length}/30｜图鉴 ${collection.unlockedCount}/${collection.totalCount}${recentText}`;
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
    this.requestDeferredSave();
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
        const warning = tea.heatQuality === 'perfect' ? '火候佳' : seconds <= 3 ? '快凉' : waitingCount > 0 ? '可上' : '候单';
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
    if (message) {
      EventBus.emit(GameEventName.HudMessage, message);
    }

    const recipeButtonTexts: Partial<Record<RecipeId, string>> = {};
    const recipes = [
      getRecipe(RecipeId.GreenTea),
      getRecipe(RecipeId.BlackTea),
      getRecipe(RecipeId.JasmineTea),
      getRecipe(RecipeId.OsmanthusTea),
      getRecipe(RecipeId.PearFruitTea),
      getRecipe(RecipeId.PeachBrew),
    ];
    for (const recipe of recipes) {
      recipeButtonTexts[recipe.id as RecipeId] = this.getRecipeButtonText(recipe);
    }

    const mainTabTexts: Partial<Record<MainTab, string>> = {
      teahouse: '茶肆',
      farm: '农场',
      staff: '员工',
      research: '研发',
      collection: '图鉴',
      decoration: '更多',
    };

    const viewModel: HudViewModel = {
      messageText: message,
      levelText: `第${this.businessDay}天｜口碑${this.reputationScore}｜桌${getLevelConfig(this.saveData.level).seatCount}/6｜Combo${this.comboBest} 火候${this.perfectHeatBest}`,
      coinsText: `金币 ${this.saveData.coins}`,
      goalText: this.formatGoalText(),
      ingredientText: this.formatIngredientStock(),
      actionHintText: this.formatActionHint(),
      urgentAlertText: this.formatUrgentAlertText(),
      readyTeaText: this.formatReadyTeas(),
      recipeButtonTexts,
      primaryButtonTexts: {
        upgrade: this.saveData.level >= getMaxDemoLevel()
          ? '满级\n挑战评级'
          : (Math.max(0, getLevelConfig(this.saveData.level).upgradeCost - this.saveData.coins) <= 0
            ? '升级\n可升级'
            : `升级\n差${Math.max(0, getLevelConfig(this.saveData.level).upgradeCost - this.saveData.coins)}`),
        supply: `补货\n商店`,
        nextDay: this.isDayEnded ? '新一天\n开始' : '打烊\n结算',
        extend: this.saveData.longTerm.extendedToday ? '延长\n已用' : `延长\n${this.getExtendCost()}金`,
      },
      mainTabTexts,
    };
    EventBus.emit(GameEventName.HudViewModel, viewModel);

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
    if (this.currentMainTab === 'collection') {
      EventBus.emit(GameEventName.CollectionViewModel, this.createCollectionViewModel(true));
    }
  }

  private requestDeferredSave(delayMs = SAVE_DEBOUNCE_MS): void {
    SaveManager.saveDeferred(this.saveData, delayMs);
  }

  private handleGameHide(): void {
    SaveManager.flushPendingSave();
  }

  private hideLegacyManualSceneButtons(root: Node): void {
    const legacyButtons = ['BrewButton', 'ServeButton'];
    for (const buttonName of legacyButtons) {
      const buttonNode = findNodeByName(root, buttonName);
      if (!buttonNode) {
        continue;
      }

      buttonNode.removeFromParent();
      buttonNode.destroy();
    }
  }

  private refreshStatusLabels(): void {
    return;
  }
}
