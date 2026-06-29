import { _decorator, Button, Component, instantiate, Node, Prefab, SpriteFrame } from 'cc';
import { EventBus } from './EventBus';
import { TabItem } from './TabItem';

const { ccclass, property } = _decorator;

@ccclass('TabData')
export class TabData {
  @property
  id = '';

  @property
  name = '';

  @property(SpriteFrame)
  normalIcon: SpriteFrame | null = null;

  @property(SpriteFrame)
  activeIcon: SpriteFrame | null = null;
}

@ccclass('NavigationBar')
export class NavigationBar extends Component {
  @property([TabData])
  tabConfigs: TabData[] = [];

  @property(Prefab)
  tabPrefab: Prefab | null = null;

  @property(Node)
  tabContainer: Node | null = null;

  private tabItems: TabItem[] = [];
  private activeTabId = '';

  onLoad(): void {
    this.buildNavigationBar();
  }

  start(): void {
    this.setActiveTab(this.activeTabId || (this.tabConfigs[0]?.id ?? ''));
  }

  private buildNavigationBar(): void {
    this.tabItems = [];

    if (!this.tabContainer) {
      return;
    }

    const reusableTabs = this.tabContainer.children
      .map((child) => child.getComponent(TabItem))
      .filter((item): item is TabItem => !!item);

    for (let index = 0; index < this.tabConfigs.length; index += 1) {
      const data = this.tabConfigs[index];
      const tabItem = reusableTabs[index] ?? this.createTabItem();
      if (!tabItem) {
        continue;
      }

      tabItem.init(data);
      this.tabItems.push(tabItem);

      const button = tabItem.node.getComponent(Button) ?? tabItem.node.addComponent(Button);
      button.node.off(Button.EventType.CLICK);
      button.node.on(Button.EventType.CLICK, () => {
        this.requestSwitchTab(data.id);
      }, this);
    }

    for (let index = this.tabConfigs.length; index < reusableTabs.length; index += 1) {
      reusableTabs[index].node.active = false;
    }
  }

  private createTabItem(): TabItem | null {
    if (!this.tabPrefab || !this.tabContainer) {
      return null;
    }

    const tabNode = instantiate(this.tabPrefab);
    this.tabContainer.addChild(tabNode);
    return tabNode.getComponent(TabItem);
  }

  setActiveTab(tabId: string): void {
    this.activeTabId = tabId;
    for (const tabItem of this.tabItems) {
      tabItem.setActive(tabItem.id === tabId);
    }
  }

  setTabText(tabId: string, _text: string): void {
    const tabItem = this.tabItems.find((item) => item.id === tabId);
    tabItem?.setName('');
  }

  private requestSwitchTab(tabId: string): void {
    this.setActiveTab(tabId);
    EventBus.emit('request:switch-main-tab', tabId);
  }
}
