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
      return `${config.name}\n\u5e97\u94fa ${config.unlockShopLevel} \u7ea7\u89e3\u9501\uff0c\u4e4b\u540e\u6bcf\u5929\u4ea7\u51fa${config.ingredientName}`;
    }
    if (!savePlot.unlocked || savePlot.level <= 0) {
      return `${config.name}\n\u53ef\u89e3\u9501\uff0c\u660e\u5929\u5f00\u59cb\u4ea7\u51fa${config.ingredientName}`;
    }
    return `${config.name} Lv.${savePlot.level}\n\u660e\u5929\u4ea7\u51fa ${calculateFarmYield(config, savePlot)} ${config.ingredientName}`;
  }

  getButtonText(plotId: FarmPlotId): string {
    const saveData = this.context.getSaveData();
    const config = getFarmPlotConfig(plotId);
    const savePlot = this.getSavePlot(plotId);
    if (saveData.level < config.unlockShopLevel && !savePlot.unlocked) {
      return `${config.shortName}\n${config.unlockShopLevel}\u7ea7\u89e3\u9501`;
    }
    if (!savePlot.unlocked || savePlot.level <= 0) {
      return `${config.shortName}\n\u89e3\u9501`;
    }
    if (savePlot.level >= config.maxLevel) {
      return `${config.shortName}\n\u6ee1\u7ea7 ${calculateFarmYield(config, savePlot)}`;
    }
    return `${config.shortName}\n\u5347 ${savePlot.level + 1} \u7ea7 ${getFarmUpgradeCost(config, savePlot)}\u91d1`;
  }

  formatFarmText(): string {
    const saveData = this.context.getSaveData();
    return FARM_PLOT_SEQUENCE
      .map((plotId) => {
        const config = getFarmPlotConfig(plotId);
        const savePlot = this.getSavePlot(plotId);
        if (saveData.level < config.unlockShopLevel && !savePlot.unlocked) {
          return `${config.shortName}${config.unlockShopLevel}\u7ea7`;
        }
        if (!savePlot.unlocked || savePlot.level <= 0) {
          return `${config.shortName}\u53ef\u89e3\u9501`;
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
    return gained.length > 0 ? `\u519c\u573a\u6536\u83b7\uff1a${gained.join('\u3001')}` : '';
  }

  upgradePlot(plotId: FarmPlotId): FarmUpgradeResult {
    const saveData = this.context.getSaveData();
    const config = getFarmPlotConfig(plotId);
    const savePlot = this.getSavePlot(plotId);

    if (saveData.level < config.unlockShopLevel) {
      return { changed: false, message: `${config.name} \u9700\u8981\u5e97\u94fa ${config.unlockShopLevel} \u7ea7\u89e3\u9501` };
    }

    if (!savePlot.unlocked || savePlot.level <= 0) {
      savePlot.unlocked = true;
      savePlot.level = 1;
      this.context.unlockStaffByProgress();
      this.context.requestDeferredSave();
      this.emitPlotChanged(config, savePlot);
      return { changed: true, message: `\u89e3\u9501 ${config.name}\uff0c\u660e\u5929\u5f00\u59cb\u4ea7\u51fa${config.ingredientName}` };
    }

    if (savePlot.level >= config.maxLevel) {
      return {
        changed: false,
        message: `${config.name} \u5df2\u6ee1\u7ea7\uff0c\u6bcf\u5929\u4ea7\u51fa ${calculateFarmYield(config, savePlot)} ${config.ingredientName}`,
      };
    }

    const cost = getFarmUpgradeCost(config, savePlot);
    if (saveData.coins < cost) {
      return { changed: false, message: `\u91d1\u5e01\u4e0d\u8db3\uff0c\u5347\u7ea7 ${config.name} \u9700\u8981 ${cost} \u91d1\u5e01` };
    }

    saveData.coins -= cost;
    savePlot.level += 1;
    this.context.unlockStaffByProgress();
    this.context.requestDeferredSave();
    this.emitPlotChanged(config, savePlot);
    return {
      changed: true,
      message: `${config.name} \u5347\u5230 ${savePlot.level} \u7ea7\uff0c\u660e\u5929\u4ea7\u91cf\u63d0\u5347\u5230 ${calculateFarmYield(config, savePlot)} ${config.ingredientName}`,
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
