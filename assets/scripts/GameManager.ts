import { _decorator, Component, Label, Node, Prefab, instantiate, Vec3 } from 'cc';
import { Customer, CustomerState } from './Customer';
import { CUSTOMER_TYPES, getLevelConfig, getMaxDemoLevel, getRecipe, RecipeConfig, RecipeId } from './GameConfig';
import { SaveManager, GameSaveData } from './SaveManager';
import { Workstation } from './Workstation';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
  @property(Label)
  levelLabel: Label | null = null;

  @property(Label)
  coinsLabel: Label | null = null;

  @property(Label)
  messageLabel: Label | null = null;

  @property(Workstation)
  workstation: Workstation | null = null;

  @property(Prefab)
  customerPrefab: Prefab | null = null;

  @property(Node)
  customerRoot: Node | null = null;

  @property([Node])
  seatNodes: Node[] = [];

  private saveData: GameSaveData = SaveManager.load();
  private customers: Customer[] = [];
  private spawnTimer = 0;
  private occupiedSeats = new Set<number>();
  private successfulServeStreak = 0;

  start(): void {
    this.saveData = SaveManager.load();
    this.workstation?.setTeaReadyCallback((recipe) => this.onTeaReady(recipe));
    this.spawnTimer = 1;
    this.refreshHud('娆㈣繋鏉ュ埌妗冩簮鑼惰倖');
  }

  update(deltaTime: number): void {
    this.spawnTimer -= deltaTime;
    const levelConfig = getLevelConfig(this.saveData.level);
    if (this.spawnTimer <= 0) {
      this.spawnTimer = levelConfig.customerSpawnInterval;
      this.trySpawnCustomer();
    }
  }

  makeGreenTea(): void {
    this.enqueueRecipe(RecipeId.GreenTea);
  }

  makeBlackTea(): void {
    this.enqueueRecipe(RecipeId.BlackTea);
  }

  makeJasmineTea(): void {
    this.enqueueRecipe(RecipeId.JasmineTea);
  }

  upgradeShop(): void {
    const currentConfig = getLevelConfig(this.saveData.level);
    const maxLevel = getMaxDemoLevel();
    if (this.saveData.level >= maxLevel) {
      this.refreshHud('Demo 版本已达到最高等级');
      return;
    }

    if (this.saveData.coins < currentConfig.upgradeCost) {
      this.refreshHud(`金币不足，升级需要 ${currentConfig.upgradeCost} 金币`);
      return;
    }

    this.saveData.coins -= currentConfig.upgradeCost;
    this.saveData.level += 1;
    this.saveData.unlockedSeatCount = getLevelConfig(this.saveData.level).seatCount;
    SaveManager.save(this.saveData);
    this.refreshHud(`店铺升级到 Lv.${this.saveData.level}`);
  }

  debugAddCoins(): void {
    this.saveData.coins += 300;
    SaveManager.save(this.saveData);
    this.refreshHud('调试：金币 +300');
  }

  debugClearSave(): void {
    SaveManager.clear();
    this.saveData = SaveManager.load();
    this.clearAllCustomers();
    this.workstation?.clearQueue();
    this.spawnTimer = 1;
    this.refreshHud('璋冭瘯锛氬凡娓呯┖瀛樻。');
  }

  debugSpawnCustomer(): void {
    this.trySpawnCustomer(true);
  }

  private enqueueRecipe(recipeId: RecipeId): void {
    const levelConfig = getLevelConfig(this.saveData.level);
    if (!levelConfig.unlockedRecipeIds.includes(recipeId)) {
      this.refreshHud('该茶饮尚未解锁');
      return;
    }

    const recipe = getRecipe(recipeId);
    const success = this.workstation?.enqueue(recipe) ?? false;
    this.refreshHud(success ? `开始制作 ${recipe.name}` : '操作台队列已满');
  }

  private trySpawnCustomer(force = false): void {
    const levelConfig = getLevelConfig(this.saveData.level);
    if (!force && this.customers.length >= levelConfig.maxCustomers) {
      return;
    }

    const seatIndex = this.findFreeSeatIndex();
    if (seatIndex < 0) {
      return;
    }

    if (!this.customerPrefab || !this.customerRoot) {
      this.refreshHud('缂哄皯瀹汉 Prefab 鎴?customerRoot 缁戝畾');
      return;
    }

    const customerNode = instantiate(this.customerPrefab);
    this.customerRoot.addChild(customerNode);
    const seatNode = this.seatNodes[seatIndex];
    customerNode.setWorldPosition(seatNode.worldPosition.clone().add(new Vec3(0, 45, 0)));

    const customer = customerNode.getComponent(Customer);
    if (!customer) {
      customerNode.destroy();
      this.refreshHud('瀹汉 Prefab 缂哄皯 Customer 缁勪欢');
      return;
    }

    const customerType = this.pickCustomerType();
    const recipe = this.pickRecipeForCustomer(customerType.allowedRecipeIds);
    this.occupiedSeats.add(seatIndex);
    customer.init({
      recipe,
      spendMultiplier: customerType.spendMultiplier,
      patienceSeconds: customerType.patienceSeconds,
      seatIndex,
      onLost: (lostCustomer) => this.onCustomerLost(lostCustomer),
    });
    this.customers.push(customer);
    this.refreshHud(`${customerType.name} 鐐逛簡 ${recipe.name}`);
  }

  private onTeaReady(recipe: RecipeConfig): void {
    const target = this.customers.find((customer) => customer.canReceive(recipe.id));
    if (!target) {
      this.refreshHud(`${recipe.name} 做好了，但当前没有匹配的客人`);
      return;
    }

    const income = target.markServed();
    this.saveData.coins += income;
    this.successfulServeStreak += 1;
    SaveManager.save(this.saveData);
    this.refreshHud(`浜や粯 ${recipe.name}锛屾敹鍏?+${income}`);
    this.removeCustomer(target, 0.8);
  }

  private onCustomerLost(customer: Customer): void {
    this.successfulServeStreak = 0;
    this.refreshHud('瀹汉绛夊お涔呮祦澶变簡');
    this.removeCustomer(customer, 0.8);
  }

  private removeCustomer(customer: Customer, delaySeconds: number): void {
    this.occupiedSeats.delete(customer.seatIndex);
    this.customers = this.customers.filter((item) => item !== customer);
    this.scheduleOnce(() => {
      if (customer.node && customer.node.isValid) {
        customer.node.destroy();
      }
    }, delaySeconds);
  }

  private findFreeSeatIndex(): number {
    const maxSeatCount = Math.min(this.saveData.unlockedSeatCount, this.seatNodes.length);
    for (let i = 0; i < maxSeatCount; i += 1) {
      if (!this.occupiedSeats.has(i)) {
        return i;
      }
    }
    return -1;
  }

  private pickCustomerType() {
    const availableTypes = CUSTOMER_TYPES.filter((item) => item.unlockLevel <= this.saveData.level);
    const totalWeight = availableTypes.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const type of availableTypes) {
      roll -= type.weight;
      if (roll <= 0) {
        return type;
      }
    }
    return availableTypes[0];
  }

  private pickRecipeForCustomer(allowedRecipeIds: RecipeId[]): RecipeConfig {
    const levelConfig = getLevelConfig(this.saveData.level);
    const availableRecipeIds = allowedRecipeIds.filter((id) => levelConfig.unlockedRecipeIds.includes(id));
    const recipeId = availableRecipeIds.length > 0
      ? availableRecipeIds[Math.floor(Math.random() * availableRecipeIds.length)]
      : levelConfig.unlockedRecipeIds[0];
    return getRecipe(recipeId as RecipeId);
  }

  private clearAllCustomers(): void {
    for (const customer of this.customers) {
      if (customer.node && customer.node.isValid) {
        customer.node.destroy();
      }
    }
    this.customers.length = 0;
    this.occupiedSeats.clear();
  }

  private refreshHud(message?: string): void {
    if (this.levelLabel) {
      this.levelLabel.string = `店铺 ${this.saveData.level} 级`;
    }

    if (this.coinsLabel) {
      this.coinsLabel.string = `閲戝竵 ${this.saveData.coins}`;
    }

    if (this.messageLabel && message) {
      this.messageLabel.string = message;
    }
  }
}
