import { _decorator, Component, Game, Label, Node, Prefab, Vec3, game, instantiate } from 'cc';
import { Customer } from './Customer';
import { EventBus, GameEventName } from './EventBus';
import { CUSTOMER_TYPES, getLevelConfig, getMaxDemoLevel, getRecipe, RecipeConfig, RecipeId } from './GameConfig';
import { SaveManager, GameSaveData } from './SaveManager';
import { SeatManager } from './SeatManager';
import { Workstation } from './Workstation';

const { ccclass, property } = _decorator;
const DEFAULT_SEAT_OFFSET = new Vec3(0, 45, 0);
const DEFAULT_CUSTOMER_POOL_SIZE = 6;

/** @deprecated 保留为旧场景兼容外壳；当前主流程请使用 AutoDemoGame。 */
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
  private readonly seatManager = new SeatManager();
  private customerPool: Node[] = [];
  private spawnTimer = 0;
  private successfulServeStreak = 0;

  onLoad(): void {
    game.on(Game.EVENT_HIDE, this.handleGameHide, this);
  }

  onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.handleGameHide, this);
    SaveManager.flushPendingSave();
  }

  start(): void {
    this.saveData = SaveManager.load();
    this.seatManager.setBindings(this.seatNodes);
    this.workstation?.setTeaReadyCallback((recipe) => this.onTeaReady(recipe));
    this.warmCustomerPool();
    this.spawnTimer = 1;
    this.refreshHud('欢迎来到桃源茶肆');
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
    this.makeRecipe(RecipeId.GreenTea);
  }

  makeBlackTea(): void {
    this.makeRecipe(RecipeId.BlackTea);
  }

  makeJasmineTea(): void {
    this.makeRecipe(RecipeId.JasmineTea);
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
    this.refreshHud('调试：已清空存档');
  }

  debugSpawnCustomer(): void {
    this.trySpawnCustomer(true);
  }

  private makeRecipe(recipeId: RecipeId): void {
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

    const seatIndex = this.seatManager.findFreeSeatIndex(this.saveData.unlockedSeatCount);
    if (seatIndex < 0) {
      return;
    }

    if (!this.customerRoot) {
      this.refreshHud('缺少 customerRoot 绑定');
      return;
    }

    const customerNode = this.obtainCustomerNode();
    this.customerRoot.addChild(customerNode);
    const seatNode = this.seatManager.getSeatNode(seatIndex);
    if (!seatNode) {
      this.recycleNode(customerNode);
      this.refreshHud('桌位节点缺失，无法安排客人');
      return;
    }
    customerNode.setWorldPosition(seatNode.worldPosition.clone().add(DEFAULT_SEAT_OFFSET));
    customerNode.active = true;

    const customer = customerNode.getComponent(Customer);
    if (!customer) {
      this.recycleNode(customerNode);
      this.refreshHud('客人节点缺少 Customer 组件');
      return;
    }

    const customerType = this.pickCustomerType();
    const recipe = this.pickRecipeForCustomer(customerType.allowedRecipeIds);
    this.seatManager.occupy(seatIndex);
    customer.init({
      recipe,
      customerName: customerType.name,
      spendMultiplier: customerType.spendMultiplier,
      patienceSeconds: customerType.patienceSeconds,
      seatIndex,
      onLost: (lostCustomer) => this.onCustomerLost(lostCustomer),
      onRecycle: (finishedCustomer) => this.recycleCustomer(finishedCustomer),
    });
    this.customers.push(customer);
    this.refreshHud(`${customerType.name} 点了 ${recipe.name}`);
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
    SaveManager.saveDeferred(this.saveData);
    this.refreshHud(`交付 ${recipe.name}，收入 +${income}`);
    this.removeCustomer(target, 0.8);
  }

  private onCustomerLost(customer: Customer): void {
    this.successfulServeStreak = 0;
    this.refreshHud('客人等太久流失了');
    this.removeCustomer(customer, 0.8);
  }

  private removeCustomer(customer: Customer, delaySeconds: number): void {
    this.seatManager.release(customer.seatIndex);
    this.customers = this.customers.filter((item) => item !== customer);
    this.scheduleOnce(() => {
      this.recycleCustomer(customer);
    }, delaySeconds);
  }

  private findFreeSeatIndex(): number {
    return this.seatManager.findFreeSeatIndex(this.saveData.unlockedSeatCount);
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
      this.recycleCustomer(customer);
    }
    this.customers.length = 0;
    this.seatManager.clearOccupancy();
  }

  private obtainCustomerNode(): Node {
    const pooledNode = this.customerPool.pop();
    if (pooledNode) {
      pooledNode.active = true;
      return pooledNode;
    }

    if (!this.customerPrefab) {
      throw new Error('缺少 customerPrefab 绑定');
    }

    const node = instantiate(this.customerPrefab);
    const customer = node.getComponent(Customer);
    customer?.resetForReuse();
    return node;
  }

  private recycleCustomer(customer: Customer): void {
    const node = customer.node;
    this.recycleNode(node, customer);
  }

  private recycleNode(node: Node, customer?: Customer | null): void {
    if (!node || !node.isValid) {
      return;
    }
    if (!node.active && !node.parent && this.customerPool.includes(node)) {
      return;
    }
    customer?.resetForReuse();
    node.removeFromParent();
    node.active = false;
    this.customerPool.push(node);
  }

  private warmCustomerPool(): void {
    if (!this.customerPrefab || !this.customerRoot) {
      return;
    }
    while (this.customerPool.length < DEFAULT_CUSTOMER_POOL_SIZE) {
      const node = instantiate(this.customerPrefab);
      const customer = node.getComponent(Customer);
      customer?.resetForReuse();
      node.active = false;
      this.customerPool.push(node);
    }
  }

  private handleGameHide(): void {
    SaveManager.flushPendingSave();
  }

  private refreshHud(message?: string): void {
    if (this.levelLabel) {
      this.levelLabel.string = `店铺 ${this.saveData.level} 级`;
    }

    if (this.coinsLabel) {
      this.coinsLabel.string = `金币 ${this.saveData.coins}`;
    }

    if (message) {
      EventBus.emit(GameEventName.HudMessage, message);
    }
  }
}
