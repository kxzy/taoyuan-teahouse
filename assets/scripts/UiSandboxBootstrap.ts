import { _decorator, Component, Node, UITransform } from 'cc';
import { CollectionRecipeItem, CollectionUI } from './CollectionUI';
import { FarmManager } from './FarmManager';

const { ccclass } = _decorator;

@ccclass('UiSandboxBootstrap')
export class UiSandboxBootstrap extends Component {
  onLoad(): void {
    this.setupFarmPreview();
    this.setupCollectionPreview();
  }

  private setupFarmPreview(): void {
    const farmNode = this.node.getChildByName('FarmSystem');
    const farmManager = farmNode?.getComponent(FarmManager);
    if (!farmNode || !farmManager) {
      return;
    }

    const transform = farmNode.getComponent(UITransform) ?? farmNode.addComponent(UITransform);
    transform.setContentSize(520, 360);
    if (farmNode.children.length === 0) {
      farmManager.buildFarmPlots(6);
    }
  }

  private setupCollectionPreview(): void {
    const panelNode = this.node.getChildByName('CollectionPanel');
    const collectionUi = panelNode?.getComponent(CollectionUI);
    if (!panelNode || !collectionUi) {
      return;
    }

    let container = collectionUi.gridContainer;
    if (!container) {
      container = panelNode.getChildByName('GridContainer') ?? new Node('GridContainer');
      if (!container.parent) {
        panelNode.addChild(container);
      }
      const transform = container.getComponent(UITransform) ?? container.addComponent(UITransform);
      transform.setContentSize(620, 460);
      container.setPosition(-270, 120, 0);
      collectionUi.gridContainer = container;
    }

    const panelTransform = panelNode.getComponent(UITransform) ?? panelNode.addComponent(UITransform);
    panelTransform.setContentSize(660, 520);

    const previewRecipes: CollectionRecipeItem[] = [
      { id: 'green-tea', name: 'Green Tea', icon: null, unlocked: true },
      { id: 'black-tea', name: 'Black Tea', icon: null, unlocked: true },
      { id: 'jasmine-tea', name: 'Jasmine Tea', icon: null, unlocked: true },
      { id: 'osmanthus', name: 'Osmanthus Tea', icon: null, unlocked: false },
      { id: 'pear-fruit', name: 'Pear Fruit Tea', icon: null, unlocked: false },
      { id: 'peach-brew', name: 'Peach Brew', icon: null, unlocked: true },
      { id: 'special-1', name: 'Cloud Mist', icon: null, unlocked: false },
      { id: 'special-2', name: 'Flower Dew', icon: null, unlocked: false },
    ];

    collectionUi.renderCollection(previewRecipes);
  }

}
