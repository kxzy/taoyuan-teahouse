import { _decorator, BlockInputEvents, Button, Color, Component, Graphics, Label, Node, UITransform, Widget } from 'cc';
import { CollectionViewModel, EventBus, GameEventName, HudViewModel, MainTabId, OfflineRewardSummary, PrimaryActionId, ResearchResultSummary, SupplyItemId, SupplyShopViewModel, UnlockSummary } from './EventBus';
import { RecipeId } from './GameConfig';

const { ccclass, property } = _decorator;
const UI_ROOT_WIDTH = 720;
const UI_ROOT_HEIGHT = 1280;

@ccclass('UIManager')
export class UIManager extends Component {
  @property(Label)
  levelLabel: Label | null = null;

  @property(Label)
  coinsLabel: Label | null = null;

  @property(Label)
  messageLabel: Label | null = null;

  @property(Label)
  goalLabel: Label | null = null;

  @property(Label)
  ingredientLabel: Label | null = null;

  @property(Label)
  actionHintLabel: Label | null = null;

  @property(Label)
  urgentAlertLabel: Label | null = null;

  @property(Label)
  readyTeaLabel: Label | null = null;

  private popupMask: Node | null = null;
  private popupPanel: Node | null = null;
  private popupTitleLabel: Label | null = null;
  private popupBodyLabel: Label | null = null;
  private popupConfirmButton: Node | null = null;
  private popupConfirmLabel: Label | null = null;
  private popupCloseHandler: (() => void) | null = null;
  private popupQueue: Array<{ title: string; body: string; confirmText: string }> = [];
  private supplyMask: Node | null = null;
  private supplyCoinsLabel: Label | null = null;
  private supplyMessageLabel: Label | null = null;
  private supplyButtonLabels: Partial<Record<SupplyItemId, Label>> = {};
  private collectionPanel: Node | null = null;
  private collectionSummaryLabel: Label | null = null;
  private collectionListLabel: Label | null = null;
  private recipeButtonLabels: Partial<Record<RecipeId, Label>> = {};
  private primaryButtonLabels: Partial<Record<'upgrade' | 'supply' | 'nextDay' | 'extend', Label>> = {};
  private mainTabLabels: Partial<Record<MainTabId, Label>> = {};

  private lastLevelText = '';
  private lastCoinsText = '';
  private lastMessageText = '';
  private lastGoalText = '';
  private lastIngredientText = '';
  private lastActionHintText = '';
  private lastUrgentAlertText = '';
  private lastReadyTeaText = '';
  private lastRecipeButtonTexts: Partial<Record<RecipeId, string>> = {};
  private lastPrimaryButtonTexts: Partial<Record<'upgrade' | 'supply' | 'nextDay' | 'extend', string>> = {};
  private lastMainTabTexts: Partial<Record<MainTabId, string>> = {};

  onLoad(): void {
    this.ensureRootTransform();
    this.buildPopupLayer();
    this.buildSupplyShopLayer();
    this.buildCollectionPanel();
    EventBus.on(GameEventName.HudMessage, this.handleHudMessageEvent);
    EventBus.on(GameEventName.HudViewModel, this.handleHudViewModelEvent);
    EventBus.on(GameEventName.PopupOfflineReward, this.handleOfflineRewardPopupEvent);
    EventBus.on(GameEventName.PopupUpgradeUnlock, this.handleUpgradeUnlockPopupEvent);
    EventBus.on(GameEventName.PopupResearchResult, this.handleResearchResultPopupEvent);
    EventBus.on(GameEventName.SupplyShopViewModel, this.handleSupplyShopViewModelEvent);
    EventBus.on(GameEventName.CollectionViewModel, this.handleCollectionViewModelEvent);
  }

  onDestroy(): void {
    EventBus.off(GameEventName.HudMessage, this.handleHudMessageEvent);
    EventBus.off(GameEventName.HudViewModel, this.handleHudViewModelEvent);
    EventBus.off(GameEventName.PopupOfflineReward, this.handleOfflineRewardPopupEvent);
    EventBus.off(GameEventName.PopupUpgradeUnlock, this.handleUpgradeUnlockPopupEvent);
    EventBus.off(GameEventName.PopupResearchResult, this.handleResearchResultPopupEvent);
    EventBus.off(GameEventName.SupplyShopViewModel, this.handleSupplyShopViewModelEvent);
    EventBus.off(GameEventName.CollectionViewModel, this.handleCollectionViewModelEvent);
    this.detachPopupCloseHandler();
  }

  bindRecipeButtonLabel(recipeId: RecipeId, label: Label | null): void {
    if (!this.recipeButtonLabels) {
      this.recipeButtonLabels = {};
    }
    if (label) {
      this.recipeButtonLabels[recipeId] = label;
    }
  }

  bindPrimaryButtonLabel(buttonId: 'upgrade' | 'supply' | 'nextDay' | 'extend', label: Label | null): void {
    if (label) {
      this.primaryButtonLabels[buttonId] = label;
    }
  }

  bindMainTabLabel(tabId: MainTabId, label: Label | null): void {
    if (label) {
      this.mainTabLabels[tabId] = label;
    }
  }

  requestMakeRecipe(recipeId: RecipeId): void {
    EventBus.emit(GameEventName.RequestMakeRecipe, recipeId);
  }

  requestPrimaryAction(actionId: PrimaryActionId): void {
    EventBus.emit(GameEventName.RequestPrimaryAction, actionId);
  }

  requestSwitchMainTab(tabId: MainTabId): void {
    EventBus.emit(GameEventName.RequestSwitchMainTab, tabId);
  }

  private ensureRootTransform(): void {
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(UI_ROOT_WIDTH, UI_ROOT_HEIGHT);
  }

  private readonly handleHudMessageEvent = (message: string) => {
    this.updateLabel(this.messageLabel, message, this.lastMessageText, (next) => {
      this.lastMessageText = next;
      if (this.messageLabel) {
        this.messageLabel.fontSize = 12;
      }
    });
  };

  private readonly handleHudViewModelEvent = (viewModel: HudViewModel) => {
    this.updateLabel(this.levelLabel, viewModel.levelText, this.lastLevelText, (next) => {
      this.lastLevelText = next;
      if (this.levelLabel) {
        this.levelLabel.fontSize = 15;
      }
    });
    this.updateLabel(this.coinsLabel, viewModel.coinsText, this.lastCoinsText, (next) => {
      this.lastCoinsText = next;
      if (this.coinsLabel) {
        this.coinsLabel.fontSize = 18;
      }
    });
    this.updateLabel(this.goalLabel, viewModel.goalText, this.lastGoalText, (next) => {
      this.lastGoalText = next;
    });
    this.updateLabel(this.ingredientLabel, viewModel.ingredientText, this.lastIngredientText, (next) => {
      this.lastIngredientText = next;
    });
    this.updateLabel(this.actionHintLabel, viewModel.actionHintText, this.lastActionHintText, (next) => {
      this.lastActionHintText = next;
    });
    this.updateLabel(this.urgentAlertLabel, viewModel.urgentAlertText, this.lastUrgentAlertText, (next) => {
      this.lastUrgentAlertText = next;
    });
    this.updateLabel(this.readyTeaLabel, viewModel.readyTeaText, this.lastReadyTeaText, (next) => {
      this.lastReadyTeaText = next;
    });

    (Object.keys(viewModel.recipeButtonTexts) as RecipeId[]).forEach((recipeId) => {
      const nextText = viewModel.recipeButtonTexts[recipeId] ?? '';
      const label = this.recipeButtonLabels[recipeId] ?? null;
      const previousText = this.lastRecipeButtonTexts[recipeId] ?? '';
      this.updateLabel(label, nextText, previousText, (next) => {
        this.lastRecipeButtonTexts[recipeId] = next;
      });
    });

    (Object.keys(viewModel.primaryButtonTexts) as Array<'upgrade' | 'supply' | 'nextDay' | 'extend'>).forEach((buttonId) => {
      const nextText = viewModel.primaryButtonTexts[buttonId] ?? '';
      const label = this.primaryButtonLabels[buttonId] ?? null;
      const previousText = this.lastPrimaryButtonTexts[buttonId] ?? '';
      this.updateLabel(label, nextText, previousText, (next) => {
        this.lastPrimaryButtonTexts[buttonId] = next;
      });
    });

    (Object.keys(viewModel.mainTabTexts) as MainTabId[]).forEach((tabId) => {
      const nextText = viewModel.mainTabTexts[tabId] ?? '';
      const label = this.mainTabLabels[tabId] ?? null;
      const previousText = this.lastMainTabTexts[tabId] ?? '';
      this.updateLabel(label, nextText, previousText, (next) => {
        this.lastMainTabTexts[tabId] = next;
      });
    });
  };

  private readonly handleOfflineRewardPopupEvent = (summary: OfflineRewardSummary) => {
    const lines = [
      `离线时长：${Math.max(1, Math.floor(summary.idleSeconds / 60))} 分钟`,
      `金币 +${summary.coins}`,
      `茶叶 +${summary.teaLeaf}｜糖 +${summary.sugar}｜花 +${summary.flower}｜果 +${summary.fruit}`,
      '继续营业，看看今天能把茶肆冲到什么评级。',
    ];
    this.showPopup('离线收益', lines.join('\n'), '开始营业');
  };

  private readonly handleUpgradeUnlockPopupEvent = (summary: UnlockSummary) => {
    const lines = [
      `店铺升至 Lv.${summary.level}`,
      `桌位：开放 ${summary.seatCount} 张`,
      summary.unlockText,
      summary.newRecipes.length > 0 ? `新茶饮：${summary.newRecipes.join('、')}` : '本级暂无新茶饮',
    ];
    if (summary.workstationText) {
      lines.push(summary.workstationText);
    }
    if (summary.staffText) {
      lines.push(summary.staffText);
    }
    lines.push('继续经营，试试新节奏。');
    this.showPopup('升级解锁', lines.join('\n'), '继续营业');
  };

  private readonly handleResearchResultPopupEvent = (summary: ResearchResultSummary) => {
    const lines = [
      `研发成功：${summary.tier}｜${summary.name}`,
      `售价：${summary.price}`,
      `味 ${summary.taste}｜香 ${summary.aroma}`,
      `人气 ${summary.popularity}｜稀有 ${summary.rarity}`,
      '记得把新茶加入经营节奏，看看它能不能成为招牌。',
    ];
    this.showPopup('新茶谱问世', lines.join('\n'), '收下茶谱');
  };

  private readonly handleSupplyShopViewModelEvent = (viewModel: SupplyShopViewModel) => {
    if (!this.supplyMask) {
      return;
    }
    this.supplyMask.active = viewModel.active;
    if (!viewModel.active) {
      return;
    }
    this.supplyMask.setSiblingIndex(25000);
    if (this.supplyCoinsLabel) {
      this.supplyCoinsLabel.string = `当前金币：${viewModel.coins}｜今日采购 ${viewModel.dailyPurchaseCount} 次`;
    }
    if (this.supplyMessageLabel) {
      this.supplyMessageLabel.string = viewModel.messageText ?? '选择要补充的原料。';
    }
    for (const item of viewModel.items) {
      const label = this.supplyButtonLabels[item.id];
      if (!label) {
        continue;
      }
      const marker = item.highlighted ? '急需｜' : '';
      label.string = `${marker}${item.name}\n库存 ${item.stock}  +${item.amount}\n价格 ${item.price} 金`;
    }
  };

  private readonly handleCollectionViewModelEvent = (viewModel: CollectionViewModel) => {
    if (!this.collectionPanel) {
      return;
    }
    this.collectionPanel.active = viewModel.active;
    if (!viewModel.active) {
      return;
    }
    this.collectionPanel.setSiblingIndex(20000);
    if (this.collectionSummaryLabel) {
      const recentText = viewModel.recentUnlockText ? `｜最近：${viewModel.recentUnlockText}` : '';
      this.collectionSummaryLabel.string = `已解锁 ${viewModel.unlockedCount}/${viewModel.totalCount}${recentText}`;
    }
    if (this.collectionListLabel) {
      const lines = viewModel.recipes
        .map((recipe, index) => `${index + 1}. ${recipe.unlocked ? recipe.name : '未解锁茶谱'}｜${recipe.description}`);
      if (viewModel.recipes.length < viewModel.totalCount) {
        lines.push(`还有 ${viewModel.totalCount - viewModel.recipes.length} 条茶谱待展开`);
      }
      this.collectionListLabel.string = lines.join('\n');
    }
  };

  private drawRoundPanel(node: Node, width: number, height: number, color: Color, radius = 18): void {
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = color;
    graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    graphics.fill();
  }

  private buildPopupLayer(): void {
    const popupMask = new Node('PopupMask');
    const maskTransform = popupMask.addComponent(UITransform);
    maskTransform.setContentSize(UI_ROOT_WIDTH, UI_ROOT_HEIGHT);
    this.drawRoundPanel(popupMask, UI_ROOT_WIDTH, UI_ROOT_HEIGHT, new Color(18, 11, 8, 188), 0);
    popupMask.addComponent(BlockInputEvents);
    const maskWidget = popupMask.addComponent(Widget);
    maskWidget.isAlignHorizontalCenter = true;
    maskWidget.isAlignVerticalCenter = true;
    maskWidget.horizontalCenter = 0;
    maskWidget.verticalCenter = 0;
    popupMask.active = false;
    this.node.addChild(popupMask);
    this.popupMask = popupMask;

    const popupPanel = new Node('PopupPanel');
    const popupTransform = popupPanel.addComponent(UITransform);
    popupTransform.setContentSize(560, 420);
    this.drawRoundPanel(popupPanel, 560, 420, new Color(58, 34, 24, 246), 20);
    popupMask.addChild(popupPanel);
    this.popupPanel = popupPanel;

    const titleLabelNode = new Node('PopupTitleLabel');
    const titleTransform = titleLabelNode.addComponent(UITransform);
    titleTransform.setContentSize(500, 40);
    const titleLabel = titleLabelNode.addComponent(Label);
    titleLabel.fontSize = 24;
    titleLabel.color = new Color(255, 226, 160, 255);
    popupPanel.addChild(titleLabelNode);
    titleLabelNode.setPosition(0, 150, 0);
    this.popupTitleLabel = titleLabel;

    const bodyLabelNode = new Node('PopupBodyLabel');
    const bodyTransform = bodyLabelNode.addComponent(UITransform);
    bodyTransform.setContentSize(500, 220);
    const bodyLabel = bodyLabelNode.addComponent(Label);
    bodyLabel.fontSize = 16;
    bodyLabel.lineHeight = 24;
    bodyLabel.color = new Color(255, 245, 220, 255);
    popupPanel.addChild(bodyLabelNode);
    bodyLabelNode.setPosition(0, 18, 0);
    this.popupBodyLabel = bodyLabel;

    const confirmButton = new Node('PopupConfirmButton');
    const confirmTransform = confirmButton.addComponent(UITransform);
    confirmTransform.setContentSize(180, 52);
    this.drawRoundPanel(confirmButton, 180, 52, new Color(135, 88, 52, 255), 14);
    const confirmButtonComponent = confirmButton.addComponent(Button);
    confirmButtonComponent.transition = Button.Transition.NONE;
    popupPanel.addChild(confirmButton);
    confirmButton.setPosition(0, -154, 0);
    this.popupConfirmButton = confirmButton;

    const confirmLabelNode = new Node('PopupConfirmLabel');
    const confirmLabelTransform = confirmLabelNode.addComponent(UITransform);
    confirmLabelTransform.setContentSize(160, 40);
    const confirmLabel = confirmLabelNode.addComponent(Label);
    confirmLabel.fontSize = 18;
    confirmLabel.color = new Color(255, 245, 220, 255);
    confirmLabel.string = '知道了';
    confirmButton.addChild(confirmLabelNode);
    this.popupConfirmLabel = confirmLabel;
  }

  private createLabelNode(name: string, text: string, width: number, height: number, fontSize: number, color: Color): { node: Node; label: Label } {
    const node = new Node(name);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 7;
    label.color = color;
    return { node, label };
  }

  private createButtonNode(name: string, text: string, width: number, height: number, callback: () => void): { node: Node; label: Label } {
    const node = new Node(name);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    this.drawRoundPanel(node, width, height, new Color(135, 88, 52, 255), 12);
    const button = node.addComponent(Button);
    button.transition = Button.Transition.COLOR;
    button.normalColor = new Color(135, 88, 52, 255);
    button.pressedColor = new Color(102, 64, 38, 255);
    button.hoverColor = new Color(160, 105, 62, 255);
    node.on(Button.EventType.CLICK, callback, this);

    const labelNode = this.createLabelNode(`${name}_Label`, text, width - 18, height - 8, 15, new Color(255, 245, 220, 255));
    node.addChild(labelNode.node);
    labelNode.node.setPosition(0, 0, 0);
    return { node, label: labelNode.label };
  }

  private buildSupplyShopLayer(): void {
    const supplyMask = new Node('SupplyShopMask');
    const maskTransform = supplyMask.addComponent(UITransform);
    maskTransform.setContentSize(UI_ROOT_WIDTH, UI_ROOT_HEIGHT);
    this.drawRoundPanel(supplyMask, UI_ROOT_WIDTH, UI_ROOT_HEIGHT, new Color(18, 11, 8, 150), 0);
    supplyMask.addComponent(BlockInputEvents);
    const maskWidget = supplyMask.addComponent(Widget);
    maskWidget.isAlignHorizontalCenter = true;
    maskWidget.isAlignVerticalCenter = true;
    maskWidget.horizontalCenter = 0;
    maskWidget.verticalCenter = 0;
    maskWidget.updateAlignment();
    supplyMask.active = false;
    this.node.addChild(supplyMask);
    this.supplyMask = supplyMask;

    const panel = new Node('SupplyShopPanel');
    const panelTransform = panel.addComponent(UITransform);
    panelTransform.setContentSize(600, 520);
    this.drawRoundPanel(panel, 600, 520, new Color(58, 34, 24, 248), 18);
    supplyMask.addChild(panel);

    const title = this.createLabelNode('SupplyShopTitle', '补货商店', 520, 44, 25, new Color(255, 226, 160, 255));
    panel.addChild(title.node);
    title.node.setPosition(0, 206, 0);

    const coins = this.createLabelNode('SupplyShopCoins', '', 520, 34, 17, new Color(255, 245, 220, 255));
    panel.addChild(coins.node);
    coins.node.setPosition(0, 164, 0);
    this.supplyCoinsLabel = coins.label;

    const message = this.createLabelNode('SupplyShopMessage', '', 520, 46, 15, new Color(255, 226, 160, 255));
    panel.addChild(message.node);
    message.node.setPosition(0, 118, 0);
    this.supplyMessageLabel = message.label;

    const positions: Array<{ id: SupplyItemId; x: number; y: number }> = [
      { id: 'teaLeaf', x: -150, y: 38 },
      { id: 'sugar', x: 150, y: 38 },
      { id: 'flower', x: -150, y: -78 },
      { id: 'fruit', x: 150, y: -78 },
    ];
    for (const item of positions) {
      const button = this.createButtonNode(`Supply_${item.id}`, '', 250, 90, () => {
        EventBus.emit(GameEventName.RequestBuySupplyItem, item.id);
      });
      panel.addChild(button.node);
      button.node.setPosition(item.x, item.y, 0);
      this.supplyButtonLabels[item.id] = button.label;
    }

    const closeButton = this.createButtonNode('SupplyShopCloseButton', '返回经营', 180, 48, () => {
      if (this.supplyMask) {
        this.supplyMask.active = false;
      }
    });
    panel.addChild(closeButton.node);
    closeButton.node.setPosition(0, -204, 0);
  }

  private buildCollectionPanel(): void {
    const panel = new Node('CollectionPanel');
    const panelTransform = panel.addComponent(UITransform);
    panelTransform.setContentSize(620, 480);
    this.drawRoundPanel(panel, 620, 480, new Color(55, 32, 20, 238), 18);
    panel.addComponent(BlockInputEvents);
    panel.active = false;
    this.node.addChild(panel);
    this.collectionPanel = panel;

    const widget = panel.addComponent(Widget);
    widget.isAlignHorizontalCenter = true;
    widget.isAlignVerticalCenter = true;
    widget.horizontalCenter = 0;
    widget.verticalCenter = 14;
    widget.updateAlignment();

    const title = this.createLabelNode('CollectionTitle', '茶谱图鉴', 540, 44, 25, new Color(255, 226, 160, 255));
    panel.addChild(title.node);
    title.node.setPosition(0, 190, 0);

    const summary = this.createLabelNode('CollectionSummary', '', 540, 36, 16, new Color(255, 245, 220, 255));
    panel.addChild(summary.node);
    summary.node.setPosition(0, 148, 0);
    this.collectionSummaryLabel = summary.label;

    const list = this.createLabelNode('CollectionList', '', 560, 300, 15, new Color(255, 245, 220, 255));
    list.label.lineHeight = 24;
    panel.addChild(list.node);
    list.node.setPosition(0, -24, 0);
    this.collectionListLabel = list.label;
  }

  private showPopup(title: string, body: string, confirmText = '知道了'): void {
    if (!this.popupMask || !this.popupPanel || !this.popupTitleLabel || !this.popupBodyLabel || !this.popupConfirmLabel || !this.popupConfirmButton) {
      return;
    }
    if (this.popupMask.active) {
      this.popupQueue.push({ title, body, confirmText });
      return;
    }
    this.node.setSiblingIndex(30000);
    this.popupMask.setSiblingIndex(0);
    this.popupMask.active = true;
    this.popupTitleLabel.string = title;
    this.popupBodyLabel.string = body;
    this.popupConfirmLabel.string = confirmText;
    this.attachPopupCloseHandler();
  }

  private attachPopupCloseHandler(): void {
    if (!this.popupConfirmButton || this.popupCloseHandler) {
      return;
    }
    this.popupCloseHandler = () => {
      this.hidePopup();
    };
    this.popupConfirmButton.on(Button.EventType.CLICK, this.popupCloseHandler, this);
  }

  private detachPopupCloseHandler(): void {
    if (!this.popupConfirmButton || !this.popupCloseHandler) {
      return;
    }
    this.popupConfirmButton.off(Button.EventType.CLICK, this.popupCloseHandler, this);
    this.popupCloseHandler = null;
  }

  private hidePopup(): void {
    if (!this.popupMask) {
      return;
    }
    this.popupMask.active = false;
    const nextPopup = this.popupQueue.shift();
    if (nextPopup) {
      this.showPopup(nextPopup.title, nextPopup.body, nextPopup.confirmText);
    }
  }

  private updateLabel(label: Label | null, nextText: string, previousText: string, onUpdated: (nextText: string) => void): void {
    if (!label || nextText === previousText) {
      return;
    }
    label.string = nextText;
    onUpdated(nextText);
  }
}
