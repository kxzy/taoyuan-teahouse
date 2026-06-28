import { sys } from 'cc';

const SAVE_KEY = 'taoyuan_teahouse_full_save_v1';
const SAVE_VERSION = 3;

export interface IngredientStock {
  teaLeaf: number;
  sugar: number;
  flower: number;
  fruit: number;
}

export interface FarmPlotSave {
  level: number;
  unlocked: boolean;
}

export interface FarmSaveData {
  teaTree: FarmPlotSave;
  flowerBed: FarmPlotSave;
  fruitTree: FarmPlotSave;
  lastHarvestDay: number;
}

export interface DevelopedDrinkSave {
  id: string;
  name: string;
  tier: string;
  taste: number;
  aroma: number;
  popularity: number;
  rarity: number;
  price: number;
  makeSeconds: number;
  ingredientCost: IngredientStock;
}

export interface DayResultSave {
  day: number;
  week: number;
  revenue: number;
  target: number;
  grade: string;
  servedCups: number;
  lostCustomers: number;
  wastedTea: number;
  eventName: string;
}

export interface LongTermSaveData {
  totalRevenue: number;
  totalServedCups: number;
  totalLostCustomers: number;
  totalWastedTea: number;
  totalSGrades: number;
  totalAGrades: number;
  totalResearchCount: number;
  currentWeek: number;
  weeklyRevenue: number;
  weeklyServedCups: number;
  weeklySGrades: number;
  weeklyResearchCount: number;
  weeklyGoalClaimed: boolean;
  dailySupplyCount: number;
  extendedToday: boolean;
  manualClosedToday: boolean;
  consecutiveSGrades: number;
  consecutiveAGradesOrBetter: number;
  recentDayResults: DayResultSave[];
}

export type StaffId = 'waiter' | 'teaMaster' | 'buyer';
export type WaiterStrategy = 'urgent' | 'expensive' | 'queue';

export interface StaffMemberSave {
  id: StaffId;
  unlocked: boolean;
  level: number;
  stamina: number;
  strategy: WaiterStrategy;
}

export interface StaffSaveData {
  members: StaffMemberSave[];
  teaSnack: number;
}

export interface RecipeStatSave {
  id: string;
  name: string;
  soldCups: number;
  totalRevenue: number;
  bestIncome: number;
  firstUnlockedDay: number;
  tier?: string;
  taste?: number;
  aroma?: number;
  popularity?: number;
  rarity?: number;
}

export interface CollectionSaveData {
  unlockedRecipeIds: string[];
  recipeStats: RecipeStatSave[];
}

export interface AchievementSaveData {
  claimedAchievementIds: string[];
}

export interface PrestigeSaveData {
  level: number;
  exp: number;
  totalExp: number;
}

export interface DecorationSaveData {
  ownedDecorationIds: string[];
  beautyScore: number;
  elegantCoins: number;
}

export interface SeasonSaveData {
  seasonId: string;
  seasonExp: number;
  claimedRewardTiers: number[];
  activeActivityId: string;
  lastActivityDay: number;
}

export interface GameSaveData {
  saveVersion: number;
  level: number;
  coins: number;
  unlockedSeatCount: number;
  workstationLevel: number;
  workstationCount: number;
  beautyScore: number;
  offlineEnabled: boolean;
  lastSaveTime: number;
  ingredients: IngredientStock;
  ownedDecorations: string[];
  tutorialCompleted: boolean;
  developedRecipes: DevelopedDrinkSave[];
  farm: FarmSaveData;
  businessDay: number;
  longTerm: LongTermSaveData;
  staff: StaffSaveData;
  collection: CollectionSaveData;
  achievements: AchievementSaveData;
  prestige: PrestigeSaveData;
  decoration: DecorationSaveData;
  season: SeasonSaveData;
}

export const DEFAULT_LONG_TERM_DATA: LongTermSaveData = {
  totalRevenue: 0,
  totalServedCups: 0,
  totalLostCustomers: 0,
  totalWastedTea: 0,
  totalSGrades: 0,
  totalAGrades: 0,
  totalResearchCount: 0,
  currentWeek: 1,
  weeklyRevenue: 0,
  weeklyServedCups: 0,
  weeklySGrades: 0,
  weeklyResearchCount: 0,
  weeklyGoalClaimed: false,
  dailySupplyCount: 0,
  extendedToday: false,
  manualClosedToday: false,
  consecutiveSGrades: 0,
  consecutiveAGradesOrBetter: 0,
  recentDayResults: [],
};

export const DEFAULT_STAFF_DATA: StaffSaveData = {
  members: [
    { id: 'waiter', unlocked: false, level: 1, stamina: 100, strategy: 'urgent' },
    { id: 'teaMaster', unlocked: false, level: 1, stamina: 100, strategy: 'urgent' },
    { id: 'buyer', unlocked: false, level: 1, stamina: 100, strategy: 'urgent' },
  ],
  teaSnack: 0,
};

export const DEFAULT_COLLECTION_DATA: CollectionSaveData = {
  unlockedRecipeIds: [],
  recipeStats: [],
};

export const DEFAULT_ACHIEVEMENT_DATA: AchievementSaveData = {
  claimedAchievementIds: [],
};

export const DEFAULT_PRESTIGE_DATA: PrestigeSaveData = {
  level: 1,
  exp: 0,
  totalExp: 0,
};

export const DEFAULT_DECORATION_DATA: DecorationSaveData = {
  ownedDecorationIds: [],
  beautyScore: 0,
  elegantCoins: 0,
};

export const DEFAULT_SEASON_DATA: SeasonSaveData = {
  seasonId: 'spring_tea',
  seasonExp: 0,
  claimedRewardTiers: [],
  activeActivityId: 'none',
  lastActivityDay: 0,
};

export const DEFAULT_SAVE_DATA: GameSaveData = {
  saveVersion: SAVE_VERSION,
  level: 1,
  coins: 0,
  unlockedSeatCount: 2,
  workstationLevel: 1,
  workstationCount: 1,
  beautyScore: 0,
  offlineEnabled: false,
  lastSaveTime: Date.now(),
  ingredients: {
    teaLeaf: 60,
    sugar: 24,
    flower: 12,
    fruit: 0,
  },
  ownedDecorations: [],
  tutorialCompleted: false,
  developedRecipes: [],
  farm: {
    teaTree: { level: 1, unlocked: true },
    flowerBed: { level: 0, unlocked: false },
    fruitTree: { level: 0, unlocked: false },
    lastHarvestDay: 0,
  },
  businessDay: 1,
  longTerm: { ...DEFAULT_LONG_TERM_DATA, recentDayResults: [] },
  staff: {
    teaSnack: DEFAULT_STAFF_DATA.teaSnack,
    members: DEFAULT_STAFF_DATA.members.map((member) => ({ ...member })),
  },
  collection: { ...DEFAULT_COLLECTION_DATA, unlockedRecipeIds: [], recipeStats: [] },
  achievements: { ...DEFAULT_ACHIEVEMENT_DATA, claimedAchievementIds: [] },
  prestige: { ...DEFAULT_PRESTIGE_DATA },
  decoration: { ...DEFAULT_DECORATION_DATA, ownedDecorationIds: [] },
  season: { ...DEFAULT_SEASON_DATA, claimedRewardTiers: [] },
};

function cloneIngredients(value: IngredientStock): IngredientStock {
  return {
    teaLeaf: value.teaLeaf,
    sugar: value.sugar,
    flower: value.flower,
    fruit: value.fruit,
  };
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function mergeIngredients(parsed?: Partial<IngredientStock>): IngredientStock {
  return {
    teaLeaf: parsed?.teaLeaf ?? DEFAULT_SAVE_DATA.ingredients.teaLeaf,
    sugar: parsed?.sugar ?? DEFAULT_SAVE_DATA.ingredients.sugar,
    flower: parsed?.flower ?? DEFAULT_SAVE_DATA.ingredients.flower,
    fruit: parsed?.fruit ?? DEFAULT_SAVE_DATA.ingredients.fruit,
  };
}

function mergeFarmPlot(parsed: Partial<FarmPlotSave> | undefined, defaults: FarmPlotSave): FarmPlotSave {
  return {
    level: clampNumber(parsed?.level, 0, 5, defaults.level),
    unlocked: parsed?.unlocked ?? defaults.unlocked,
  };
}

function mergeFarm(parsed?: Partial<FarmSaveData>): FarmSaveData {
  return {
    teaTree: mergeFarmPlot(parsed?.teaTree, DEFAULT_SAVE_DATA.farm.teaTree),
    flowerBed: mergeFarmPlot(parsed?.flowerBed, DEFAULT_SAVE_DATA.farm.flowerBed),
    fruitTree: mergeFarmPlot(parsed?.fruitTree, DEFAULT_SAVE_DATA.farm.fruitTree),
    lastHarvestDay: parsed?.lastHarvestDay ?? DEFAULT_SAVE_DATA.farm.lastHarvestDay,
  };
}

function mergeDevelopedRecipes(parsed?: DevelopedDrinkSave[]): DevelopedDrinkSave[] {
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .filter((item) => item && item.id && item.name)
    .slice(0, 30)
    .map((item) => ({
      ...item,
      ingredientCost: mergeIngredients(item.ingredientCost),
    }));
}

function mergeDayResults(parsed?: DayResultSave[]): DayResultSave[] {
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .filter((item) => item && typeof item.day === 'number')
    .slice(-14)
    .map((item) => ({
      day: clampNumber(item.day, 1, 9999, 1),
      week: clampNumber(item.week, 1, 999, 1),
      revenue: Math.max(0, Math.floor(item.revenue ?? 0)),
      target: Math.max(0, Math.floor(item.target ?? 0)),
      grade: item.grade ?? 'C',
      servedCups: Math.max(0, Math.floor(item.servedCups ?? 0)),
      lostCustomers: Math.max(0, Math.floor(item.lostCustomers ?? 0)),
      wastedTea: Math.max(0, Math.floor(item.wastedTea ?? 0)),
      eventName: item.eventName ?? '平常日',
    }));
}

function mergeLongTerm(parsed?: Partial<LongTermSaveData>, businessDay = 1): LongTermSaveData {
  const currentWeek = clampNumber(parsed?.currentWeek, 1, 999, Math.max(1, Math.ceil(businessDay / 7)));
  return {
    totalRevenue: Math.max(0, Math.floor(parsed?.totalRevenue ?? DEFAULT_LONG_TERM_DATA.totalRevenue)),
    totalServedCups: Math.max(0, Math.floor(parsed?.totalServedCups ?? DEFAULT_LONG_TERM_DATA.totalServedCups)),
    totalLostCustomers: Math.max(0, Math.floor(parsed?.totalLostCustomers ?? DEFAULT_LONG_TERM_DATA.totalLostCustomers)),
    totalWastedTea: Math.max(0, Math.floor(parsed?.totalWastedTea ?? DEFAULT_LONG_TERM_DATA.totalWastedTea)),
    totalSGrades: Math.max(0, Math.floor(parsed?.totalSGrades ?? DEFAULT_LONG_TERM_DATA.totalSGrades)),
    totalAGrades: Math.max(0, Math.floor(parsed?.totalAGrades ?? DEFAULT_LONG_TERM_DATA.totalAGrades)),
    totalResearchCount: Math.max(0, Math.floor(parsed?.totalResearchCount ?? DEFAULT_LONG_TERM_DATA.totalResearchCount)),
    currentWeek,
    weeklyRevenue: Math.max(0, Math.floor(parsed?.weeklyRevenue ?? DEFAULT_LONG_TERM_DATA.weeklyRevenue)),
    weeklyServedCups: Math.max(0, Math.floor(parsed?.weeklyServedCups ?? DEFAULT_LONG_TERM_DATA.weeklyServedCups)),
    weeklySGrades: Math.max(0, Math.floor(parsed?.weeklySGrades ?? DEFAULT_LONG_TERM_DATA.weeklySGrades)),
    weeklyResearchCount: Math.max(0, Math.floor(parsed?.weeklyResearchCount ?? DEFAULT_LONG_TERM_DATA.weeklyResearchCount)),
    weeklyGoalClaimed: parsed?.weeklyGoalClaimed ?? DEFAULT_LONG_TERM_DATA.weeklyGoalClaimed,
    dailySupplyCount: Math.max(0, Math.floor(parsed?.dailySupplyCount ?? DEFAULT_LONG_TERM_DATA.dailySupplyCount)),
    extendedToday: parsed?.extendedToday ?? DEFAULT_LONG_TERM_DATA.extendedToday,
    manualClosedToday: parsed?.manualClosedToday ?? DEFAULT_LONG_TERM_DATA.manualClosedToday,
    consecutiveSGrades: Math.max(0, Math.floor(parsed?.consecutiveSGrades ?? DEFAULT_LONG_TERM_DATA.consecutiveSGrades)),
    consecutiveAGradesOrBetter: Math.max(0, Math.floor(parsed?.consecutiveAGradesOrBetter ?? DEFAULT_LONG_TERM_DATA.consecutiveAGradesOrBetter)),
    recentDayResults: mergeDayResults(parsed?.recentDayResults),
  };
}

function mergeStaffMember(parsed: Partial<StaffMemberSave> | undefined, defaults: StaffMemberSave): StaffMemberSave {
  const strategy = parsed?.strategy === 'expensive' || parsed?.strategy === 'queue' ? parsed.strategy : defaults.strategy;
  return {
    id: defaults.id,
    unlocked: parsed?.unlocked ?? defaults.unlocked,
    level: clampNumber(parsed?.level, 1, 10, defaults.level),
    stamina: clampNumber(parsed?.stamina, 0, 100, defaults.stamina),
    strategy,
  };
}

function mergeStaff(parsed?: Partial<StaffSaveData>): StaffSaveData {
  return {
    teaSnack: Math.max(0, Math.floor(parsed?.teaSnack ?? DEFAULT_STAFF_DATA.teaSnack)),
    members: DEFAULT_STAFF_DATA.members.map((defaults) => {
      const existing = parsed?.members?.find((item) => item.id === defaults.id);
      return mergeStaffMember(existing, defaults);
    }),
  };
}

function mergeRecipeStats(parsed?: RecipeStatSave[]): RecipeStatSave[] {
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .filter((item) => item && item.id && item.name)
    .slice(0, 80)
    .map((item) => ({
      id: item.id,
      name: item.name,
      soldCups: Math.max(0, Math.floor(item.soldCups ?? 0)),
      totalRevenue: Math.max(0, Math.floor(item.totalRevenue ?? 0)),
      bestIncome: Math.max(0, Math.floor(item.bestIncome ?? 0)),
      firstUnlockedDay: Math.max(1, Math.floor(item.firstUnlockedDay ?? 1)),
      tier: item.tier,
      taste: item.taste,
      aroma: item.aroma,
      popularity: item.popularity,
      rarity: item.rarity,
    }));
}

function mergeCollection(parsed?: Partial<CollectionSaveData>): CollectionSaveData {
  const unlockedRecipeIds = parsed?.unlockedRecipeIds;
  return {
    unlockedRecipeIds: Array.isArray(unlockedRecipeIds) ? [...new Set(unlockedRecipeIds)].slice(0, 80) : [],
    recipeStats: mergeRecipeStats(parsed?.recipeStats),
  };
}

function mergeAchievements(parsed?: Partial<AchievementSaveData>): AchievementSaveData {
  const claimedAchievementIds = parsed?.claimedAchievementIds;
  return {
    claimedAchievementIds: Array.isArray(claimedAchievementIds) ? [...new Set(claimedAchievementIds)].slice(0, 100) : [],
  };
}

function mergePrestige(parsed?: Partial<PrestigeSaveData>): PrestigeSaveData {
  return {
    level: clampNumber(parsed?.level, 1, 50, DEFAULT_PRESTIGE_DATA.level),
    exp: Math.max(0, Math.floor(parsed?.exp ?? DEFAULT_PRESTIGE_DATA.exp)),
    totalExp: Math.max(0, Math.floor(parsed?.totalExp ?? DEFAULT_PRESTIGE_DATA.totalExp)),
  };
}

function mergeDecoration(parsed?: Partial<DecorationSaveData>, legacyBeautyScore = 0, legacyOwnedDecorations: string[] = []): DecorationSaveData {
  const owned = Array.isArray(parsed?.ownedDecorationIds) ? parsed?.ownedDecorationIds ?? [] : legacyOwnedDecorations;
  return {
    ownedDecorationIds: [...new Set(owned)].slice(0, 120),
    beautyScore: Math.max(0, Math.floor(parsed?.beautyScore ?? legacyBeautyScore ?? DEFAULT_DECORATION_DATA.beautyScore)),
    elegantCoins: Math.max(0, Math.floor(parsed?.elegantCoins ?? DEFAULT_DECORATION_DATA.elegantCoins)),
  };
}

function mergeSeason(parsed?: Partial<SeasonSaveData>): SeasonSaveData {
  const claimedRewardTiers = parsed?.claimedRewardTiers;
  return {
    seasonId: parsed?.seasonId ?? DEFAULT_SEASON_DATA.seasonId,
    seasonExp: Math.max(0, Math.floor(parsed?.seasonExp ?? DEFAULT_SEASON_DATA.seasonExp)),
    claimedRewardTiers: Array.isArray(claimedRewardTiers) ? [...new Set(claimedRewardTiers)].slice(0, 100) : [],
    activeActivityId: parsed?.activeActivityId ?? DEFAULT_SEASON_DATA.activeActivityId,
    lastActivityDay: Math.max(0, Math.floor(parsed?.lastActivityDay ?? DEFAULT_SEASON_DATA.lastActivityDay)),
  };
}

function normalizeSaveData(data: GameSaveData): GameSaveData {
  const decoration = mergeDecoration(data.decoration, data.beautyScore, data.ownedDecorations);
  return {
    ...data,
    saveVersion: SAVE_VERSION,
    level: clampNumber(data.level, 1, 10, DEFAULT_SAVE_DATA.level),
    coins: Math.max(0, Math.floor(data.coins ?? DEFAULT_SAVE_DATA.coins)),
    unlockedSeatCount: clampNumber(data.unlockedSeatCount, 2, 6, DEFAULT_SAVE_DATA.unlockedSeatCount),
    workstationLevel: clampNumber(data.workstationLevel, 1, 4, DEFAULT_SAVE_DATA.workstationLevel),
    workstationCount: 1,
    beautyScore: decoration.beautyScore,
    ingredients: cloneIngredients(data.ingredients),
    ownedDecorations: [...new Set(decoration.ownedDecorationIds)],
    developedRecipes: mergeDevelopedRecipes(data.developedRecipes),
    farm: mergeFarm(data.farm),
    businessDay: clampNumber(data.businessDay, 1, 9999, DEFAULT_SAVE_DATA.businessDay),
    longTerm: mergeLongTerm(data.longTerm, data.businessDay),
    staff: mergeStaff(data.staff),
    collection: mergeCollection(data.collection),
    achievements: mergeAchievements(data.achievements),
    prestige: mergePrestige(data.prestige),
    decoration,
    season: mergeSeason(data.season),
    lastSaveTime: Date.now(),
  };
}

export class SaveManager {
  private static pendingSaveData: GameSaveData | null = null;
  private static saveTimer: ReturnType<typeof setTimeout> | null = null;

  static load(): GameSaveData {
    const raw = sys.localStorage.getItem(SAVE_KEY) ?? sys.localStorage.getItem('taoyuan_teahouse_demo_save_v1');
    if (!raw) {
      return normalizeSaveData({
        ...DEFAULT_SAVE_DATA,
        ingredients: cloneIngredients(DEFAULT_SAVE_DATA.ingredients),
        ownedDecorations: [],
        developedRecipes: [],
        farm: mergeFarm(),
        businessDay: DEFAULT_SAVE_DATA.businessDay,
        longTerm: mergeLongTerm(),
        staff: mergeStaff(),
        collection: mergeCollection(),
        achievements: mergeAchievements(),
        prestige: mergePrestige(),
        decoration: mergeDecoration(),
        season: mergeSeason(),
      });
    }

    try {
      const parsed = JSON.parse(raw) as Partial<GameSaveData>;
      const businessDay = clampNumber(parsed.businessDay, 1, 9999, DEFAULT_SAVE_DATA.businessDay);
      return normalizeSaveData({
        saveVersion: parsed.saveVersion ?? SAVE_VERSION,
        level: clampNumber(parsed.level, 1, 10, DEFAULT_SAVE_DATA.level),
        coins: Math.max(0, Math.floor(parsed.coins ?? DEFAULT_SAVE_DATA.coins)),
        unlockedSeatCount: clampNumber(parsed.unlockedSeatCount, 2, 6, DEFAULT_SAVE_DATA.unlockedSeatCount),
        workstationLevel: clampNumber(parsed.workstationLevel, 1, 4, DEFAULT_SAVE_DATA.workstationLevel),
        workstationCount: clampNumber(parsed.workstationCount, 1, 1, DEFAULT_SAVE_DATA.workstationCount),
        beautyScore: Math.max(0, Math.floor(parsed.beautyScore ?? parsed.decoration?.beautyScore ?? DEFAULT_SAVE_DATA.beautyScore)),
        offlineEnabled: parsed.offlineEnabled ?? DEFAULT_SAVE_DATA.offlineEnabled,
        lastSaveTime: parsed.lastSaveTime ?? DEFAULT_SAVE_DATA.lastSaveTime,
        ingredients: mergeIngredients(parsed.ingredients),
        ownedDecorations: parsed.ownedDecorations ?? parsed.decoration?.ownedDecorationIds ?? [],
        tutorialCompleted: parsed.tutorialCompleted ?? DEFAULT_SAVE_DATA.tutorialCompleted,
        developedRecipes: mergeDevelopedRecipes(parsed.developedRecipes),
        farm: mergeFarm(parsed.farm),
        businessDay,
        longTerm: mergeLongTerm(parsed.longTerm, businessDay),
        staff: mergeStaff(parsed.staff),
        collection: mergeCollection(parsed.collection),
        achievements: mergeAchievements(parsed.achievements),
        prestige: mergePrestige(parsed.prestige),
        decoration: mergeDecoration(parsed.decoration, parsed.beautyScore ?? 0, parsed.ownedDecorations ?? []),
        season: mergeSeason(parsed.season),
      });
    } catch (error) {
      console.warn('存档读取失败，已使用默认存档。', error);
      return normalizeSaveData({
        ...DEFAULT_SAVE_DATA,
        ingredients: cloneIngredients(DEFAULT_SAVE_DATA.ingredients),
        ownedDecorations: [],
        developedRecipes: [],
        farm: mergeFarm(),
        businessDay: DEFAULT_SAVE_DATA.businessDay,
        longTerm: mergeLongTerm(),
        staff: mergeStaff(),
        collection: mergeCollection(),
        achievements: mergeAchievements(),
        prestige: mergePrestige(),
        decoration: mergeDecoration(),
        season: mergeSeason(),
      });
    }
  }

  static save(data: GameSaveData): void {
    const nextData = normalizeSaveData(data);
    SaveManager.pendingSaveData = null;
    if (SaveManager.saveTimer) {
      clearTimeout(SaveManager.saveTimer);
      SaveManager.saveTimer = null;
    }
    sys.localStorage.setItem(SAVE_KEY, JSON.stringify(nextData));
  }

  static saveDeferred(data: GameSaveData, delayMs = 400): void {
    SaveManager.pendingSaveData = normalizeSaveData(data);
    if (SaveManager.saveTimer) {
      clearTimeout(SaveManager.saveTimer);
    }
    SaveManager.saveTimer = setTimeout(() => {
      SaveManager.flushPendingSave();
    }, Math.max(0, delayMs));
  }

  static flushPendingSave(): void {
    if (!SaveManager.pendingSaveData) {
      return;
    }
    const pendingData = SaveManager.pendingSaveData;
    SaveManager.pendingSaveData = null;
    if (SaveManager.saveTimer) {
      clearTimeout(SaveManager.saveTimer);
      SaveManager.saveTimer = null;
    }
    sys.localStorage.setItem(SAVE_KEY, JSON.stringify(pendingData));
  }

  static clear(): void {
    SaveManager.pendingSaveData = null;
    if (SaveManager.saveTimer) {
      clearTimeout(SaveManager.saveTimer);
      SaveManager.saveTimer = null;
    }
    sys.localStorage.removeItem(SAVE_KEY);
    sys.localStorage.removeItem('taoyuan_teahouse_demo_save_v1');
  }
}
