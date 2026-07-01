export enum RecipeId {
  GreenTea = 'base_green_add_none',
  GreenSugarTea = 'base_green_add_sugar',
  BlackTea = 'base_black_add_sugar',
  BlackPlainTea = 'base_black_add_none',
  JasmineTea = 'base_green_add_flower',
  GreenMilkTea = 'base_green_add_milk',
  BlackFlowerTea = 'base_black_add_flower',
  OsmanthusTea = 'base_oolong_add_flower',
  OolongTea = 'base_oolong_add_none',
  OolongSugarTea = 'base_oolong_add_sugar',
  PearFruitTea = 'base_black_add_milk',
  PeachBrew = 'base_oolong_add_milk',
}

// 资源正在从扁平目录迁移到分组目录，新路径优先，保留旧路径作为兼容回退。
export const TEAHOUSE_TEXTURE_PATHS = {
  background: ['image/background/bg_teahouse/texture', 'image/bg_teahouse/texture'],
  seat: ['image/furniture/seat_table/texture', 'image/seat_table/texture'],
  counter: ['image/furniture/table_group_basic/texture', 'image/furniture/seat_table/texture'],
  woodSign: ['image/ui/ui_dialog/texture'],
  paperLamp: ['image/ui/BrewButton/texture'],
  celadonSet: ['image/tea/tea_green/texture'],
  flowerVase: ['image/tea/tea_black/texture'],
  screen: ['image/ui/ui_dialog/texture'],
  scholar: ['image/customer/customer_scholar_wait/texture', 'image/customer/customer_scholar_happy/texture'],
  greenTea: ['image/tea/tea_green/texture', 'image/tea_green/texture'],
  blackTea: ['image/tea/tea_black/texture', 'image/tea_black/texture'],
  dialog: ['image/ui/ui_dialog/texture', 'image/ui_dialog/texture'],
  button: ['image/ui/BrewButton/texture', 'image/ui/ServeButton/texture'],
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
    fallbackNodeNames: ['WorkstationCounter', 'WorkstationPanel'],
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

export enum TeaBaseId {
  Green = 'base_green',
  Black = 'base_black',
  Oolong = 'base_oolong',
}

export enum AdditiveId {
  None = 'add_none',
  Sugar = 'add_sugar',
  Flower = 'add_flower',
  Milk = 'add_milk',
}

export const TEA_BASE_IDS: TeaBaseId[] = [TeaBaseId.Green, TeaBaseId.Black, TeaBaseId.Oolong];
export const ADDITIVE_IDS: AdditiveId[] = [AdditiveId.None, AdditiveId.Sugar, AdditiveId.Flower, AdditiveId.Milk];

export interface IngredientCostConfig {
  teaLeaf?: number;
  sugar?: number;
  flower?: number;
  fruit?: number;
}

export interface RecipeFormula {
  base: TeaBaseId;
  additive: AdditiveId;
}

export interface RecipeConfig {
  id: string;
  name: string;
  formula: RecipeFormula;
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
    id: buildRecipeId(TeaBaseId.Green, AdditiveId.None),
    name: '山野绿茶',
    formula: {
      base: TeaBaseId.Green,
      additive: AdditiveId.None,
    },
    unlockLevel: 1,
    makeSeconds: 2.8,
    price: 34,
    ingredientCost: {
      teaLeaf: 1,
    },
  },
  {
    id: buildRecipeId(TeaBaseId.Green, AdditiveId.Sugar),
    name: '甘露绿茶',
    formula: {
      base: TeaBaseId.Green,
      additive: AdditiveId.Sugar,
    },
    unlockLevel: 2,
    makeSeconds: 3.2,
    price: 48,
    ingredientCost: {
      teaLeaf: 1,
      sugar: 1,
    },
  },
  {
    id: buildRecipeId(TeaBaseId.Green, AdditiveId.Milk),
    name: '青乳茶',
    formula: {
      base: TeaBaseId.Green,
      additive: AdditiveId.Milk,
    },
    unlockLevel: 4,
    makeSeconds: 5.6,
    price: 102,
    ingredientCost: {
      teaLeaf: 1,
      sugar: 1,
    },
  },
  {
    id: buildRecipeId(TeaBaseId.Black, AdditiveId.Sugar),
    name: '蜜香红茶',
    formula: {
      base: TeaBaseId.Black,
      additive: AdditiveId.Sugar,
    },
    unlockLevel: 2,
    makeSeconds: 3.8,
    price: 56,
    ingredientCost: {
      teaLeaf: 1,
      sugar: 1,
    },
  },
  {
    id: buildRecipeId(TeaBaseId.Black, AdditiveId.None),
    name: '原味红茶',
    formula: {
      base: TeaBaseId.Black,
      additive: AdditiveId.None,
    },
    unlockLevel: 2,
    makeSeconds: 3.4,
    price: 50,
    ingredientCost: {
      teaLeaf: 1,
    },
  },
  {
    id: buildRecipeId(TeaBaseId.Black, AdditiveId.Flower),
    name: '花香红茶',
    formula: {
      base: TeaBaseId.Black,
      additive: AdditiveId.Flower,
    },
    unlockLevel: 4,
    makeSeconds: 5.6,
    price: 104,
    ingredientCost: {
      teaLeaf: 1,
      flower: 1,
    },
  },
  {
    id: buildRecipeId(TeaBaseId.Green, AdditiveId.Flower),
    name: '茉莉清茶',
    formula: {
      base: TeaBaseId.Green,
      additive: AdditiveId.Flower,
    },
    unlockLevel: 3,
    makeSeconds: 4.8,
    price: 86,
    ingredientCost: {
      teaLeaf: 1,
      flower: 1,
    },
  },
  {
    id: buildRecipeId(TeaBaseId.Oolong, AdditiveId.Flower),
    name: '桂花冻饮',
    formula: {
      base: TeaBaseId.Oolong,
      additive: AdditiveId.Flower,
    },
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
    id: buildRecipeId(TeaBaseId.Oolong, AdditiveId.None),
    name: '岩韵乌龙',
    formula: {
      base: TeaBaseId.Oolong,
      additive: AdditiveId.None,
    },
    unlockLevel: 5,
    makeSeconds: 6.8,
    price: 112,
    ingredientCost: {
      teaLeaf: 1,
    },
  },
  {
    id: buildRecipeId(TeaBaseId.Oolong, AdditiveId.Sugar),
    name: '糖香乌龙',
    formula: {
      base: TeaBaseId.Oolong,
      additive: AdditiveId.Sugar,
    },
    unlockLevel: 6,
    makeSeconds: 7.2,
    price: 132,
    ingredientCost: {
      teaLeaf: 1,
      sugar: 1,
    },
  },
  {
    id: buildRecipeId(TeaBaseId.Black, AdditiveId.Milk),
    name: '雪梨果茶',
    formula: {
      base: TeaBaseId.Black,
      additive: AdditiveId.Milk,
    },
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
    id: buildRecipeId(TeaBaseId.Oolong, AdditiveId.Milk),
    name: '桃花酿',
    formula: {
      base: TeaBaseId.Oolong,
      additive: AdditiveId.Milk,
    },
    unlockLevel: 9,
    makeSeconds: 12,
    price: 240,
    ingredientCost: {
      flower: 2,
      fruit: 2,
    },
  },
];

export function buildRecipeId(base: TeaBaseId, additive: AdditiveId): RecipeId {
  return `${base}_${additive}` as RecipeId;
}

export function parseRecipeId(recipeId: string): RecipeFormula | null {
  const parts = recipeId.split('_');
  if (parts.length !== 4) {
    return null;
  }

  const base = `${parts[0]}_${parts[1]}` as TeaBaseId;
  const additive = `${parts[2]}_${parts[3]}` as AdditiveId;
  if (TEA_BASE_IDS.indexOf(base) < 0 || ADDITIVE_IDS.indexOf(additive) < 0) {
    return null;
  }
  return { base, additive };
}

export function getRecipeByFormula(base: TeaBaseId, additive: AdditiveId): RecipeConfig | null {
  const recipeId = buildRecipeId(base, additive);
  return RECIPES.find((recipe) => recipe.id === recipeId) ?? null;
}

export function validateSystem(): boolean {
  const seen = new Set<string>();
  for (const recipe of RECIPES) {
    const parsed = parseRecipeId(recipe.id);
    if (!parsed) {
      console.error(`配方 ID 无法解析：${recipe.id}`);
      return false;
    }
    const expectedId = buildRecipeId(recipe.formula.base, recipe.formula.additive);
    if (recipe.id !== expectedId || parsed.base !== recipe.formula.base || parsed.additive !== recipe.formula.additive) {
      console.error(`配方 ID 与 formula 不一致：${recipe.id}`);
      return false;
    }
    if (seen.has(recipe.id)) {
      console.error(`配方 ID 重复：${recipe.id}`);
      return false;
    }
    seen.add(recipe.id);
  }
  return true;
}

if (validateSystem()) {
  console.log('数据层初始化完毕');
}

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

export function getRecipe(id: string): RecipeConfig {
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
