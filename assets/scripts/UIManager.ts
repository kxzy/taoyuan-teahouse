import {
  _decorator,
  Button,
  Color,
  Component,
  Graphics,
  instantiate,
  Label,
  Node,
  Prefab,
  Sprite,
  tween,
  UIOpacity,
  UITransform,
  Vec3,
  Widget,
} from 'cc';
import {
  CollectionViewModel,
  EventBus,
  GameEventName,
  HudViewModel,
  MainTabId,
  OfflineRewardSummary,
  PlayEffectPayload,
  PrimaryActionId,
  RequestRevivePayload,
  ResearchResultSummary,
  ReviveOfferPayload,
  SupplyItemId,
  SupplyShopViewModel,
  UnlockSummary,
} from './EventBus';
import { RecipeConfig, RecipeId } from './GameConfig';

const { ccclass, property } = _decorator;

const UI_ROOT_WIDTH = 720;
const UI_ROOT_HEIGHT = 1280;
const TEA_BUTTON_COLUMNS = 4;
const TEA_BUTTON_HORIZONTAL_GAP = 160;
const TEA_BUTTON_VERTICAL_GAP = 42;

interface GenericPopupRequest {
  title: string;
  body: string;
  confirmText: string;
  onConfirm?: () => void;
  closeOnConfirm?: boolean;
  secondaryText?: string;
  onSecondary?: () => void;
  closeOnSecondary?: boolean;
  tertiaryText?: string;
  onTertiary?: () => void;
  closeOnTertiary?: boolean;
}

const SUPPLY_ITEM_NODE_NAMES: Record<SupplyItemId, string> = {
  teaLeaf: 'TeaLeaf',
  sugar: 'Sugar',
  flower: 'Flower',
  fruit: 'Fruit',
};

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

  @property(Prefab)
  offlineRewardPrefab: Prefab | null = null;

  @property(Prefab)
  upgradeUnlockPrefab: Prefab | null = null;

  @property(Prefab)
  shopPanelPrefab: Prefab | null = null;

  @property(Prefab)
  teaButtonPrefab: Prefab | null = null;

  @property(Node)
  teaButtonContainer: Node | null = null;

  private activeGenericPopup: Node | null = null;
  private activeOfflineRewardPopup: Node | null = null;
  private activeShopPanel: Node | null = null;
  private popupQueue: GenericPopupRequest[] = [];
  private collectionPanel: Node | null = null;
  private collectionSummaryLabel: Label | null = null;
  private collectionListLabel: Label | null = null;
  private recipeButtonLabels: Partial<Record<RecipeId, Label>> = {};
  private primaryButtonLabels: Partial<Record<'upgrade' | 'supply' | 'nextDay' | 'extend', Label>> = {};
  private mainTabLabels: Partial<Record<MainTabId, Label>> = {};
  private lastUnlockedRecipes: RecipeConfig[] = [];

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
    this.buildCollectionPanel();
    EventBus.on(GameEventName.HudMessage, this.handleHudMessageEvent);
    EventBus.on(GameEventName.HudViewModel, this.handleHudViewModelEvent);
    EventBus.on(GameEventName.PopupOfflineReward, this.handleOfflineRewardPopupEvent);
    EventBus.on(GameEventName.PopupReviveOffer, this.handleReviveOfferPopupEvent);
    EventBus.on(GameEventName.PopupUpgradeUnlock, this.handleUpgradeUnlockPopupEvent);
    EventBus.on(GameEventName.PopupResearchResult, this.handleResearchResultPopupEvent);
    EventBus.on(GameEventName.SupplyShopViewModel, this.handleSupplyShopViewModelEvent);
    EventBus.on(GameEventName.CollectionViewModel, this.handleCollectionViewModelEvent);
    EventBus.on(GameEventName.PlayEffect, this.handlePlayEffectEvent);
    EventBus.on(GameEventName.OnReviveSuccess, this.handleReviveSuccessEvent);
  }

  onDestroy(): void {
    EventBus.off(GameEventName.HudMessage, this.handleHudMessageEvent);
    EventBus.off(GameEventName.HudViewModel, this.handleHudViewModelEvent);
    EventBus.off(GameEventName.PopupOfflineReward, this.handleOfflineRewardPopupEvent);
    EventBus.off(GameEventName.PopupReviveOffer, this.handleReviveOfferPopupEvent);
    EventBus.off(GameEventName.PopupUpgradeUnlock, this.handleUpgradeUnlockPopupEvent);
    EventBus.off(GameEventName.PopupResearchResult, this.handleResearchResultPopupEvent);
    EventBus.off(GameEventName.SupplyShopViewModel, this.handleSupplyShopViewModelEvent);
    EventBus.off(GameEventName.CollectionViewModel, this.handleCollectionViewModelEvent);
    EventBus.off(GameEventName.PlayEffect, this.handlePlayEffectEvent);
    EventBus.off(GameEventName.OnReviveSuccess, this.handleReviveSuccessEvent);
  }

  bindRecipeButtonLabel(recipeId: RecipeId, label: Label | null): void {
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

  refreshTeaButtons(unlockedRecipes: RecipeConfig[]): void {
    this.lastUnlockedRecipes = [...unlockedRecipes];
    if (!this.teaButtonContainer) {
      return;
    }

    const container = this.teaButtonContainer;
    container.removeAllChildren();
    this.recipeButtonLabels = {};

    unlockedRecipes.forEach((recipe, index) => {
      const buttonNode = this.teaButtonPrefab
        ? instantiate(this.teaButtonPrefab)
        : this.createFallbackTeaButtonNode(recipe);
      buttonNode.name = `TeaButton_${recipe.id}`;
      container.addChild(buttonNode);
      this.applyFallbackTeaButtonLayout(buttonNode, index);
      this.configureTeaButtonNode(buttonNode, recipe);
    });
  }

  private readonly handlePlayEffectEvent = (payload: PlayEffectPayload) => {
    if (payload.type === 'coinFly') {
      this.playCoinFlyAnimation(payload);
    }
  };

  private readonly handleReviveSuccessEvent = () => {
    this.closeActiveGenericPopup();
  };

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
    this.bringUiRootToFront();
    this.destroyNode(this.activeOfflineRewardPopup);
    const popup = this.offlineRewardPrefab
      ? instantiate(this.offlineRewardPrefab)
      : this.createFallbackPopupNode('OfflineRewardPopup');
    popup.name = 'OfflineRewardPopup';
    this.node.addChild(popup);
    popup.setSiblingIndex(31000);
    this.activeOfflineRewardPopup = popup;

    this.setLabelText(popup, 'Title_Label', '离线收益');
    this.setLabelText(
      popup,
      'Content_Label',
      [
        `离线时长：${Math.max(1, Math.floor(summary.idleSeconds / 60))} 分钟`,
        `金币 +${summary.coins}`,
        `茶叶 +${summary.teaLeaf}｜糖 +${summary.sugar}｜花 +${summary.flower}｜果 +${summary.fruit}`,
        '点击“看视频双倍领取”可再补发一份同等收益。',
      ].join('\n'),
    );
    this.configureButton(popup, 'Confirm_Button', 'Confirm_Label', '开始营业', () => {
      this.destroyNode(this.activeOfflineRewardPopup);
      this.activeOfflineRewardPopup = null;
    });
    this.configureButton(popup, 'Double_Button', 'Double_Label', '看视频双倍领取', () => {
      EventBus.emit(GameEventName.RequestDoubleOfflineReward, undefined);
      this.destroyNode(this.activeOfflineRewardPopup);
      this.activeOfflineRewardPopup = null;
    });
  };

  private readonly handleReviveOfferPopupEvent = (payload: ReviveOfferPayload) => {
    const reasonText = payload.reason === 'reputation_zero'
      ? '口碑已经跌到 0，今天的经营即将直接崩盘。'
      : '当前评级危险，继续这样打烊很可能直接判定为 C。';
    const request: GenericPopupRequest = {
      title: '客流挽留',
      body: [
        reasonText,
        `消耗 ${payload.coinCost} 雅致币，或看视频广告，立即唤回 ${payload.customerCount} 位特殊请求客人。`,
        `成功后会恢复 ${payload.restoreReputation} 点口碑，并继续当天营业。`,
      ].join('\n'),
      confirmText: '消耗 50 雅致币',
      onConfirm: () => {
        const requestPayload: RequestRevivePayload = { method: 'token', coinCost: payload.coinCost };
        EventBus.emit(GameEventName.RequestRevive, requestPayload);
      },
      closeOnConfirm: false,
      secondaryText: '看视频唤回',
      onSecondary: () => {
        const requestPayload: RequestRevivePayload = { method: 'ad', coinCost: payload.coinCost };
        EventBus.emit(GameEventName.RequestRevive, requestPayload);
      },
      closeOnSecondary: false,
      tertiaryText: '直接打烊',
      onTertiary: () => {
        const requestPayload: RequestRevivePayload = { method: 'skip', coinCost: 0 };
        EventBus.emit(GameEventName.RequestRevive, requestPayload);
      },
    };
    this.enqueueGenericPopup(request);
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
    this.enqueueGenericPopup({
      title: '升级解锁',
      body: lines.join('\n'),
      confirmText: '继续营业',
    });
  };

  private readonly handleResearchResultPopupEvent = (summary: ResearchResultSummary) => {
    const lines = [
      `研发成功：${summary.tier}｜${summary.name}`,
      `售价：${summary.price}`,
      `味 ${summary.taste}｜香 ${summary.aroma}`,
      `人气 ${summary.popularity}｜稀有 ${summary.rarity}`,
      '记得把新茶加入经营节奏，看看它能不能成为招牌。',
    ];
    this.enqueueGenericPopup({
      title: '新茶谱问世',
      body: lines.join('\n'),
      confirmText: '收下茶谱',
    });
  };

  private readonly handleSupplyShopViewModelEvent = (viewModel: SupplyShopViewModel) => {
    if (!viewModel.active) {
      this.destroyNode(this.activeShopPanel);
      this.activeShopPanel = null;
      return;
    }

    if (!this.activeShopPanel) {
      this.bringUiRootToFront();
      const panel = this.shopPanelPrefab
        ? instantiate(this.shopPanelPrefab)
        : this.createFallbackShopPanelNode();
      panel.name = 'SupplyShopPanel';
      this.node.addChild(panel);
      panel.setSiblingIndex(25000);
      this.activeShopPanel = panel;
      this.setLabelText(panel, 'Title_Label', '补货商店');
      this.configureButton(panel, 'Close_Button', 'Close_Label', '返回经营', () => {
        this.destroyNode(this.activeShopPanel);
        this.activeShopPanel = null;
      });
    }

    if (!this.activeShopPanel) {
      return;
    }

    this.bringUiRootToFront();
    this.activeShopPanel.setSiblingIndex(25000);
    this.setLabelText(this.activeShopPanel, 'Coin_Label', `当前金币：${viewModel.coins}｜今日采购 ${viewModel.dailyPurchaseCount} 次`);
    this.setLabelText(this.activeShopPanel, 'Message_Label', viewModel.messageText ?? '选择要补充的原料。');

    for (const item of viewModel.items) {
      const baseName = SUPPLY_ITEM_NODE_NAMES[item.id];
      const marker = item.highlighted ? '急需｜' : '';
      this.configureButton(
        this.activeShopPanel,
        `${baseName}_Button`,
        `${baseName}_Label`,
        `${marker}${item.name}\n库存 ${item.stock}  +${item.amount}\n价格 ${item.price} 金`,
        () => {
          EventBus.emit(GameEventName.RequestBuySupplyItem, item.id);
        },
      );
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

  private ensureRootTransform(): void {
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(UI_ROOT_WIDTH, UI_ROOT_HEIGHT);
  }

  private bringUiRootToFront(): void {
    this.node.setSiblingIndex(32767);
  }

  private enqueueGenericPopup(request: GenericPopupRequest): void {
    if (this.activeGenericPopup) {
      this.popupQueue.push(request);
      return;
    }

    this.showGenericPopup(request);
  }

  private showGenericPopup(request: GenericPopupRequest): void {
    this.bringUiRootToFront();
    const popup = this.upgradeUnlockPrefab
      ? instantiate(this.upgradeUnlockPrefab)
      : this.createFallbackPopupNode('GenericPopup');
    popup.name = 'GenericPopup';
    this.node.addChild(popup);
    popup.setSiblingIndex(30000);
    this.activeGenericPopup = popup;

    this.setLabelText(popup, 'Title_Label', request.title);
    this.setLabelText(popup, 'Content_Label', request.body);
    this.configureButton(popup, 'Confirm_Button', 'Confirm_Label', request.confirmText, () => {
      request.onConfirm?.();
      if (request.closeOnConfirm !== false) {
        this.closeActiveGenericPopup();
      }
    });
    this.configureOptionalButton(popup, 'Secondary_Button', 'Secondary_Label', request.secondaryText, () => {
      request.onSecondary?.();
      if (request.closeOnSecondary !== false) {
        this.closeActiveGenericPopup();
      }
    }, request.closeOnSecondary !== false);
    this.configureOptionalButton(popup, 'Tertiary_Button', 'Tertiary_Label', request.tertiaryText, () => {
      request.onTertiary?.();
      if (request.closeOnTertiary !== false) {
        this.closeActiveGenericPopup();
      }
    }, request.closeOnTertiary !== false);
  }

  private closeActiveGenericPopup(openNext = true): void {
    this.destroyNode(this.activeGenericPopup);
    this.activeGenericPopup = null;
    if (!openNext) {
      return;
    }
    const nextRequest = this.popupQueue.shift();
    if (nextRequest) {
      this.showGenericPopup(nextRequest);
    }
  }

  private configureTeaButtonNode(buttonNode: Node, recipe: RecipeConfig): void {
    this.setLabelText(buttonNode, 'Title_Label', recipe.name);
    const statusText = this.lastRecipeButtonTexts[recipe.id as RecipeId] ?? recipe.name;
    this.setLabelText(buttonNode, 'Status_Label', statusText);
    const statusLabel = this.findNodeByName(buttonNode, 'Status_Label')?.getComponent(Label) ?? null;
    if (statusLabel) {
      this.recipeButtonLabels[recipe.id as RecipeId] = statusLabel;
    }

    this.configureButton(buttonNode, 'Click_Button', 'Click_Label', '', () => {
      this.requestMakeRecipe(recipe.id as RecipeId);
    }, false);

    const clickNode = this.findNodeByName(buttonNode, 'Click_Button') ?? buttonNode;
    clickNode.targetOff(this);
    clickNode.on(Button.EventType.CLICK, () => this.requestMakeRecipe(recipe.id as RecipeId), this);
    const clickButton = clickNode.getComponent(Button) ?? clickNode.addComponent(Button);
    clickButton.transition = Button.Transition.NONE;

    const iconNode = this.findNodeByName(buttonNode, 'Icon_Sprite');
    if (iconNode) {
      this.configureRecipeBadge(iconNode, recipe);
    }
  }

  private createFallbackTeaButtonNode(recipe: RecipeConfig): Node {
    const buttonNode = new Node(`TeaButtonFallback_${recipe.id}`);
    const transform = buttonNode.addComponent(UITransform);
    transform.setContentSize(142, 56);
    this.drawRoundPanel(buttonNode, 142, 56, new Color(235, 185, 95, 245), 12);

    const iconNode = new Node('Icon_Sprite');
    const iconTransform = iconNode.addComponent(UITransform);
    iconTransform.setContentSize(28, 28);
    buttonNode.addChild(iconNode);
    iconNode.setPosition(-46, 0, 0);

    const titleNode = this.createLabelNode('Title_Label', recipe.name, 84, 20, 13, new Color(55, 35, 22, 255));
    buttonNode.addChild(titleNode.node);
    titleNode.node.setPosition(18, 10, 0);

    const statusNode = this.createLabelNode('Status_Label', recipe.name, 96, 20, 11, new Color(92, 54, 32, 255));
    buttonNode.addChild(statusNode.node);
    statusNode.node.setPosition(18, -12, 0);

    const clickNode = new Node('Click_Button');
    const clickTransform = clickNode.addComponent(UITransform);
    clickTransform.setContentSize(142, 56);
    clickNode.addComponent(Button);
    buttonNode.addChild(clickNode);
    clickNode.setPosition(0, 0, 0);

    return buttonNode;
  }

  private applyFallbackTeaButtonLayout(buttonNode: Node, index: number): void {
    const hasLayoutController = this.teaButtonContainer?.getComponent('cc.Layout');
    if (hasLayoutController) {
      return;
    }

    const column = index % TEA_BUTTON_COLUMNS;
    const row = Math.floor(index / TEA_BUTTON_COLUMNS);
    buttonNode.setPosition(
      -240 + column * TEA_BUTTON_HORIZONTAL_GAP,
      48 - row * TEA_BUTTON_VERTICAL_GAP,
      0,
    );
  }

  private configureRecipeBadge(iconNode: Node, recipe: RecipeConfig): void {
    const transform = iconNode.getComponent(UITransform) ?? iconNode.addComponent(UITransform);
    transform.setContentSize(28, 28);
    iconNode.setScale(1, 1, 1);
    iconNode.setPosition(-46, 0, 0);

    const sprite = iconNode.getComponent(Sprite);
    if (sprite) {
      sprite.spriteFrame = null;
      sprite.enabled = false;
    }

    const widget = iconNode.getComponent(Widget);
    if (widget) {
      widget.enabled = false;
    }

    if (!iconNode.getComponent(Graphics)) {
      const badgeColor = this.getRecipeBadgeColor(recipe.id as RecipeId);
      this.drawRoundPanel(iconNode, 28, 28, badgeColor, 14);
    }

    let badgeLabel = this.findNodeByName(iconNode, 'Icon_Badge_Label')?.getComponent(Label) ?? null;
    if (!badgeLabel) {
      const labelNode = this.createLabelNode('Icon_Badge_Label', '', 24, 22, 13, new Color(255, 250, 230, 255));
      iconNode.addChild(labelNode.node);
      labelNode.node.setPosition(0, 0, 0);
      badgeLabel = labelNode.label;
    }
    badgeLabel.string = this.getRecipeBadgeText(recipe.id as RecipeId);
  }

  private getRecipeBadgeText(recipeId: RecipeId): string {
    switch (recipeId) {
      case RecipeId.BlackTea:
        return '红';
      case RecipeId.JasmineTea:
        return '茉';
      case RecipeId.OsmanthusTea:
        return '桂';
      case RecipeId.PearFruitTea:
        return '梨';
      case RecipeId.PeachBrew:
        return '桃';
      case RecipeId.GreenTea:
      default:
        return '绿';
    }
  }

  private getRecipeBadgeColor(recipeId: RecipeId): Color {
    switch (recipeId) {
      case RecipeId.BlackTea:
      case RecipeId.PeachBrew:
        return new Color(176, 86, 54, 245);
      case RecipeId.JasmineTea:
      case RecipeId.OsmanthusTea:
        return new Color(198, 158, 66, 245);
      case RecipeId.PearFruitTea:
        return new Color(205, 132, 58, 245);
      case RecipeId.GreenTea:
      default:
        return new Color(94, 150, 82, 245);
    }
  }

  private playCoinFlyAnimation(payload: PlayEffectPayload): void {
    if (payload.value === undefined) {
      return;
    }

    const rootTransform = this.node.getComponent(UITransform);
    if (!rootTransform) {
      return;
    }

    const startPosition = rootTransform.convertToNodeSpaceAR(payload.position);
    const effectNode = new Node('CoinFlyText');
    const effectTransform = effectNode.addComponent(UITransform);
    effectTransform.setContentSize(160, 40);
    const opacity = effectNode.addComponent(UIOpacity);
    opacity.opacity = 255;
    const label = effectNode.addComponent(Label);
    label.string = `+${payload.value}`;
    label.fontSize = 24;
    label.lineHeight = 28;
    label.color = new Color(255, 218, 96, 255);
    effectNode.setPosition(startPosition);
    this.node.addChild(effectNode);

    const endPosition = new Vec3(startPosition.x, startPosition.y + 50, startPosition.z);
    tween(effectNode)
      .to(1, { position: endPosition })
      .call(() => {
        if (effectNode.isValid) {
          effectNode.destroy();
        }
      })
      .start();
    tween(opacity).to(1, { opacity: 0 }).start();
  }

  private buildCollectionPanel(): void {
    const panel = new Node('CollectionPanel');
    const panelTransform = panel.addComponent(UITransform);
    panelTransform.setContentSize(620, 480);
    this.drawRoundPanel(panel, 620, 480, new Color(55, 32, 20, 238), 18);
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

  private configureButton(
    root: Node,
    buttonName: string,
    labelName: string,
    text: string,
    handler: () => void,
    updateLabel = true,
  ): void {
    const buttonNode = this.findNodeByName(root, buttonName);
    if (!buttonNode) {
      return;
    }
    const button = buttonNode.getComponent(Button) ?? buttonNode.addComponent(Button);
    buttonNode.targetOff(this);
    buttonNode.on(Button.EventType.CLICK, handler, this);
    if (updateLabel) {
      this.setLabelText(root, labelName, text);
    }
  }

  private configureOptionalButton(
    root: Node,
    buttonName: string,
    labelName: string,
    text: string | undefined,
    handler: () => void,
    closeAfterClick: boolean,
  ): void {
    const buttonNode = this.findNodeByName(root, buttonName);
    if (!buttonNode) {
      return;
    }

    buttonNode.active = !!text;
    if (!text) {
      buttonNode.targetOff(this);
      return;
    }

    this.configureButton(root, buttonName, labelName, text, () => {
      handler();
      if (closeAfterClick) {
        return;
      }
    });
  }

  private setLabelText(root: Node, labelName: string, text: string): void {
    const labelNode = this.findNodeByName(root, labelName);
    const label = labelNode?.getComponent(Label) ?? null;
    if (label) {
      label.string = text;
    }
  }

  private findNodeByName(root: Node, targetName: string): Node | null {
    if (root.name === targetName) {
      return root;
    }

    for (const child of root.children) {
      const found = this.findNodeByName(child, targetName);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private destroyNode(node: Node | null): void {
    if (!node || !node.isValid) {
      return;
    }
    node.removeFromParent();
    node.destroy();
  }

  private drawRoundPanel(node: Node, width: number, height: number, color: Color, radius = 18): void {
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = color;
    graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    graphics.fill();
  }

  private createFallbackPopupNode(name: string): Node {
    const popup = new Node(name);
    const popupTransform = popup.addComponent(UITransform);
    popupTransform.setContentSize(UI_ROOT_WIDTH, UI_ROOT_HEIGHT);
    this.drawRoundPanel(popup, UI_ROOT_WIDTH, UI_ROOT_HEIGHT, new Color(18, 11, 8, 188), 0);

    const panel = new Node('Panel');
    const panelTransform = panel.addComponent(UITransform);
    panelTransform.setContentSize(560, 420);
    this.drawRoundPanel(panel, 560, 420, new Color(58, 34, 24, 246), 20);
    popup.addChild(panel);

    const title = this.createLabelNode('Title_Label', '', 500, 40, 24, new Color(255, 226, 160, 255));
    panel.addChild(title.node);
    title.node.setPosition(0, 150, 0);

    const content = this.createLabelNode('Content_Label', '', 500, 220, 16, new Color(255, 245, 220, 255));
    content.label.lineHeight = 24;
    panel.addChild(content.node);
    content.node.setPosition(0, 30, 0);

    const confirmButton = this.createFallbackActionButton('Confirm_Button', 'Confirm_Label', 180, 52);
    panel.addChild(confirmButton);
    confirmButton.setPosition(0, -154, 0);

    const secondaryButton = this.createFallbackActionButton('Secondary_Button', 'Secondary_Label', 180, 52);
    panel.addChild(secondaryButton);
    secondaryButton.setPosition(-190, -154, 0);
    secondaryButton.active = false;

    const tertiaryButton = this.createFallbackActionButton('Tertiary_Button', 'Tertiary_Label', 140, 52);
    panel.addChild(tertiaryButton);
    tertiaryButton.setPosition(190, -154, 0);
    tertiaryButton.active = false;

    return popup;
  }

  private createFallbackShopPanelNode(): Node {
    const panel = new Node('SupplyShopPanel');
    const transform = panel.addComponent(UITransform);
    transform.setContentSize(620, 520);
    this.drawRoundPanel(panel, 620, 520, new Color(58, 34, 24, 248), 18);

    const title = this.createLabelNode('Title_Label', '补货商店', 520, 44, 25, new Color(255, 226, 160, 255));
    panel.addChild(title.node);
    title.node.setPosition(0, 206, 0);

    const coinLabel = this.createLabelNode('Coin_Label', '', 520, 34, 17, new Color(255, 245, 220, 255));
    panel.addChild(coinLabel.node);
    coinLabel.node.setPosition(0, 164, 0);

    const messageLabel = this.createLabelNode('Message_Label', '', 520, 46, 15, new Color(255, 226, 160, 255));
    panel.addChild(messageLabel.node);
    messageLabel.node.setPosition(0, 118, 0);

    const layouts: Array<{ id: SupplyItemId; x: number; y: number }> = [
      { id: 'teaLeaf', x: -150, y: 38 },
      { id: 'sugar', x: 150, y: 38 },
      { id: 'flower', x: -150, y: -78 },
      { id: 'fruit', x: 150, y: -78 },
    ];

    layouts.forEach((entry) => {
      const baseName = SUPPLY_ITEM_NODE_NAMES[entry.id];
      const buttonNode = this.createFallbackActionButton(`${baseName}_Button`, `${baseName}_Label`, 250, 90);
      panel.addChild(buttonNode);
      buttonNode.setPosition(entry.x, entry.y, 0);
    });

    const closeButton = this.createFallbackActionButton('Close_Button', 'Close_Label', 180, 48);
    panel.addChild(closeButton);
    closeButton.setPosition(0, -204, 0);

    return panel;
  }

  private createFallbackActionButton(buttonName: string, labelName: string, width: number, height: number): Node {
    const buttonNode = new Node(buttonName);
    const transform = buttonNode.addComponent(UITransform);
    transform.setContentSize(width, height);
    this.drawRoundPanel(buttonNode, width, height, new Color(135, 88, 52, 255), 12);
    buttonNode.addComponent(Button);

    const labelNode = this.createLabelNode(labelName, '', width - 18, height - 8, 15, new Color(255, 245, 220, 255));
    buttonNode.addChild(labelNode.node);
    labelNode.node.setPosition(0, 0, 0);

    return buttonNode;
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

  private updateLabel(label: Label | null, nextText: string, previousText: string, onUpdated: (nextText: string) => void): void {
    if (!label || nextText === previousText) {
      return;
    }
    label.string = nextText;
    onUpdated(nextText);
  }
}
