import { _decorator, Component, Node, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CustomerTest')
export class CustomerTest extends Component {
    @property(Sprite)
    scholarSprite: Sprite | null = null;

    @property(SpriteFrame)
    scholarWait: SpriteFrame | null = null;

    @property(SpriteFrame)
    scholarDrink: SpriteFrame | null = null;

    @property(SpriteFrame)
    scholarHappy: SpriteFrame | null = null;

    @property(Node)
    orderBubble: Node | null = null;

    onClickBrew() {
        if (this.scholarSprite && this.scholarWait) {
            this.scholarSprite.spriteFrame = this.scholarWait;
        }
        if (this.orderBubble) {
            this.orderBubble.active = true;
        }
    }

    onClickServe() {
        if (this.scholarSprite && this.scholarDrink) {
            this.scholarSprite.spriteFrame = this.scholarDrink;
        }
        if (this.orderBubble) {
            this.orderBubble.active = false;
        }

        if (this.scholarSprite && this.scholarHappy) {
            this.scheduleOnce(() => {
                if (this.scholarSprite) {
                    this.scholarSprite.spriteFrame = this.scholarHappy;
                }
            }, 1);
        }
    }
}
