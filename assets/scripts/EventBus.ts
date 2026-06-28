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

export enum GameEventName {
  HudMessage = 'hud:message',
  HudViewModel = 'hud:view-model',
  PopupOfflineReward = 'popup:offline-reward',
  PopupUpgradeUnlock = 'popup:upgrade-unlock',
  PopupResearchResult = 'popup:research-result',
  SupplyShopViewModel = 'supply-shop:view-model',
  CollectionViewModel = 'collection:view-model',
  RequestMakeRecipe = 'request:make-recipe',
  RequestPrimaryAction = 'request:primary-action',
  RequestSwitchMainTab = 'request:switch-main-tab',
  RequestOpenSupplyShop = 'request:open-supply-shop',
  RequestBuySupplyItem = 'request:buy-supply-item',
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
