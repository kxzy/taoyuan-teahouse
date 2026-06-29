import { EventBus, FarmPlotChangedPayload, GameEventName, OrderCompletedPayload, ResearchCompletedPayload, ShopUpgradedPayload, DaySettledPayload } from '../EventBus';
import { GameSaveData } from '../SaveManager';

export interface AchievementConfig {
  id: string;
  name: string;
  description: string;
  rewardText: string;
}

export interface AchievementSystemContext {
  getBusinessDay(): number;
  getDayLostCount(): number;
  getDayServedCount(): number;
  getDayWastedTeaCount(): number;
  getLastDayGrade(): string;
  getSaveData(): GameSaveData;
  areAllFarmPlotsMaxLevel(): boolean;
  areAllFarmPlotsUnlocked(): boolean;
  refreshHud(message: string): void;
  requestDeferredSave(): void;
}

export const ACHIEVEMENTS: AchievementConfig[] = [
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

export class AchievementSystem {
  private readonly handleDaySettled = (_payload: DaySettledPayload) => {
    this.evaluateNow();
  };

  private readonly handleOrderCompleted = (_payload: OrderCompletedPayload) => {
    this.evaluateNow();
  };

  private readonly handleResearchCompleted = (_payload: ResearchCompletedPayload) => {
    this.evaluateNow();
  };

  private readonly handleShopUpgraded = (_payload: ShopUpgradedPayload) => {
    this.evaluateNow();
  };

  private readonly handleFarmPlotChanged = (_payload: FarmPlotChangedPayload) => {
    this.evaluateNow();
  };

  constructor(private readonly context: AchievementSystemContext) {}

  init(): void {
    EventBus.on(GameEventName.DaySettled, this.handleDaySettled, this);
    EventBus.on(GameEventName.OrderCompleted, this.handleOrderCompleted, this);
    EventBus.on(GameEventName.ResearchCompleted, this.handleResearchCompleted, this);
    EventBus.on(GameEventName.ShopUpgraded, this.handleShopUpgraded, this);
    EventBus.on(GameEventName.FarmPlotChanged, this.handleFarmPlotChanged, this);
    this.evaluateNow();
  }

  dispose(): void {
    EventBus.off(GameEventName.DaySettled, this.handleDaySettled, this);
    EventBus.off(GameEventName.OrderCompleted, this.handleOrderCompleted, this);
    EventBus.off(GameEventName.ResearchCompleted, this.handleResearchCompleted, this);
    EventBus.off(GameEventName.ShopUpgraded, this.handleShopUpgraded, this);
    EventBus.off(GameEventName.FarmPlotChanged, this.handleFarmPlotChanged, this);
  }

  evaluateNow(): void {
    const saveData = this.context.getSaveData();
    const unlocked: AchievementConfig[] = [];
    for (const achievement of ACHIEVEMENTS) {
      if (saveData.achievements.claimedAchievementIds.includes(achievement.id)) {
        continue;
      }
      if (!this.isAchievementMet(achievement.id)) {
        continue;
      }
      saveData.achievements.claimedAchievementIds.push(achievement.id);
      this.applyAchievementReward(achievement.id);
      unlocked.push(achievement);
    }

    if (unlocked.length === 0) {
      return;
    }

    this.context.requestDeferredSave();
    const latest = unlocked[unlocked.length - 1];
    this.context.refreshHud(`成就达成：${latest.name}｜${latest.rewardText}`);
  }

  private isAchievementMet(id: string): boolean {
    const saveData = this.context.getSaveData();
    switch (id) {
      case 'first_day':
        return this.context.getBusinessDay() > 1 || saveData.longTerm.recentDayResults.length > 0;
      case 'level_2':
        return saveData.level >= 2;
      case 'serve_100':
        return saveData.longTerm.totalServedCups >= 100;
      case 'perfect_day':
        return this.context.getDayServedCount() > 0
          && this.context.getDayLostCount() === 0
          && this.context.getDayWastedTeaCount() === 0;
      case 'first_s':
        return saveData.longTerm.totalSGrades >= 1 || this.context.getLastDayGrade() === 'S';
      case 'streak_a_3':
        return saveData.longTerm.consecutiveAGradesOrBetter >= 3;
      case 'research_1':
        return saveData.longTerm.totalResearchCount >= 1;
      case 'research_ss':
        return saveData.developedRecipes.some((drink) => drink.tier === 'SS');
      case 'farm_all':
        return this.context.areAllFarmPlotsUnlocked();
      case 'farm_max':
        return this.context.areAllFarmPlotsMaxLevel();
      case 'week_goal':
        return saveData.longTerm.weeklyGoalClaimed;
      case 'prestige_5':
        return saveData.prestige.level >= 5;
      default:
        return false;
    }
  }

  private applyAchievementReward(id: string): void {
    const saveData = this.context.getSaveData();
    if (id === 'first_day') {
      saveData.coins += 80;
    }
    if (id === 'level_2') {
      saveData.ingredients.teaLeaf += 10;
    }
    if (id === 'serve_100') {
      saveData.coins += 300;
    }
    if (id === 'perfect_day') {
      saveData.ingredients.sugar += 10;
      saveData.ingredients.flower += 6;
    }
    if (id === 'first_s') {
      saveData.decoration.elegantCoins += 30;
    }
    if (id === 'streak_a_3') {
      saveData.ingredients.fruit += 5;
    }
    if (id === 'research_1') {
      saveData.coins += 100;
    }
    if (id === 'research_ss') {
      saveData.decoration.elegantCoins += 80;
    }
    if (id === 'farm_all') {
      saveData.ingredients.teaLeaf += 30;
    }
    if (id === 'farm_max') {
      saveData.coins += 1000;
    }
    if (id === 'week_goal') {
      saveData.decoration.elegantCoins += 50;
    }
    if (id === 'prestige_5') {
      saveData.decoration.elegantCoins += 100;
    }
  }
}
