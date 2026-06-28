import { _decorator, Component, Label } from 'cc';
import { RecipeConfig } from './GameConfig';
import { SimpleProgressBar } from './SimpleProgressBar';

const { ccclass, property } = _decorator;

export interface TeaOrder {
  recipe: RecipeConfig;
  remainingSeconds: number;
}

@ccclass('Workstation')
export class Workstation extends Component {
  @property(Label)
  queueLabel: Label | null = null;

  @property(SimpleProgressBar)
  progressBar: SimpleProgressBar | null = null;

  queueLimit = 3;
  speedMultiplier = 1;
  stationLevel = 1;

  private queue: TeaOrder[] = [];
  private currentOrder: TeaOrder | null = null;
  private currentTotalSeconds = 0;
  private onTeaReadyCallback: ((recipe: RecipeConfig) => void) | null = null;
  private lastRenderedQueueText = '';
  private lastRenderedStationLevel = -1;
  private lastRenderedSpeedMultiplier = -1;
  private lastRenderedQueueLength = -1;
  private lastRenderedCurrentRecipeId = '';
  private lastRenderedRemainingSecond = -1;

  setTeaReadyCallback(callback: (recipe: RecipeConfig) => void): void {
    this.onTeaReadyCallback = callback;
  }

  setStationLevel(level: number, speedMultiplier: number): void {
    this.stationLevel = Math.max(1, Math.floor(level));
    this.speedMultiplier = Math.max(0.5, speedMultiplier);
    this.refreshView(true);
  }

  enqueue(recipe: RecipeConfig): boolean {
    const totalCount = this.queue.length + (this.currentOrder ? 1 : 0);
    if (totalCount >= this.queueLimit) {
      console.log('操作台队列已满');
      return false;
    }

    this.queue.push({
      recipe,
      remainingSeconds: recipe.makeSeconds,
    });
    this.tryStartNext();
    this.refreshView(true);
    return true;
  }

  update(deltaTime: number): void {
    if (!this.currentOrder) {
      this.tryStartNext();
      this.updateProgressBar();
      return;
    }

    this.currentOrder.remainingSeconds -= deltaTime * this.speedMultiplier;
    if (this.currentOrder.remainingSeconds <= 0) {
      const finishedRecipe = this.currentOrder.recipe;
      this.currentOrder = null;
      this.currentTotalSeconds = 0;
      this.onTeaReadyCallback?.(finishedRecipe);
      this.tryStartNext();
      this.refreshView(true);
      return;
    }

    this.updateProgressBar();
    const currentSecond = Math.max(0, Math.ceil(this.currentOrder.remainingSeconds));
    if (currentSecond !== this.lastRenderedRemainingSecond) {
      this.refreshView();
    }
  }

  getQueueCount(): number {
    return this.queue.length + (this.currentOrder ? 1 : 0);
  }

  isFull(): boolean {
    return this.getQueueCount() >= this.queueLimit;
  }

  clearQueue(): void {
    this.queue.length = 0;
    this.currentOrder = null;
    this.currentTotalSeconds = 0;
    this.refreshView(true);
  }

  private tryStartNext(): void {
    if (this.currentOrder || this.queue.length === 0) {
      return;
    }

    this.currentOrder = this.queue.shift() ?? null;
    this.currentTotalSeconds = this.currentOrder?.recipe.makeSeconds ?? 0;
    this.refreshView(true);
  }

  private refreshView(force = false): void {
    this.updateProgressBar();

    const currentRecipeId = this.currentOrder?.recipe.id ?? '';
    const remainingSecond = this.currentOrder ? Math.max(0, Math.ceil(this.currentOrder.remainingSeconds)) : -1;
    const shouldRefreshQueueLabel = force
      || this.stationLevel !== this.lastRenderedStationLevel
      || this.speedMultiplier !== this.lastRenderedSpeedMultiplier
      || this.queue.length !== this.lastRenderedQueueLength
      || currentRecipeId !== this.lastRenderedCurrentRecipeId
      || remainingSecond !== this.lastRenderedRemainingSecond;

    if (!shouldRefreshQueueLabel) {
      return;
    }

    const nextQueueText = this.buildQueueText();
    if (this.queueLabel && (force || nextQueueText !== this.lastRenderedQueueText)) {
      this.queueLabel.string = nextQueueText;
      this.lastRenderedQueueText = nextQueueText;
    }

    this.lastRenderedStationLevel = this.stationLevel;
    this.lastRenderedSpeedMultiplier = this.speedMultiplier;
    this.lastRenderedQueueLength = this.queue.length;
    this.lastRenderedCurrentRecipeId = currentRecipeId;
    this.lastRenderedRemainingSecond = remainingSecond;
  }

  private buildQueueText(): string {
    const currentName = this.currentOrder?.recipe.name ?? '空闲';
    const remainingText = this.currentOrder ? `｜剩${Math.max(0, Math.ceil(this.currentOrder.remainingSeconds))}秒` : '';
    return `制作台 Lv.${this.stationLevel}｜${currentName}${remainingText}\n速度×${this.speedMultiplier.toFixed(2)}｜排队 ${this.queue.length}/${this.queueLimit}`;
  }

  private updateProgressBar(): void {
    if (!this.progressBar) {
      return;
    }

    if (!this.currentOrder || this.currentTotalSeconds <= 0) {
      this.progressBar.progress = 0;
      return;
    }

    this.progressBar.progress = 1 - this.currentOrder.remainingSeconds / this.currentTotalSeconds;
  }
}
