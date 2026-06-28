import { Vec3 } from 'cc';
import { FarmPlotId } from './FarmConfig';
import { RecipeId } from './GameConfig';

type EventHandler<T = unknown> = (payload: T) => void;

export type MainTabId = 'teahouse' | 'farm' | 'staff' | 'research' | 'collection' | 'decoration';
export type PrimaryActionId = 'upgrade' | 'supply' | 'extendDay' | 'dayButton' | 'showHelp';
export type SupplyItemId = 'teaLeaf' | 'sugar' | 'flower' | 'fruit';

export interface OfflineRewardSummary {
  idleSeconds: number;
  coins: number;
  teaLeaf: number;
  sugar: number;
  flower: number;
  fruit: number;
}

export interface ReviveOfferPayload {
  coinCost: number;
  restoreReputation: number;
  customerCount: number;
  reason: 'reputation_zero' | 'grade_risk';
}

export interface RequestRevivePayload {
  method: 'token' | 'ad' | 'skip';
  coinCost: number;
}

export interface ReviveSuccessPayload {
  method: 'token' | 'ad';
  restoreReputation: number;
  customerCount: number;
}

export interface UnlockSummary {
  level: number;
  seatCount: number;
  unlockText: string;
  newRecipes: string[];
  workstationText?: string;
  staffText?: string;
}

export interface ResearchResultSummary {
  name: string;
  tier: string;
  price: number;
  taste: number;
  aroma: number;
  popularity: number;
  rarity: number;
}

export interface SupplyShopItemView {
  id: SupplyItemId;
  name: string;
  price: number;
  amount: number;
  stock: number;
  highlighted?: boolean;
}

export interface SupplyShopViewModel {
  active: boolean;
  coins: number;
  dailyPurchaseCount: number;
  items: SupplyShopItemView[];
  messageText?: string;
}

export interface CollectionRecipeView {
  id: string;
  name: string;
  unlocked: boolean;
  description: string;
}

export interface CollectionViewModel {
  active: boolean;
  unlockedCount: number;
  totalCount: number;
  recipes: CollectionRecipeView[];
  recentUnlockText?: string;
}

export interface HudViewModel {
  messageText?: string;
  levelText: string;
  coinsText: string;
  goalText: string;
  ingredientText: string;
  actionHintText: string;
  urgentAlertText: string;
  readyTeaText: string;
  recipeButtonTexts: Partial<Record<RecipeId, string>>;
  primaryButtonTexts: Partial<Record<'upgrade' | 'supply' | 'nextDay' | 'extend', string>>;
  mainTabTexts: Partial<Record<MainTabId, string>>;
}

export interface PlayEffectPayload {
  type: 'coinFly' | 'emotion';
  position: Vec3;
  value?: number;
  emotionType?: 'happy' | 'angry';
}

export interface OrderCompletedPayload {
  recipeId: string;
  income: number;
  position: Vec3;
  heatQuality: 'normal' | 'perfect';
}

export interface ShopUpgradedPayload {
  level: number;
}

export interface ResearchCompletedPayload {
  name: string;
  tier: string;
}

export interface DaySettledPayload {
  day: number;
  grade: string;
  revenue: number;
  servedCups: number;
  lostCustomers: number;
  wastedTea: number;
}

export interface FarmPlotChangedPayload {
  plotId: FarmPlotId;
  level: number;
  unlocked: boolean;
}

export interface WorkstationQteStatePayload {
  active: boolean;
  progress: number;
  windowStart: number;
  windowEnd: number;
  recipeName?: string;
}

export enum GameEventName {
  HudMessage = 'hud:message',
  HudViewModel = 'hud:view-model',
  PopupOfflineReward = 'popup:offline-reward',
  PopupReviveOffer = 'popup:revive-offer',
  PopupUpgradeUnlock = 'popup:upgrade-unlock',
  PopupResearchResult = 'popup:research-result',
  SupplyShopViewModel = 'supply-shop:view-model',
  CollectionViewModel = 'collection:view-model',
  PlayEffect = 'fx:play-effect',
  OrderCompleted = 'game:order-completed',
  ShopUpgraded = 'game:shop-upgraded',
  ResearchCompleted = 'game:research-completed',
  DaySettled = 'game:day-settled',
  FarmPlotChanged = 'farm:plot-changed',
  WorkstationQteState = 'workstation:qte-state',
  RequestMakeRecipe = 'request:make-recipe',
  RequestRevive = 'request:revive',
  RequestDoubleOfflineReward = 'request:double-offline-reward',
  RequestPrimaryAction = 'request:primary-action',
  RequestSwitchMainTab = 'request:switch-main-tab',
  RequestOpenSupplyShop = 'request:open-supply-shop',
  RequestBuySupplyItem = 'request:buy-supply-item',
  OnReviveSuccess = 'game:revive-success',
}

export class EventBus {
  private static listeners = new Map<string, Set<EventHandler>>();

  static on<T = unknown>(eventName: string, handler: EventHandler<T>): void {
    const handlers = EventBus.listeners.get(eventName) ?? new Set<EventHandler>();
    handlers.add(handler as EventHandler);
    EventBus.listeners.set(eventName, handlers);
  }

  static off<T = unknown>(eventName: string, handler: EventHandler<T>): void {
    const handlers = EventBus.listeners.get(eventName);
    if (!handlers) {
      return;
    }
    handlers.delete(handler as EventHandler);
    if (handlers.size === 0) {
      EventBus.listeners.delete(eventName);
    }
  }

  static emit<T = unknown>(eventName: string, payload: T): void {
    const handlers = EventBus.listeners.get(eventName);
    if (!handlers) {
      return;
    }
    handlers.forEach((handler) => handler(payload));
  }
}
