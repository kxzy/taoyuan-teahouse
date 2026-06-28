import { calculateFarmYield, FARM_PLOT_ORDER, FarmPlotConfig, FarmPlotId, getFarmPlotConfig, getFarmUpgradeCost } from '../FarmConfig';
import { EventBus, FarmPlotChangedPayload, GameEventName } from '../EventBus';
import { FarmPlotSave, GameSaveData } from '../SaveManager';

export interface FarmSystemContext {
  getActiveFarmYieldMultiplier(): number;
  getBusinessDay(): number;
  getSaveData(): GameSaveData;
  requestDeferredSave(): void;
  unlockStaffByProgress(): string;
}

export interface FarmUpgradeResult {
  changed: boolean;
  message: string;
}

export const FARM_PLOT_SEQUENCE: readonly FarmPlotId[] = FARM_PLOT_ORDER;

export class FarmSystem {
  constructor(private readonly context: FarmSystemContext) {}

  getSavePlot(plotId: FarmPlotId): FarmPlotSave {
    const farm = this.context.getSaveData().farm;
    if (plotId === FarmPlotId.TeaTree) {
      return farm.teaTree;
    }
    if (plotId === FarmPlotId.FlowerBed) {
      return farm.flowerBed;
    }
    return farm.fruitTree;
  }

  getPlotDescription(plotId: FarmPlotId): string {
    const saveData = this.context.getSaveData();
    const config = getFarmPlotConfig(plotId);
    const savePlot = this.getSavePlot(plotId);
    if (saveData.level < config.unlockShopLevel && !savePlot.unlocked) {
      return `${config.name}\n店铺 ${config.unlockShopLevel} 级解锁，之后每天产出${config.ingredientName}`;
    }
    if (!savePlot.unlocked || savePlot.level <= 0) {
      return `${config.name}\n可解锁，明天开始产出${config.ingredientName}`;
    }
    return `${config.name} Lv.${savePlot.level}\n明天产出 ${calculateFarmYield(config, savePlot)} ${config.ingredientName}`;
  }

  getButtonText(plotId: FarmPlotId): string {
    const saveData = this.context.getSaveData();
    const config = getFarmPlotConfig(plotId);
    const savePlot = this.getSavePlot(plotId);
    if (saveData.level < config.unlockShopLevel && !savePlot.unlocked) {
      return `${config.shortName}\n${config.unlockShopLevel}级解锁`;
    }
    if (!savePlot.unlocked || savePlot.level <= 0) {
      return `${config.shortName}\n解锁`;
    }
    if (savePlot.level >= config.maxLevel) {
      return `${config.shortName}\n满级${calculateFarmYield(config, savePlot)}`;
    }
    return `${config.shortName}\n升${savePlot.level + 1}级 ${getFarmUpgradeCost(config, savePlot)}金`;
  }

  formatFarmText(): string {
    const saveData = this.context.getSaveData();
    return FARM_PLOT_SEQUENCE
      .map((plotId) => {
        const config = getFarmPlotConfig(plotId);
        const savePlot = this.getSavePlot(plotId);
        if (saveData.level < config.unlockShopLevel && !savePlot.unlocked) {
          return `${config.shortName}${config.unlockShopLevel}级`;
        }
        if (!savePlot.unlocked || savePlot.level <= 0) {
          return `${config.shortName}可解锁`;
        }
        return `${config.shortName}${savePlot.level}`;
      })
      .join(' ');
  }

  harvestFarmForNewDay(): string {
    const saveData = this.context.getSaveData();
    if (saveData.farm.lastHarvestDay >= this.context.getBusinessDay()) {
      return '';
    }

    const gained: string[] = [];
    for (const plotId of FARM_PLOT_SEQUENCE) {
      const config = getFarmPlotConfig(plotId);
      const savePlot = this.getSavePlot(plotId);
      if (!savePlot.unlocked || savePlot.level <= 0) {
        continue;
      }

      const amount = Math.floor(calculateFarmYield(config, savePlot) * this.context.getActiveFarmYieldMultiplier());
      saveData.ingredients[config.ingredientKey] += amount;
      gained.push(`${config.shortName}+${amount}${config.ingredientName}`);
    }

    saveData.farm.lastHarvestDay = this.context.getBusinessDay();
    this.context.requestDeferredSave();
    return gained.length > 0 ? `农场收获：${gained.join('、')}` : '';
  }

  upgradePlot(plotId: FarmPlotId): FarmUpgradeResult {
    const saveData = this.context.getSaveData();
    const config = getFarmPlotConfig(plotId);
    const savePlot = this.getSavePlot(plotId);

    if (saveData.level < config.unlockShopLevel) {
      return { changed: false, message: `${config.name} 需要店铺 ${config.unlockShopLevel} 级解锁` };
    }

    if (!savePlot.unlocked || savePlot.level <= 0) {
      savePlot.unlocked = true;
      savePlot.level = 1;
      this.context.unlockStaffByProgress();
      this.context.requestDeferredSave();
      this.emitPlotChanged(config, savePlot);
      return { changed: true, message: `解锁 ${config.name}，明天开始产出 ${config.ingredientName}` };
    }

    if (savePlot.level >= config.maxLevel) {
      return {
        changed: false,
        message: `${config.name} 已满级，每天产出 ${calculateFarmYield(config, savePlot)} ${config.ingredientName}`,
      };
    }

    const cost = getFarmUpgradeCost(config, savePlot);
    if (saveData.coins < cost) {
      return { changed: false, message: `金币不足，升级 ${config.name} 需要 ${cost} 金币` };
    }

    saveData.coins -= cost;
    savePlot.level += 1;
    this.context.unlockStaffByProgress();
    this.context.requestDeferredSave();
    this.emitPlotChanged(config, savePlot);
    return {
      changed: true,
      message: `${config.name} 升到 ${savePlot.level} 级，明天产量提升到 ${calculateFarmYield(config, savePlot)} ${config.ingredientName}`,
    };
  }

  areAllPlotsUnlocked(): boolean {
    return FARM_PLOT_SEQUENCE.every((plotId) => this.getSavePlot(plotId).unlocked);
  }

  areAllPlotsMaxLevel(): boolean {
    return FARM_PLOT_SEQUENCE.every((plotId) => {
      const config = getFarmPlotConfig(plotId);
      return this.getSavePlot(plotId).level >= config.maxLevel;
    });
  }

  private emitPlotChanged(config: FarmPlotConfig, savePlot: FarmPlotSave): void {
    const payload: FarmPlotChangedPayload = {
      plotId: config.id,
      level: savePlot.level,
      unlocked: savePlot.unlocked,
    };
    EventBus.emit(GameEventName.FarmPlotChanged, payload);
  }
}
