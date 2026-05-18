import Phaser from 'phaser';

export interface BulletSpawnArgs {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    color?: number;
    /** 可选贴图 key；若提供且与默认 bullet-hero 不同，会切贴图并清 tint（新光弹素材已自带色彩） */
    texture?: string;
}

const BULLET_TARGET_H = 40;
const BULLET_FALLBACK_W = 10;

export class Bullet extends Phaser.Physics.Arcade.Image {
    damage = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'bullet-hero');
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    fire(args: BulletSpawnArgs): void {
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setPosition(args.x, args.y);
        this.setVelocity(args.vx, args.vy);
        this.damage = args.damage;
        const tk = args.texture ?? 'bullet-hero';
        const usingCustomTexture = tk !== 'bullet-hero';
        if (this.texture.key !== tk) {
            this.setTexture(tk);
            // body sourceWidth/Height 不会自动跟随新 frame，需显式同步避免 realSize 与 displaySize 错位
            (this.body as Phaser.Physics.Arcade.Body).setSize(this.frame.width, this.frame.height);
        }
        if (usingCustomTexture) {
            // 新贴图已自带色彩，不染色；高度固定 40，宽度按原图比例缩放
            this.clearTint();
            const fw = this.frame.width;
            const fh = this.frame.height;
            const w = fh > 0 ? BULLET_TARGET_H * (fw / fh) : BULLET_FALLBACK_W;
            this.setDisplaySize(w, BULLET_TARGET_H);
        } else {
            // 旧 bullet-hero 通路：主炮本色 / 副炮蜂群染色
            const color = args.color ?? 0x7df9ff;
            if (color === 0x7df9ff) this.clearTint();
            else this.setTint(color);
            this.setDisplaySize(BULLET_FALLBACK_W, BULLET_TARGET_H);
        }
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
    }

    recycleIfOffscreen(playAreaTop: number): void {
        if (!this.active) return;
        if (this.y < playAreaTop - 50 || this.y > 720 + 50 || this.x < -50 || this.x > 1280 + 50) {
            this.deactivate();
        }
    }
}

export function makeBulletPool(scene: Phaser.Scene, size: number): Phaser.Physics.Arcade.Group {
    const group = scene.physics.add.group({
        classType: Bullet,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: 'bullet-hero', quantity: size, active: false, visible: false });
    return group;
}
