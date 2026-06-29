import { _decorator, builtinResMgr, Color, Component, Node, resources, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('FarmManager')
export class FarmManager extends Component {
  @property(SpriteFrame)
  soilSprite: SpriteFrame | null = null;

  @property([SpriteFrame])
  cropSprites: SpriteFrame[] = [];

  @property
  columns = 3;

  @property
  horizontalGap = 150;

  @property
  verticalGap = 150;

  @property
  plotSize = 120;

  @property
  cropSize = 88;

  @property
  cropOffsetY = 8;

  private defaultSoilSprite: SpriteFrame | null = null;
  private defaultCropSprites: SpriteFrame[][] = [];
  private cropStates: Array<{ growthStage: number; visible: boolean }> = [];
  private isLoadingDefaultSprites = false;

  buildFarmPlots(plotCount: number): void {
    this.node.removeAllChildren();
    this.cropStates = Array.from({ length: plotCount }, () => ({ growthStage: 0, visible: false }));
    const safeColumns = Math.max(1, Math.floor(this.columns));
    const fallbackSprite = this.getWhiteSpriteFrame();

    for (let index = 0; index < plotCount; index += 1) {
      const plotNode = new Node(`Plot_${index}`);
      const transform = plotNode.addComponent(UITransform);
      transform.setContentSize(this.plotSize, this.plotSize);

      const sprite = plotNode.addComponent(Sprite);
      const soilFrame = this.soilSprite ?? this.defaultSoilSprite ?? fallbackSprite;
      sprite.spriteFrame = soilFrame;
      sprite.color = soilFrame === fallbackSprite ? new Color(141, 101, 62, 255) : Color.WHITE;

      const column = index % safeColumns;
      const row = Math.floor(index / safeColumns);
      plotNode.setPosition(new Vec3(column * this.horizontalGap, -row * this.verticalGap, 0));

      const cropNode = new Node('CropItem');
      const cropTransform = cropNode.addComponent(UITransform);
      cropTransform.setContentSize(this.cropSize, this.cropSize);
      const cropSprite = cropNode.addComponent(Sprite);
      const cropFrame = this.getCropSprite(index, 0) ?? fallbackSprite;
      cropSprite.spriteFrame = cropFrame;
      cropSprite.color = cropFrame === fallbackSprite ? new Color(102, 152, 86, 255) : Color.WHITE;
      cropNode.active = false;

      plotNode.addChild(cropNode);
      cropNode.setPosition(0, this.cropOffsetY, 0);

      this.node.addChild(plotNode);
    }

    this.loadDefaultSprites();
  }

  updateCrop(index: number, growthStage: number, visible = true): void {
    this.cropStates[index] = { growthStage, visible };
    const plotNode = this.node.getChildByName(`Plot_${index}`);
    const cropNode = plotNode?.getChildByName('CropItem');
    const cropSprite = cropNode?.getComponent(Sprite);
    if (!cropNode || !cropSprite) {
      return;
    }

    const fallbackSprite = this.getWhiteSpriteFrame();
    const nextSprite = this.getCropSprite(index, growthStage) ?? fallbackSprite;
    cropSprite.spriteFrame = nextSprite;
    cropSprite.color = nextSprite === fallbackSprite ? new Color(102, 152, 86, 255) : Color.WHITE;
    cropNode.active = visible;
  }

  private getCropSprite(index: number, growthStage: number): SpriteFrame | null {
    return this.defaultCropSprites[index]?.[growthStage]
      ?? this.defaultCropSprites[index]?.[0]
      ?? this.cropSprites[growthStage]
      ?? this.cropSprites[0]
      ?? null;
  }

  private loadDefaultSprites(): void {
    if (this.isLoadingDefaultSprites || this.defaultSoilSprite) {
      this.refreshDefaultSprites();
      return;
    }

    this.isLoadingDefaultSprites = true;
    this.loadSpriteFrame('image/farm/farm_soil/spriteFrame', (frame) => {
      this.defaultSoilSprite = frame;
      this.refreshDefaultSprites();
    });

    const cropPaths = [
      ['image/farm/farm_tea_tree_1/spriteFrame', 'image/farm/farm_tea_tree_2/spriteFrame', 'image/farm/farm_tea_tree_3/spriteFrame'],
      ['image/farm/farm_flower_bed_1/spriteFrame', 'image/farm/farm_flower_bed_2/spriteFrame', 'image/farm/farm_flower_bed_3/spriteFrame'],
      ['image/farm/farm_fruit_tree_1/spriteFrame', 'image/farm/farm_fruit_tree_2/spriteFrame', 'image/farm/farm_fruit_tree_3/spriteFrame'],
    ];

    let pending = cropPaths.length * cropPaths[0].length;
    cropPaths.forEach((paths, plotIndex) => {
      this.defaultCropSprites[plotIndex] = [];
      paths.forEach((path, stage) => {
        this.loadSpriteFrame(path, (frame) => {
          if (frame) {
            this.defaultCropSprites[plotIndex][stage] = frame;
          }
          pending -= 1;
          if (pending <= 0) {
            this.isLoadingDefaultSprites = false;
          }
          const state = this.cropStates[plotIndex] ?? { growthStage: 0, visible: false };
          this.updateCrop(plotIndex, state.growthStage, state.visible);
        });
      });
    });
  }

  private refreshDefaultSprites(): void {
    for (const plotNode of this.node.children) {
      const sprite = plotNode.getComponent(Sprite);
      if (sprite && this.defaultSoilSprite && !this.soilSprite) {
        sprite.spriteFrame = this.defaultSoilSprite;
        sprite.color = Color.WHITE;
      }
    }
  }

  private loadSpriteFrame(path: string, onLoaded: (frame: SpriteFrame | null) => void): void {
    resources.load(path, SpriteFrame, (error, frame) => {
      onLoaded(error ? null : frame);
    });
  }

  private getWhiteSpriteFrame(): SpriteFrame | null {
    return builtinResMgr.get<SpriteFrame>('white-sprite') ?? null;
  }
}
