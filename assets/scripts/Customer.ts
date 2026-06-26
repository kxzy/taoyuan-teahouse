import { _decorator, Color, Component, Label, Node, ProgressBar, Vec3 } from 'cc';
import { RecipeConfig } from './GameConfig';

const { ccclass, property } = _decorator;

export enum CustomerState {
  WalkingToSeat = 'WalkingToSeat',
  Waiting = 'Waiting',
  Served = 'Served',
  Leaving = 'Leaving',
  Lost = 'Lost',
}

@ccclass('Customer')
export class Customer extends Component {
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

  @property(ProgressBar)
  patienceBar: ProgressBar | null = null;

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
  private targetPosition: Vec3 | null = null;
  private exitPosition: Vec3 | null = null;

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
    this.state = this.targetPosition ? CustomerState.WalkingToSeat : CustomerState.Waiting;
    this.refreshView();
  }

  update(deltaTime: number): void {
    if (this.state === CustomerState.WalkingToSeat) {
      this.moveTowardTarget(deltaTime, this.targetPosition, () => {
        this.state = CustomerState.Waiting;
        this.refreshView();
      });
      return;
    }

    if (this.state === CustomerState.Leaving || this.state === CustomerState.Served) {
      this.moveTowardTarget(deltaTime, this.exitPosition, () => {
        if (this.node && this.node.isValid) {
          this.node.destroy();
        }
      });
      return;
    }

    if (this.state !== CustomerState.Waiting) {
      return;
    }

    this.remainingPatience -= deltaTime;
    if (this.remainingPatience <= 0) {
      this.remainingPatience = 0;
      this.state = CustomerState.Lost;
      this.refreshView();
      this.onLostCallback?.(this);
      return;
    }

    this.refreshView();
  }

  leave(): void {
    this.state = CustomerState.Leaving;
    this.refreshView();
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
      this.state = CustomerState.Served;
    }
    this.refreshView();
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

    const current = this.node.position.clone();
    const direction = target.clone().subtract(current);
    const distance = direction.length();
    const step = this.moveSpeed * deltaTime;

    if (distance <= step || distance <= 1) {
      this.node.setPosition(target);
      onArrive();
      return;
    }

    direction.normalize().multiplyScalar(step);
    this.node.setPosition(current.add(direction));
  }

  private refreshView(): void {
    const isUrgent = this.isUrgent();
    const isWaiting = this.state === CustomerState.Waiting;
    if (this.orderBubbleNode) {
      this.orderBubbleNode.active = this.state !== CustomerState.Leaving && this.state !== CustomerState.Served;
    }
    if (this.orderBubbleWarningNode) {
      this.orderBubbleWarningNode.active = isUrgent;
    }
    if (this.orderBubbleNormalNode) {
      this.orderBubbleNormalNode.active = !isUrgent;
    }

    if (this.orderLabel) {
      if (this.recipe) {
        if (this.state === CustomerState.Lost) {
          this.orderLabel.string = `${this.customerName}×${this.groupSize}\n等太久，生气离开`;
        } else if (this.state === CustomerState.WalkingToSeat) {
          const seatText = this.seatIndex >= 0 ? `${this.seatIndex + 1}桌` : '座位';
          this.orderLabel.string = `去${seatText}\n${this.recipe.name}×${this.remainingCups}\n点单中`;
        } else {
          const seatText = this.seatIndex >= 0 ? `${this.seatIndex + 1}桌` : '待入座';
          const urgency = isUrgent ? '🔥急' : `${seatText}`;
          const secondsText = Math.ceil(this.remainingPatience);
          const cupsText = `${this.getServedCups()}/${this.totalCups}`;
          this.orderLabel.string = `${urgency}\n${this.recipe.name}×${this.remainingCups}\n${secondsText}秒｜${cupsText}`;
        }
      } else {
        this.orderLabel.string = '';
      }

      this.orderLabel.color = isUrgent
        ? new Color(185, 48, 28, 255)
        : new Color(78, 42, 24, 255);
    }

    if (this.urgentBadgeLabel) {
      const showUrgentBadge = isUrgent && isWaiting;
      const badgeNode = this.urgentBadgeLabel.node.parent ?? this.urgentBadgeLabel.node;
      badgeNode.active = showUrgentBadge;
      this.urgentBadgeLabel.node.active = showUrgentBadge;
      this.urgentBadgeLabel.string = showUrgentBadge ? '急' : '';
    }

    if (this.patienceBar) {
      const ratio = this.getPatienceRatio();
      this.patienceBar.progress = ratio;
    }
  }
}
