import { _decorator, Component, Node, UITransform, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SimpleProgressBar')
export class SimpleProgressBar extends Component {
  @property(Node)
  fillNode: Node | null = null;

  private _progress = 0;
  private fillWidth = 0;

  onLoad(): void {
    this.cacheFillWidth();
    this.applyProgress();
  }

  get progress(): number {
    return this._progress;
  }

  set progress(value: number) {
    const next = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    if (next === this._progress) {
      return;
    }
    this._progress = next;
    this.applyProgress();
  }

  private cacheFillWidth(): void {
    if (!this.fillNode) {
      this.fillWidth = 0;
      return;
    }
    const transform = this.fillNode.getComponent(UITransform);
    this.fillWidth = transform?.contentSize.width ?? 0;
  }

  private applyProgress(): void {
    if (!this.fillNode) {
      return;
    }
    if (this.fillWidth <= 0) {
      this.cacheFillWidth();
    }
    const width = this.fillWidth;
    this.fillNode.setScale(this._progress, 1, 1);
    this.fillNode.setPosition(new Vec3(-(width * (1 - this._progress)) / 2, 0, 0));
  }
}
