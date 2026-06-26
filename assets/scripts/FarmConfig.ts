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
    name: '后山茶树',
    shortName: '茶树',
    ingredientKey: 'teaLeaf',
    ingredientName: '茶叶',
    unlockShopLevel: 1,
    baseYield: 10,
    yieldPerLevel: 5,
    maxLevel: 5,
    upgradeCosts: [0, 120, 300, 680, 1200],
  },
  [FarmPlotId.FlowerBed]: {
    id: FarmPlotId.FlowerBed,
    name: '山野花圃',
    shortName: '花圃',
    ingredientKey: 'flower',
    ingredientName: '花',
    unlockShopLevel: 3,
    baseYield: 4,
    yieldPerLevel: 3,
    maxLevel: 5,
    upgradeCosts: [0, 160, 380, 820, 1500],
  },
  [FarmPlotId.FruitTree]: {
    id: FarmPlotId.FruitTree,
    name: '桃梨果树',
    shortName: '果树',
    ingredientKey: 'fruit',
    ingredientName: '果',
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
