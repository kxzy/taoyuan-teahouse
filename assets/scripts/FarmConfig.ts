import type { FarmPlotSave, IngredientStock } from './SaveManager';

export enum FarmPlotId {
  TeaTree = 'teaTree',
  FlowerBed = 'flowerBed',
  FruitTree = 'fruitTree',
}

export interface FarmPlotConfig {
  id: FarmPlotId;
  name: string;
  shortName: string;
  ingredientKey: keyof IngredientStock;
  ingredientName: string;
  unlockShopLevel: number;
  baseYield: number;
  yieldPerLevel: number;
  maxLevel: number;
  upgradeCosts: number[];
}

export const FARM_PLOTS: Record<FarmPlotId, FarmPlotConfig> = {
  [FarmPlotId.TeaTree]: {
    id: FarmPlotId.TeaTree,
    name: '\u540e\u5c71\u8336\u6811',
    shortName: '\u8336\u6811',
    ingredientKey: 'teaLeaf',
    ingredientName: '\u8336\u53f6',
    unlockShopLevel: 1,
    baseYield: 10,
    yieldPerLevel: 5,
    maxLevel: 5,
    upgradeCosts: [0, 120, 300, 680, 1200],
  },
  [FarmPlotId.FlowerBed]: {
    id: FarmPlotId.FlowerBed,
    name: '\u5c71\u91ce\u82b1\u5703',
    shortName: '\u82b1\u5703',
    ingredientKey: 'flower',
    ingredientName: '\u82b1',
    unlockShopLevel: 3,
    baseYield: 4,
    yieldPerLevel: 3,
    maxLevel: 5,
    upgradeCosts: [0, 160, 380, 820, 1500],
  },
  [FarmPlotId.FruitTree]: {
    id: FarmPlotId.FruitTree,
    name: '\u6843\u68a8\u679c\u6811',
    shortName: '\u679c\u6811',
    ingredientKey: 'fruit',
    ingredientName: '\u679c',
    unlockShopLevel: 5,
    baseYield: 3,
    yieldPerLevel: 2,
    maxLevel: 5,
    upgradeCosts: [0, 220, 520, 1050, 1900],
  },
};

export const FARM_PLOT_ORDER: FarmPlotId[] = [
  FarmPlotId.TeaTree,
  FarmPlotId.FlowerBed,
  FarmPlotId.FruitTree,
];

export function getFarmPlotConfig(id: FarmPlotId): FarmPlotConfig {
  return FARM_PLOTS[id];
}

export function calculateFarmYield(config: FarmPlotConfig, savePlot: FarmPlotSave): number {
  if (!savePlot.unlocked || savePlot.level <= 0) {
    return 0;
  }
  return config.baseYield + (savePlot.level - 1) * config.yieldPerLevel;
}

export function getFarmUpgradeCost(config: FarmPlotConfig, savePlot: FarmPlotSave): number {
  if (!savePlot.unlocked || savePlot.level <= 0) {
    return 0;
  }
  if (savePlot.level >= config.maxLevel) {
    return 0;
  }
  return config.upgradeCosts[savePlot.level] ?? 0;
}
