import { _decorator, Button, Color, Component, Event, Label, Node, UIOpacity } from 'cc';
import { EventBus, GameEventName, RequestMakeRecipePayload } from './EventBus';
import { AdditiveId, buildRecipeId, TeaBaseId } from './GameConfig';

const { ccclass } = _decorator;

type BaseButtonEntry = {
  id: TeaBaseId;
  node: Node;
};

type AdditiveButtonEntry = {
  id: AdditiveId;
  node: Node;
};

const NORMAL_SCALE = 1;
const SELECTED_SCALE = 1.08;
const NORMAL_LABEL_COLOR = new Color(55, 35, 22, 255);
const SELECTED_LABEL_COLOR = new Color(116, 54, 18, 255);
const DISABLED_LABEL_COLOR = new Color(120, 105, 88, 255);

@ccclass('BrewPanel')
export class BrewPanel extends Component {
  private selectedBase: TeaBaseId | null = null;
  private selectedAdditive: AdditiveId = AdditiveId.None;
  private readonly baseButtons: BaseButtonEntry[] = [];
  private readonly additiveButtons: AdditiveButtonEntry[] = [];
  private brewButton: Node | null = null;

  onBaseSelected(event: Event, customEventData: string): void {
    this.selectBase(customEventData as TeaBaseId);
  }

  onAdditiveSelected(event: Event, customEventData: string): void {
    this.selectAdditive(customEventData as AdditiveId);
  }

  onBrewClicked(): void {
    this.checkAndBrew();
  }

  registerBaseButton(id: TeaBaseId, node: Node): void {
    this.baseButtons.push({ id, node });
    this.refreshSelectionView();
  }

  registerAdditiveButton(id: AdditiveId, node: Node): void {
    this.additiveButtons.push({ id, node });
    this.refreshSelectionView();
  }

  registerBrewButton(node: Node): void {
    this.brewButton = node;
    this.refreshSelectionView();
  }

  selectBase(base: TeaBaseId): void {
    this.selectedBase = base;
    this.selectedAdditive = AdditiveId.None;
    this.refreshSelectionView();
  }

  selectAdditive(additive: AdditiveId): void {
    if (!this.selectedBase) {
      EventBus.emit(GameEventName.HudMessage, { text: '先选择茶底，再选择辅料' });
      return;
    }

    this.selectedAdditive = this.selectedAdditive === additive
      ? AdditiveId.None
      : additive;
    this.refreshSelectionView();
  }

  private checkAndBrew(): void {
    if (!this.selectedBase) {
      EventBus.emit(GameEventName.HudMessage, { text: '先选择茶底，再点击冲泡' });
      return;
    }

    const payload: RequestMakeRecipePayload = {
      recipeId: buildRecipeId(this.selectedBase, this.selectedAdditive),
    };
    EventBus.emit(GameEventName.RequestMakeRecipe, payload);
    this.resetSelection();
  }

  private resetSelection(): void {
    this.selectedBase = null;
    this.selectedAdditive = AdditiveId.None;
    this.refreshSelectionView();
  }

  private refreshSelectionView(): void {
    for (const entry of this.baseButtons) {
      this.applyButtonState(entry.node, this.selectedBase === entry.id, true);
    }

    const additiveEnabled = !!this.selectedBase;
    for (const entry of this.additiveButtons) {
      this.applyButtonState(
        entry.node,
        additiveEnabled && this.selectedAdditive === entry.id,
        additiveEnabled,
      );
    }

    if (this.brewButton) {
      this.applyButtonState(this.brewButton, !!this.selectedBase, !!this.selectedBase);
    }
  }

  private applyButtonState(node: Node, selected: boolean, enabled: boolean): void {
    node.setScale(selected ? SELECTED_SCALE : NORMAL_SCALE, selected ? SELECTED_SCALE : NORMAL_SCALE, 1);
    const button = node.getComponent(Button);
    if (button) {
      button.interactable = enabled;
    }

    const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
    opacity.opacity = enabled ? 255 : 130;

    const label = this.findFirstLabel(node);
    if (label) {
      label.color = !enabled ? DISABLED_LABEL_COLOR : selected ? SELECTED_LABEL_COLOR : NORMAL_LABEL_COLOR;
    }
  }

  private findFirstLabel(node: Node): Label | null {
    const direct = node.getComponent(Label);
    if (direct) {
      return direct;
    }
    for (const child of node.children) {
      const childLabel = this.findFirstLabel(child);
      if (childLabel) {
        return childLabel;
      }
    }
    return null;
  }
}
