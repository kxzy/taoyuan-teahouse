import { _decorator, Color, Component, Label, Node, Vec3 } from 'cc';
import { RecipeConfig } from './GameConfig';
import { SimpleProgressBar } from './SimpleProgressBar';

const { ccclass, property } = _decorator;

const CUSTOMER_URGENT_COLOR = new Color(185, 48, 28, 255);
const CUSTOMER_NORMAL_COLOR = new Color(78, 42, 24, 255);

export enum CustomerState {
  WalkingToSeat = 'WalkingToSeat',
  Waiting = 'Waiting',
  Served = 'Served',
  Leaving = 'Leaving',
  Lost = 'Lost',
}

@ccclass('Customer')
export class Customer extends Component {
  private static readonly TEMP_DIRECTION = new Vec3();
  private static readonly TEMP_POSITION = new Vec3();

  @property(Label)
  orderLabel: Label | null = null;

  @property(Label)
  urgentBadgeLabel: Label | null = null;

  @property(Node)
  orderBubbleNode: Node | null = null;

  @property(Node)
  orderBubbleWarningNode: Node | null = null;

  @property(Node)
  orderBubbleNormalNode: Node | null = null;

  @property(SimpleProgressBar)
  patienceBar: SimpleProgressBar | null = null;

  state: CustomerState = CustomerState.WalkingToSeat;
  recipe: RecipeConfig | null = null;
  customerName = '客人';
  groupSize = 1;
  totalCups = 1;
  remainingCups = 1;
  spendMultiplier = 1;
  patienceSeconds = 18;
  remainingPatience = 18;
  seatIndex = -1;
  moveSpeed = 280;

  private onLostCallback: ((customer: Customer) => void) | null = null;
  private onRecycleCallback: ((customer: Customer) => void) | null = null;
  private targetPosition: Vec3 | null = null;
  private exitPosition: Vec3 | null = null;
  private patienceDeadlineAt = 0;
  private lastRenderedState: CustomerState | null = null;
  private lastRenderedPatienceSecond = -1;
  private lastRenderedRemainingCups = -1;
  private lastRenderedServedCups = -1;
  private lastRenderedUrgent = false;
  private lastRenderedText = '';
  private lastRenderedColor = '';
  private lastRenderedBadgeVisible: boolean | null = null;
  private lastRenderedBubbleVisible: boolean | null = null;
  private lastRenderedWarningVisible: boolean | null = null;
  private lastRenderedNormalVisible: boolean | null = null;

  init(options: {
    recipe: RecipeConfig;
    customerName?: string;
    groupSize?: number;
    spendMultiplier: number;
    patienceSeconds: number;
    seatIndex: number;
    targetPosition?: Vec3;
    exitPosition?: Vec3;
    moveSpeed?: number;
    onLost: (customer: Customer) => void;
    onRecycle?: (customer: Customer) => void;
  }): void {
    this.recipe = options.recipe;
    this.customerName = options.customerName ?? '客人';
    this.groupSize = Math.max(1, Math.min(4, Math.floor(options.groupSize ?? 1)));
    this.totalCups = this.groupSize;
    this.remainingCups = this.groupSize;
    this.spendMultiplier = options.spendMultiplier;
    this.patienceSeconds = options.patienceSeconds;
    this.remainingPatience = options.patienceSeconds;
    this.seatIndex = options.seatIndex;
    this.targetPosition = options.targetPosition?.clone() ?? null;
    this.exitPosition = options.exitPosition?.clone() ?? null;
    this.moveSpeed = options.moveSpeed ?? this.moveSpeed;
    this.onLostCallback = options.onLost;
    this.onRecycleCallback = options.onRecycle ?? null;
    this.state = this.targetPosition ? CustomerState.WalkingToSeat : CustomerState.Waiting;
    this.patienceDeadlineAt = this.state === CustomerState.Waiting
      ? Date.now() + this.patienceSeconds * 1000
      : 0;
    this.node.active = true;
    this.resetRenderCache();
    this.refreshView(true);
  }

  resetForReuse(): void {
    this.recipe = null;
    this.customerName = '客人';
    this.groupSize = 1;
    this.totalCups = 1;
    this.remainingCups = 1;
    this.spendMultiplier = 1;
    this.patienceSeconds = 18;
    this.remainingPatience = 18;
    this.seatIndex = -1;
    this.moveSpeed = 280;
    this.state = CustomerState.WalkingToSeat;
    this.onLostCallback = null;
    this.onRecycleCallback = null;
    this.targetPosition = null;
    this.exitPosition = null;
    this.patienceDeadlineAt = 0;
    this.node.active = false;
    this.resetRenderCache();
    this.applyBubbleState(false, false, false, true);
    this.updateUrgentBadge(false, true);
    this.updateOrderLabel('', 'normal', true);
    if (this.patienceBar) {
      this.patienceBar.progress = 0;
    }
  }

  update(deltaTime: number): void {
    if (this.state === CustomerState.WalkingToSeat) {
      this.moveTowardTarget(deltaTime, this.targetPosition, () => {
        this.beginWaiting();
        this.refreshView(true);
      });
      return;
    }

    if (this.state === CustomerState.Leaving || this.state === CustomerState.Served) {
      this.moveTowardTarget(deltaTime, this.exitPosition, () => {
        this.onRecycleCallback?.(this);
      });
      return;
    }

    if (this.state !== CustomerState.Waiting) {
      return;
    }

    this.syncRemainingPatience();
    if (this.remainingPatience <= 0) {
      this.remainingPatience = 0;
      this.patienceDeadlineAt = 0;
      this.state = CustomerState.Lost;
      this.refreshView(true);
      this.onLostCallback?.(this);
      return;
    }

    this.updatePatienceBar();
    const currentSecond = Math.ceil(this.remainingPatience);
    const urgent = this.isUrgent();
    if (currentSecond !== this.lastRenderedPatienceSecond || urgent !== this.lastRenderedUrgent) {
      this.refreshView();
    }
  }

  leave(): void {
    this.patienceDeadlineAt = 0;
    this.state = CustomerState.Leaving;
    this.refreshView(true);
  }

  canReceive(recipeId: string): boolean {
    return this.state === CustomerState.Waiting && this.recipe?.id === recipeId && this.remainingCups > 0;
  }

  markServed(): number {
    if (!this.recipe || this.remainingCups <= 0) {
      return 0;
    }

    this.remainingCups = Math.max(0, this.remainingCups - 1);
    if (this.remainingCups <= 0) {
      this.patienceDeadlineAt = 0;
      this.state = CustomerState.Served;
    }
    this.refreshView(true);
    return Math.floor(this.recipe.price * this.spendMultiplier);
  }

  isOrderComplete(): boolean {
    return this.remainingCups <= 0 || this.state === CustomerState.Served;
  }

  getPatienceRatio(): number {
    return this.patienceSeconds <= 0 ? 0 : this.remainingPatience / this.patienceSeconds;
  }

  isUrgent(): boolean {
    return this.state === CustomerState.Waiting && this.remainingPatience <= Math.min(7, this.patienceSeconds * 0.35);
  }

  getServedCups(): number {
    return this.totalCups - this.remainingCups;
  }

  private moveTowardTarget(deltaTime: number, target: Vec3 | null, onArrive: () => void): void {
    if (!target) {
      onArrive();
      return;
    }

    const current = this.node.position;
    Vec3.subtract(Customer.TEMP_DIRECTION, target, current);
    const distance = Customer.TEMP_DIRECTION.length();
    const step = this.moveSpeed * deltaTime;

    if (distance <= step || distance <= 1) {
      this.node.setPosition(target);
      onArrive();
      return;
    }

    Customer.TEMP_DIRECTION.normalize().multiplyScalar(step);
    Vec3.add(Customer.TEMP_POSITION, current, Customer.TEMP_DIRECTION);
    this.node.setPosition(Customer.TEMP_POSITION);
  }

  private beginWaiting(): void {
    this.state = CustomerState.Waiting;
    this.patienceDeadlineAt = Date.now() + this.patienceSeconds * 1000;
    this.syncRemainingPatience();
  }

  private syncRemainingPatience(): void {
    if (this.state !== CustomerState.Waiting) {
      return;
    }

    if (this.patienceDeadlineAt <= 0) {
      this.patienceDeadlineAt = Date.now() + this.remainingPatience * 1000;
    }

    this.remainingPatience = Math.max(0, (this.patienceDeadlineAt - Date.now()) / 1000);
  }

  private refreshView(force = false): void {
    const isUrgent = this.isUrgent();
    const isWaiting = this.state === CustomerState.Waiting;
    const bubbleVisible = this.state !== CustomerState.Leaving && this.state !== CustomerState.Served;

    this.applyBubbleState(bubbleVisible, isUrgent, !isUrgent, force);
    this.updateUrgentBadge(isUrgent && isWaiting, force);
    this.updatePatienceBar();

    if (!force && !this.shouldRefreshOrderLabel(isUrgent)) {
      return;
    }

    const text = this.buildOrderText(isUrgent);
    this.updateOrderLabel(text, isUrgent ? 'urgent' : 'normal', force);
    this.lastRenderedState = this.state;
    this.lastRenderedPatienceSecond = Math.ceil(this.remainingPatience);
    this.lastRenderedRemainingCups = this.remainingCups;
    this.lastRenderedServedCups = this.getServedCups();
    this.lastRenderedUrgent = isUrgent;
  }

  private shouldRefreshOrderLabel(isUrgent: boolean): boolean {
    return this.state !== this.lastRenderedState
      || this.remainingCups !== this.lastRenderedRemainingCups
      || this.getServedCups() !== this.lastRenderedServedCups
      || Math.ceil(this.remainingPatience) !== this.lastRenderedPatienceSecond
      || isUrgent !== this.lastRenderedUrgent;
  }

  private buildOrderText(isUrgent: boolean): string {
    if (!this.recipe) {
      return '';
    }

    if (this.state === CustomerState.Lost) {
      return `${this.customerName}×${this.groupSize}\n等太久，生气离开`;
    }

    if (this.state === CustomerState.WalkingToSeat) {
      const seatText = this.seatIndex >= 0 ? `${this.seatIndex + 1}桌` : '座位';
      return `去${seatText}\n${this.recipe.name}×${this.remainingCups}\n点单中`;
    }

    const seatText = this.seatIndex >= 0 ? `${this.seatIndex + 1}桌` : '待入座';
    const urgency = isUrgent ? '🔥急' : seatText;
    const secondsText = Math.max(0, Math.ceil(this.remainingPatience));
    const cupsText = `${this.getServedCups()}/${this.totalCups}`;
    return `${urgency}\n${this.recipe.name}×${this.remainingCups}\n${secondsText}秒｜${cupsText}`;
  }

  private applyBubbleState(bubbleVisible: boolean, warningVisible: boolean, normalVisible: boolean, force: boolean): void {
    if (this.orderBubbleNode && (force || this.lastRenderedBubbleVisible !== bubbleVisible)) {
      this.orderBubbleNode.active = bubbleVisible;
      this.lastRenderedBubbleVisible = bubbleVisible;
    }
    if (this.orderBubbleWarningNode && (force || this.lastRenderedWarningVisible !== warningVisible)) {
      this.orderBubbleWarningNode.active = warningVisible;
      this.lastRenderedWarningVisible = warningVisible;
    }
    if (this.orderBubbleNormalNode && (force || this.lastRenderedNormalVisible !== normalVisible)) {
      this.orderBubbleNormalNode.active = normalVisible;
      this.lastRenderedNormalVisible = normalVisible;
    }
  }

  private updateUrgentBadge(showUrgentBadge: boolean, force: boolean): void {
    if (!this.urgentBadgeLabel) {
      return;
    }

    const badgeNode = this.urgentBadgeLabel.node.parent ?? this.urgentBadgeLabel.node;
    if (force || this.lastRenderedBadgeVisible !== showUrgentBadge) {
      badgeNode.active = showUrgentBadge;
      this.urgentBadgeLabel.node.active = showUrgentBadge;
      this.urgentBadgeLabel.string = showUrgentBadge ? '急' : '';
      this.lastRenderedBadgeVisible = showUrgentBadge;
    }
  }

  private updateOrderLabel(text: string, colorKey: 'urgent' | 'normal', force: boolean): void {
    if (!this.orderLabel) {
      return;
    }

    if (force || this.lastRenderedText !== text) {
      this.orderLabel.string = text;
      this.lastRenderedText = text;
    }

    if (force || this.lastRenderedColor !== colorKey) {
      this.orderLabel.color = colorKey === 'urgent' ? CUSTOMER_URGENT_COLOR : CUSTOMER_NORMAL_COLOR;
      this.lastRenderedColor = colorKey;
    }
  }

  private updatePatienceBar(): void {
    if (this.patienceBar) {
      this.patienceBar.progress = this.getPatienceRatio();
    }
  }

  private resetRenderCache(): void {
    this.lastRenderedState = null;
    this.lastRenderedPatienceSecond = -1;
    this.lastRenderedRemainingCups = -1;
    this.lastRenderedServedCups = -1;
    this.lastRenderedUrgent = false;
    this.lastRenderedText = '';
    this.lastRenderedColor = '';
    this.lastRenderedBadgeVisible = null;
    this.lastRenderedBubbleVisible = null;
    this.lastRenderedWarningVisible = null;
    this.lastRenderedNormalVisible = null;
  }
}
