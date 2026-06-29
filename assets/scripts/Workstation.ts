import { _decorator, Component, Label } from 'cc';
import { EventBus, GameEventName, WorkstationQteStatePayload } from './EventBus';
import { RecipeConfig } from './GameConfig';
import { SimpleProgressBar } from './SimpleProgressBar';

const { ccclass, property } = _decorator;

export interface TeaOrder {
  recipe: RecipeConfig;
  remainingSeconds: number;
}

export interface TeaReadyResult {
  recipe: RecipeConfig;
  quality: 'normal' | 'perfect';
  manualTriggered: boolean;
}

@ccclass('Workstation')
export class Workstation extends Component {
  private static readonly MANUAL_FINISH_COOLDOWN_MS = 200;

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
  private onTeaReadyCallback: ((result: TeaReadyResult) => void) | null = null;
  private currentOrderLastUpdatedAt = 0;
  private lastManualFinishAt = 0;
  private lastRenderedQueueText = '';
  private lastRenderedStationLevel = -1;
  private lastRenderedSpeedMultiplier = -1;
  private lastRenderedQueueLength = -1;
  private lastRenderedCurrentRecipeId = '';
  private lastRenderedRemainingSecond = -1;
  private qteWindowActive = false;

  private static readonly PERFECT_WINDOW_START = 0.8;
  private static readonly PERFECT_WINDOW_END = 0.95;

  setTeaReadyCallback(callback: (result: TeaReadyResult) => void): void {
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

    const prevProgress = this.getCurrentProgress();
    this.advanceCurrentOrder(Date.now());
    const progress = this.getCurrentProgress();
    const skippedPerfectWindow = prevProgress < Workstation.PERFECT_WINDOW_START
      && progress >= Workstation.PERFECT_WINDOW_END;
    if (skippedPerfectWindow) {
      this.syncQteWindow(progress, true, true);
    } else {
      this.syncQteWindow(progress);
    }

    if (progress >= Workstation.PERFECT_WINDOW_END) {
      this.finishCurrentOrder('normal', false);
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
    this.currentOrderLastUpdatedAt = 0;
    this.syncQteWindow(0, true);
    this.refreshView(true);
  }

  manualFinishTea(): TeaReadyResult | null {
    const now = Date.now();
    if (now - this.lastManualFinishAt < Workstation.MANUAL_FINISH_COOLDOWN_MS) {
      return null;
    }

    if (!this.currentOrder) {
      return null;
    }

    this.advanceCurrentOrder(now);
    const progress = this.getCurrentProgress();
    if (progress < Workstation.PERFECT_WINDOW_START) {
      return null;
    }

    this.lastManualFinishAt = now;
    const quality = progress <= Workstation.PERFECT_WINDOW_END ? 'perfect' : 'normal';
    return this.finishCurrentOrder(quality, true);
  }

  private tryStartNext(): void {
    if (this.currentOrder || this.queue.length === 0) {
      return;
    }

    this.currentOrder = this.queue.shift() ?? null;
    this.currentTotalSeconds = this.currentOrder?.recipe.makeSeconds ?? 0;
    this.currentOrderLastUpdatedAt = Date.now();
    this.syncQteWindow(0, true);
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

  private finishCurrentOrder(quality: 'normal' | 'perfect', manualTriggered: boolean): TeaReadyResult | null {
    if (!this.currentOrder) {
      return null;
    }

    const result: TeaReadyResult = {
      recipe: this.currentOrder.recipe,
      quality,
      manualTriggered,
    };

    this.currentOrder = null;
    this.currentTotalSeconds = 0;
    this.currentOrderLastUpdatedAt = 0;
    this.syncQteWindow(0, true);
    this.onTeaReadyCallback?.(result);
    this.tryStartNext();
    this.refreshView(true);
    return result;
  }

  private getCurrentProgress(): number {
    if (!this.currentOrder || this.currentTotalSeconds <= 0) {
      return 0;
    }
    const progress = 1 - this.currentOrder.remainingSeconds / this.currentTotalSeconds;
    return Math.max(0, Math.min(1, progress));
  }

  private advanceCurrentOrder(now: number): void {
    if (!this.currentOrder) {
      this.currentOrderLastUpdatedAt = 0;
      return;
    }

    if (this.currentOrderLastUpdatedAt <= 0) {
      this.currentOrderLastUpdatedAt = now;
      return;
    }

    const elapsedSeconds = Math.max(0, (now - this.currentOrderLastUpdatedAt) / 1000);
    if (elapsedSeconds <= 0) {
      return;
    }

    this.currentOrder.remainingSeconds = Math.max(
      0,
      this.currentOrder.remainingSeconds - elapsedSeconds * this.speedMultiplier,
    );
    this.currentOrderLastUpdatedAt = now;
  }

  private syncQteWindow(progress: number, forceInactive = false, forceEmit = false): void {
    const nextActive = !forceInactive
      && !!this.currentOrder
      && progress >= Workstation.PERFECT_WINDOW_START
      && progress < Workstation.PERFECT_WINDOW_END;

    if (nextActive === this.qteWindowActive && !forceEmit) {
      return;
    }

    this.qteWindowActive = nextActive;
    const payload: WorkstationQteStatePayload = {
      active: nextActive,
      progress,
      windowStart: Workstation.PERFECT_WINDOW_START,
      windowEnd: Workstation.PERFECT_WINDOW_END,
      recipeName: this.currentOrder?.recipe.name,
    };
    EventBus.emit(GameEventName.WorkstationQteState, payload);
  }
}
