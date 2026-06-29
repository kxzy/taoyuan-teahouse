import { _decorator, BlockInputEvents, Button, Color, Component, Label, Node, Sprite, SpriteFrame, tween, UITransform, Vec3, Widget, builtinResMgr } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PopupBuilder')
export class PopupBuilder extends Component {
  @property(SpriteFrame)
  dialogBg: SpriteFrame | null = null;

  @property(SpriteFrame)
  closeBtnIcon: SpriteFrame | null = null;

  @property(SpriteFrame)
  confirmBtnIcon: SpriteFrame | null = null;

  @property
  panelWidth = 520;

  @property
  panelHeight = 420;

  @property
  buttonSize = 72;

  @property
  maskOpacity = 180;

  createPopup(title: string, content: string, onConfirm: () => void): Node {
    this.node.removeAllChildren();

    const mask = new Node('Mask');
    const maskTransform = mask.addComponent(UITransform);
    maskTransform.setContentSize(720, 1280);
    const maskSprite = mask.addComponent(Sprite);
    maskSprite.spriteFrame = this.getWhiteSpriteFrame();
    maskSprite.color = new Color(0, 0, 0, this.maskOpacity);
    mask.addComponent(BlockInputEvents);
    const maskWidget = mask.addComponent(Widget);
    maskWidget.isAlignTop = true;
    maskWidget.top = 0;
    maskWidget.isAlignBottom = true;
    maskWidget.bottom = 0;
    maskWidget.isAlignLeft = true;
    maskWidget.left = 0;
    maskWidget.isAlignRight = true;
    maskWidget.right = 0;
    this.node.addChild(mask);

    const panel = new Node('Panel');
    const panelTransform = panel.addComponent(UITransform);
    panelTransform.setContentSize(this.panelWidth, this.panelHeight);
    const panelSprite = panel.addComponent(Sprite);
    panelSprite.spriteFrame = this.dialogBg ?? this.getWhiteSpriteFrame();
    panelSprite.color = this.dialogBg ? Color.WHITE : new Color(244, 231, 205, 255);
    mask.addChild(panel);
    panel.setPosition(new Vec3(0, 0, 0));
    panel.setScale(new Vec3(0.5, 0.5, 1));

    const titleNode = new Node('TitleLabel');
    const titleLabel = titleNode.addComponent(Label);
    titleLabel.string = title;
    titleLabel.fontSize = 30;
    titleLabel.lineHeight = 38;
    panel.addChild(titleNode);
    titleNode.setPosition(0, 140, 0);

    const contentNode = new Node('ContentLabel');
    const contentTransform = contentNode.addComponent(UITransform);
    contentTransform.setContentSize(400, 160);
    const contentLabel = contentNode.addComponent(Label);
    contentLabel.string = content;
    contentLabel.fontSize = 24;
    contentLabel.lineHeight = 34;
    panel.addChild(contentNode);
    contentNode.setPosition(0, 24, 0);

    const closeButton = this.createIconButton('CloseButton', this.closeBtnIcon, () => {
      this.closePopup();
    });
    panel.addChild(closeButton);
    closeButton.setPosition(new Vec3(-96, -142, 0));

    const confirmButton = this.createIconButton('ConfirmButton', this.confirmBtnIcon, () => {
      onConfirm();
      this.closePopup();
    });
    panel.addChild(confirmButton);
    confirmButton.setPosition(new Vec3(96, -142, 0));

    tween(panel)
      .to(0.18, { scale: new Vec3(1, 1, 1) })
      .start();

    return panel;
  }

  private createIconButton(name: string, icon: SpriteFrame | null, onClick: () => void): Node {
    const buttonNode = new Node(name);
    const transform = buttonNode.addComponent(UITransform);
    transform.setContentSize(this.buttonSize, this.buttonSize);
    buttonNode.addComponent(Button);

    const sprite = buttonNode.addComponent(Sprite);
    sprite.spriteFrame = icon ?? this.getWhiteSpriteFrame();
    sprite.color = icon ? Color.WHITE : new Color(215, 167, 88, 255);

    buttonNode.on(Button.EventType.CLICK, onClick);
    return buttonNode;
  }

  closePopup(): void {
    this.node.destroy();
  }

  private getWhiteSpriteFrame(): SpriteFrame | null {
    return builtinResMgr.get<SpriteFrame>('white-sprite') ?? null;
  }
}
