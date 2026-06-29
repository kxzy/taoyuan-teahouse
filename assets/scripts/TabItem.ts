import { _decorator, Color, Component, Label, Sprite } from 'cc';
import type { TabData } from './NavigationBar';

const { ccclass, property } = _decorator;

const ACTIVE_LABEL_COLOR = new Color(76, 50, 30, 255);
const INACTIVE_LABEL_COLOR = new Color(165, 152, 134, 255);

@ccclass('TabItem')
export class TabItem extends Component {
  @property(Sprite)
  iconSprite: Sprite | null = null;

  @property(Label)
  nameLabel: Label | null = null;

  private data: TabData | null = null;

  get id(): string {
    return this.data?.id ?? '';
  }

  init(data: TabData): void {
    this.data = data;
    this.setName(data.name);
    this.setActive(false);
  }

  setName(_name: string): void {
    if (this.nameLabel) {
      // Navigation button images already include their text.
      this.nameLabel.string = '';
      this.nameLabel.node.active = false;
    }
  }

  setActive(isActive: boolean): void {
    if (this.iconSprite && this.data) {
      const nextFrame = isActive
        ? this.data.activeIcon ?? this.data.normalIcon
        : this.data.normalIcon;

      if (nextFrame) {
        this.iconSprite.spriteFrame = nextFrame;
      }
    }

    if (this.nameLabel && this.nameLabel.node.active) {
      this.nameLabel.color = isActive ? ACTIVE_LABEL_COLOR : INACTIVE_LABEL_COLOR;
    }
  }
}
