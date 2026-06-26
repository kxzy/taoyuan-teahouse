import { _decorator, Component, Label, ProgressBar } from 'cc';
import { RecipeConfig } from './GameConfig';

const { ccclass, property } = _decorator;

export interface TeaOrder {
  recipe: RecipeConfig;
  remainingSeconds: number;
}

@ccclass('Workstation')
export class Workstation extends Component {
  @property(Label)
  queueLabel: Label | null = null;

  @property(ProgressBar)
  progressBar: ProgressBar | null = null;

  queueLimit = 3;
  speedMultiplier = 1;
  stationLevel = 1;

  private queue: TeaOrder[] = [];
  private currentOrder: TeaOrder | null = null;
  private currentTotalSeconds = 0;
  private onTeaReadyCallback: ((recipe: RecipeConfig) => void) | null = null;

  setTeaReadyCallback(callback: (recipe: RecipeConfig) => void): void {
    this.onTeaReadyCallback = callback;
  }

  setStationLevel(level: number, speedMultiplier: number): void {
    this.stationLevel = Math.max(1, Math.floor(level));
    this.speedMultiplier = Math.max(0.5, speedMultiplier);
    this.refreshView();
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
    this.refreshView();
    return true;
  }

  update(deltaTime: number): void {
    if (!this.currentOrder) {
      this.tryStartNext();
      return;
    }

    this.currentOrder.remainingSeconds -= deltaTime * this.speedMultiplier;
    if (this.currentOrder.remainingSeconds <= 0) {
      const finishedRecipe = this.currentOrder.recipe;
      this.currentOrder = null;
      this.currentTotalSeconds = 0;
      this.onTeaReadyCallback?.(finishedRecipe);
      this.tryStartNext();
    }

    this.refreshView();
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
    this.refreshView();
  }

  private tryStartNext(): void {
    if (this.currentOrder || this.queue.length === 0) {
      return;
    }

    this.currentOrder = this.queue.shift() ?? null;
    this.currentTotalSeconds = this.currentOrder?.recipe.makeSeconds ?? 0;
  }

  private refreshView(): void {
    if (this.queueLabel) {
      const currentName = this.currentOrder?.recipe.name ?? '空闲';
      const remainingText = this.currentOrder ? `｜剩${Math.max(0, Math.ceil(this.currentOrder.remainingSeconds))}秒` : '';
      this.queueLabel.string = `制作台 Lv.${this.stationLevel}｜${currentName}${remainingText}\n速度×${this.speedMultiplier.toFixed(2)}｜排队 ${this.queue.length}/${this.queueLimit}`;
    }

    if (this.progressBar) {
      if (!this.currentOrder || this.currentTotalSeconds <= 0) {
        this.progressBar.progress = 0;
      } else {
        this.progressBar.progress = 1 - this.currentOrder.remainingSeconds / this.currentTotalSeconds;
      }
    }
  }
}
