import { _decorator, builtinResMgr, Color, Component, Label, Node, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';

const { ccclass, property } = _decorator;
const LOCKED_COLOR = new Color(100, 100, 100, 255);
const NORMAL_COLOR = new Color(255, 255, 255, 255);
const NAME_COLOR = new Color(74, 46, 26, 255);

export interface CollectionRecipeItem {
  id: string;
  name: string;
  icon: SpriteFrame | null;
  unlocked: boolean;
}

@ccclass('CollectionUI')
export class CollectionUI extends Component {
  @property(SpriteFrame)
  itemBgSprite: SpriteFrame | null = null;

  @property(Node)
  gridContainer: Node | null = null;

  @property
  columns = 4;

  @property
  cellWidth = 140;

  @property
  cellHeight = 176;

  @property
  horizontalGap = 152;

  @property
  verticalGap = 192;

  @property
  iconSize = 88;

  renderCollection(recipes: CollectionRecipeItem[]): void {
    const container = this.gridContainer;
    if (!container) {
      return;
    }

    container.removeAllChildren();
    const safeColumns = Math.max(1, Math.floor(this.columns));
    const fallbackSprite = this.getWhiteSpriteFrame();

    recipes.forEach((recipe, index) => {
      const itemNode = new Node(`CollectionItem_${recipe.id}`);
      const itemTransform = itemNode.addComponent(UITransform);
      itemTransform.setContentSize(this.cellWidth, this.cellHeight);

      const backgroundSprite = itemNode.addComponent(Sprite);
      backgroundSprite.spriteFrame = this.itemBgSprite ?? fallbackSprite;
      backgroundSprite.color = this.itemBgSprite ? Color.WHITE : new Color(244, 233, 212, 255);

      const column = index % safeColumns;
      const row = Math.floor(index / safeColumns);
      itemNode.setPosition(new Vec3(column * this.horizontalGap, -row * this.verticalGap, 0));

      const iconNode = new Node('Icon');
      const iconTransform = iconNode.addComponent(UITransform);
      iconTransform.setContentSize(this.iconSize, this.iconSize);
      const iconSprite = iconNode.addComponent(Sprite);
      iconSprite.spriteFrame = recipe.icon ?? fallbackSprite;
      iconSprite.color = recipe.unlocked ? NORMAL_COLOR : LOCKED_COLOR;
      itemNode.addChild(iconNode);
      iconNode.setPosition(0, 22, 0);

      const labelNode = new Node('NameLabel');
      const label = labelNode.addComponent(Label);
      label.string = recipe.unlocked ? recipe.name : '???';
      label.fontSize = 22;
      label.lineHeight = 28;
      label.color = NAME_COLOR;
      itemNode.addChild(labelNode);
      labelNode.setPosition(0, -56, 0);

      container.addChild(itemNode);
    });
  }

  clearCollection(): void {
    this.gridContainer?.removeAllChildren();
  }

  private getWhiteSpriteFrame(): SpriteFrame | null {
    return builtinResMgr.get<SpriteFrame>('white-sprite') ?? null;
  }
}
