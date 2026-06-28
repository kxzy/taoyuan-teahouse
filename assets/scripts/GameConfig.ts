export enum RecipeId {
  GreenTea = 'green_tea',
  BlackTea = 'black_tea',
  JasmineTea = 'jasmine_tea',
  OsmanthusTea = 'osmanthus_tea',
  PearFruitTea = 'pear_fruit_tea',
  PeachBrew = 'peach_brew',
}

export const TEAHOUSE_TEXTURE_PATHS = {
  background: ['image/bg_teahouse/texture', 'image/茶铺/texture'],
  seat: ['image/seat_table/texture', 'image/桌椅/texture'],
  counter: ['image/workstation_counter/texture', 'image/柜台/texture', 'image/counter/texture'],
  woodSign: ['image/decor_wood_sign/texture', 'image/旧木招牌/texture', 'image/招牌/texture'],
  paperLamp: ['image/decor_paper_lamp/texture', 'image/纸灯/texture', 'image/灯笼/texture'],
  celadonSet: ['image/decor_celadon_set/texture', 'image/青瓷茶具/texture', 'image/茶具/texture'],
  flowerVase: ['image/decor_flower_vase/texture', 'image/山花瓶/texture', 'image/花瓶/texture'],
  screen: ['image/decor_screen/texture', 'image/山水屏风/texture', 'image/屏风/texture'],
  scholar: ['image/customer_scholar/texture', 'image/书生/texture'],
  greenTea: ['image/tea_green/texture', 'image/茉莉绿茶/texture'],
  blackTea: ['image/tea_black/texture', 'image/蜜香红茶/texture'],
  dialog: ['image/ui_dialog/texture', 'image/对话框/texture'],
  button: ['image/ui_button/texture', 'image/九宫格/texture'],
} as const;

export type TeahouseTextureKey = keyof typeof TEAHOUSE_TEXTURE_PATHS;

export interface TeahouseTableFurnitureConfig {
  slotId: string;
  nodeName: string;
  fallbackNodeNames: string[];
  textureKey: TeahouseTextureKey;
  x: number;
  y: number;
  width: number;
  height: number;
  badgeOffsetRatio: number;
  statusOffsetRatio: number;
  customerYOffset: number;
}

export interface TeahouseFurnitureConfig {
  id: string;
  nodeName: string;
  fallbackNodeNames: string[];
  textureKey?: TeahouseTextureKey;
  x: number;
  y: number;
  width: number;
  height: number;
  color: { r: number; g: number; b: number; a: number };
  labelArea: {
    queueY: number;
    progressY: number;
    readyTeaY: number;
  };
}

export interface TeahouseDecorationVisualConfig {
  decorationId: string;
  nodeName: string;
  textureKey: TeahouseTextureKey;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  fallbackColor: { r: number; g: number; b: number; a: number };
}

const TABLE_COLUMNS = [-168, 150];
const TABLE_ROWS = [190, 90, -10];
const TABLE_CUSTOMER_Y_OFFSETS = [90, 90, 72, 72, 62, 62];

// 桌椅素材与桌位数量入口：当前场景最多摆放 6 组茶桌；每级实际显示数量由 LEVELS[].seatCount 控制。
export const TEAHOUSE_TABLE_FURNITURE: TeahouseTableFurnitureConfig[] = Array.from({ length: 6 }, (_, index) => {
  const column = index % TABLE_COLUMNS.length;
  const row = Math.floor(index / TABLE_COLUMNS.length);
  return {
    slotId: `table_${index + 1}`,
    nodeName: `Table_${index + 1}_Image`,
    fallbackNodeNames: [`Table_${index + 1}_Group`, `Table_Group_${index + 1}`, `Table_${index + 1}`, `Seat_${index + 1}`],
    textureKey: 'seat',
    x: TABLE_COLUMNS[column],
    y: TABLE_ROWS[row] ?? TABLE_ROWS[TABLE_ROWS.length - 1],
    width: 132,
    height: 82,
    badgeOffsetRatio: -0.18,
    statusOffsetRatio: 0.22,
    customerYOffset: TABLE_CUSTOMER_Y_OFFSETS[index] ?? 72,
  };
});

// 家具素材替换入口：先接入制茶柜台；后续茶柜、屏风、花瓶等也按同样格式追加。
export const TEAHOUSE_FURNITURE: Record<string, TeahouseFurnitureConfig> = {
  workstationCounter: {
    id: 'workstation_counter',
    nodeName: 'WorkstationPanel',
    fallbackNodeNames: ['WorkstationCounter', 'Counter_柜台', 'WorkstationPanel'],
    x: 0,
    y: -272,
    width: 520,
    height: 104,
    color: { r: 80, g: 45, b: 25, a: 178 },
    labelArea: {
      queueY: 30,
      progressY: 0,
      readyTeaY: -30,
    },
  },
};

// 装饰可视化入口：购买装饰后在茶肆场景中显示；换素材优先改 textureKey 对应路径。
export const TEAHOUSE_DECORATION_VISUALS: TeahouseDecorationVisualConfig[] = [
  {
    decorationId: 'wood_sign',
    nodeName: 'DecorVisual_WoodSign',
    textureKey: 'woodSign',
    x: -238,
    y: 270,
    width: 150,
    height: 62,
    zIndex: 80,
    fallbackColor: { r: 118, g: 70, b: 36, a: 210 },
  },
  {
    decorationId: 'paper_lamp',
    nodeName: 'DecorVisual_PaperLamp',
    textureKey: 'paperLamp',
    x: 248,
    y: 250,
    width: 74,
    height: 92,
    zIndex: 82,
    fallbackColor: { r: 235, g: 164, b: 72, a: 205 },
  },
  {
    decorationId: 'celadon_set',
    nodeName: 'DecorVisual_CeladonSet',
    textureKey: 'celadonSet',
    x: 178,
    y: -244,
    width: 96,
    height: 52,
    zIndex: 120,
    fallbackColor: { r: 112, g: 158, b: 142, a: 220 },
  },
  {
    decorationId: 'flower_vase',
    nodeName: 'DecorVisual_FlowerVase',
    textureKey: 'flowerVase',
    x: -254,
    y: -170,
    width: 70,
    height: 104,
    zIndex: 118,
    fallbackColor: { r: 180, g: 112, b: 132, a: 220 },
  },
  {
    decorationId: 'screen',
    nodeName: 'DecorVisual_Screen',
    textureKey: 'screen',
    x: 244,
    y: 74,
    width: 126,
    height: 190,
    zIndex: 60,
    fallbackColor: { r: 74, g: 92, b: 72, a: 210 },
  },
];

export enum CustomerTypeId {
  Villager = 'villager',
  Scholar = 'scholar',
  Lady = 'lady',
  Swordsman = 'swordsman',
}

export interface IngredientCostConfig {
  teaLeaf?: number;
  sugar?: number;
  flower?: number;
  fruit?: number;
}

export interface RecipeConfig {
  id: string;
  name: string;
  unlockLevel: number;
  makeSeconds: number;
  price: number;
  ingredientCost: IngredientCostConfig;
}

export interface LevelConfig {
  level: number;
  upgradeCost: number;
  customerSpawnInterval: number;
  maxCustomers: number;
  seatCount: number;
  unlockedRecipeIds: string[];
  unlockText: string;
}

export interface CustomerTypeConfig {
  id: CustomerTypeId;
  name: string;
  unlockLevel: number;
  weight: number;
  spendMultiplier: number;
  moveSpeed: number;
  patienceSeconds: number;
  allowedRecipeIds: RecipeId[];
}

export const MAX_DEMO_LEVEL = 10;

export const RECIPES: RecipeConfig[] = [
  {
    id: RecipeId.GreenTea,
    name: '山野绿茶',
    unlockLevel: 1,
    makeSeconds: 2.8,
    price: 34,
    ingredientCost: {
      teaLeaf: 1,
    },
  },
  {
    id: RecipeId.BlackTea,
    name: '蜜香红茶',
    unlockLevel: 2,
    makeSeconds: 3.8,
    price: 56,
    ingredientCost: {
      teaLeaf: 1,
      sugar: 1,
    },
  },
  {
    id: RecipeId.JasmineTea,
    name: '茉莉清茶',
    unlockLevel: 3,
    makeSeconds: 4.8,
    price: 86,
    ingredientCost: {
      teaLeaf: 1,
      flower: 1,
    },
  },
  {
    id: RecipeId.OsmanthusTea,
    name: '桂花冻饮',
    unlockLevel: 5,
    makeSeconds: 8,
    price: 120,
    ingredientCost: {
      teaLeaf: 1,
      sugar: 1,
      flower: 2,
    },
  },
  {
    id: RecipeId.PearFruitTea,
    name: '雪梨果茶',
    unlockLevel: 7,
    makeSeconds: 10,
    price: 160,
    ingredientCost: {
      teaLeaf: 1,
      sugar: 1,
      fruit: 2,
    },
  },
  {
    id: RecipeId.PeachBrew,
    name: '桃花酿',
    unlockLevel: 9,
    makeSeconds: 12,
    price: 240,
    ingredientCost: {
      flower: 2,
      fruit: 2,
    },
  },
];

function getUnlockedRecipeIds(level: number): string[] {
  return RECIPES
    .filter((recipe) => recipe.unlockLevel <= level)
    .map((recipe) => recipe.id);
}

function getSeatCountForLevel(level: number): number {
  if (level >= 7) {
    return 6;
  }
  if (level >= 5) {
    return 5;
  }
  if (level >= 3) {
    return 4;
  }
  if (level >= 2) {
    return 3;
  }
  return 2;
}

function getUpgradeCostForLevel(level: number): number {
  if (level >= MAX_DEMO_LEVEL) {
    return 0;
  }
  const costs = [0, 150, 360, 760, 1350, 2300, 3600, 5400, 7800, 10800];
  return costs[level] ?? Math.floor(150 * level * level * 1.15);
}

function getUnlockTextForLevel(level: number): string {
  const seatCount = getSeatCountForLevel(level);
  switch (level) {
    case 1:
      return '2 张餐桌，山野绿茶，制作台 Lv.1';
    case 2:
      return '3 张餐桌，解锁蜜香红茶，制作台 Lv.2';
    case 3:
      return '4 张餐桌，解锁茉莉清茶，山野花圃可解锁';
    case 4:
      return '4 张餐桌，制作台 Lv.3，订单压力提升';
    case 5:
      return '5 张餐桌，解锁桂花冻饮，桃梨果树可解锁';
    case 6:
      return '5 张餐桌，富家小姐开始到访，高价订单增加';
    case 7:
      return '6 张餐桌，解锁雪梨果茶，制作台 Lv.4';
    case 8:
      return '6 张餐桌，江湖侠客开始到访，急单压力提升';
    case 9:
      return '6 张餐桌，解锁桃花酿，冲刺高评级';
    case 10:
      return '10 级满级茶肆，挑战稳定 S 评级';
    default:
      return `${seatCount} 张餐桌，经营效率提升`;
  }
}

export const LEVELS: LevelConfig[] = Array.from({ length: MAX_DEMO_LEVEL }, (_, index) => {
  const level = index + 1;
  const seatCount = getSeatCountForLevel(level);
  return {
    level,
    upgradeCost: getUpgradeCostForLevel(level),
    customerSpawnInterval: Math.max(4.2, 6.8 - level * 0.22),
    maxCustomers: seatCount,
    seatCount,
    unlockedRecipeIds: getUnlockedRecipeIds(level),
    unlockText: getUnlockTextForLevel(level),
  };
});

export const CUSTOMER_TYPES: CustomerTypeConfig[] = [
  {
    id: CustomerTypeId.Villager,
    name: '山野村民',
    unlockLevel: 1,
    weight: 80,
    spendMultiplier: 1,
    moveSpeed: 60,
    patienceSeconds: 24,
    allowedRecipeIds: [RecipeId.GreenTea, RecipeId.BlackTea],
  },
  {
    id: CustomerTypeId.Scholar,
    name: '赶考书生',
    unlockLevel: 3,
    weight: 25,
    spendMultiplier: 1.5,
    moveSpeed: 75,
    patienceSeconds: 16,
    allowedRecipeIds: [RecipeId.BlackTea, RecipeId.JasmineTea],
  },
  {
    id: CustomerTypeId.Lady,
    name: '富家小姐',
    unlockLevel: 6,
    weight: 8,
    spendMultiplier: 2.2,
    moveSpeed: 50,
    patienceSeconds: 20,
    allowedRecipeIds: [RecipeId.OsmanthusTea, RecipeId.PearFruitTea, RecipeId.PeachBrew],
  },
  {
    id: CustomerTypeId.Swordsman,
    name: '江湖侠客',
    unlockLevel: 8,
    weight: 2,
    spendMultiplier: 3,
    moveSpeed: 90,
    patienceSeconds: 16,
    allowedRecipeIds: [RecipeId.GreenTea, RecipeId.BlackTea, RecipeId.JasmineTea, RecipeId.OsmanthusTea, RecipeId.PearFruitTea, RecipeId.PeachBrew],
  },
];

export function getRecipe(id: RecipeId): RecipeConfig {
  const recipe = RECIPES.find((item) => item.id === id);
  if (!recipe) {
    throw new Error(`Recipe not found: ${id}`);
  }
  return recipe;
}

export function getLevelConfig(level: number): LevelConfig {
  return LEVELS.find((item) => item.level === level) ?? LEVELS[0];
}

export function getMaxDemoLevel(): number {
  return MAX_DEMO_LEVEL;
}
