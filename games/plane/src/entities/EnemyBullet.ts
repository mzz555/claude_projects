import Phaser from 'phaser';

export interface EnemyBulletSpawnArgs {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    color: number;
}

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
        this.damage = args.damage;
        this.setTint(args.color);
        this.setDisplaySize(8, 8);
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
