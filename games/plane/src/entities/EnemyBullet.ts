import Phaser from 'phaser';
import { debugParams, type EnemyBulletTextureKey } from '../debug/debugParams.js';

export interface EnemyBulletSpawnArgs {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    texture: string;
}

const DEFAULT_BULLET_SIZE: [number, number] = [66, 90];

export class EnemyBullet extends Phaser.Physics.Arcade.Image {
    damage = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '__BULLET__');
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    fire(args: EnemyBulletSpawnArgs): void {
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setPosition(args.x, args.y);
        this.setVelocity(args.vx, args.vy);
        // 贴图自然朝下（PI/2），rotation = atan2(vy,vx) - PI/2 让子弹"头"指向 velocity 方向
        this.setRotation(Math.atan2(args.vy, args.vx) - Math.PI / 2);
        this.damage = args.damage;
        if (this.scene.textures.exists(args.texture)) {
            this.setTexture(args.texture);
            this.clearTint();
            const key = args.texture as EnemyBulletTextureKey;
            const [w, h] = debugParams.bulletSize[key] ?? DEFAULT_BULLET_SIZE;
            this.setDisplaySize(w, h);
            // 命中框收一点，避免方形包围盒外擦也算中
            (this.body as Phaser.Physics.Arcade.Body).setSize(w * 0.6, h * 0.6, true);
        } else {
            this.setTexture('__BULLET__');
            this.setDisplaySize(8, 8);
        }
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
    }

    recycleIfOffscreen(playAreaTop: number, playAreaBottom: number): void {
        if (!this.active) return;
        if (
            this.y < playAreaTop - 50 ||
            this.y > playAreaBottom + 50 ||
            this.x < -50 ||
            this.x > 1280 + 50
        ) {
            this.deactivate();
        }
    }
}

export function makeEnemyBulletPool(
    scene: Phaser.Scene,
    size: number
): Phaser.Physics.Arcade.Group {
    if (!scene.textures.exists('__BULLET__')) {
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 1, 1);
        g.generateTexture('__BULLET__', 1, 1);
        g.destroy();
    }
    const group = scene.physics.add.group({
        classType: EnemyBullet,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: '__BULLET__', quantity: size, active: false, visible: false });
    return group;
}
