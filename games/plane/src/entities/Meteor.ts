import Phaser from 'phaser';

export interface MeteorSpawnArgs {
    x: number;
    y: number;
}

export const METEOR_HP = 20;
export const METEOR_DAMAGE = 3;

export class Meteor extends Phaser.Physics.Arcade.Sprite {
    hp = METEOR_HP;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '__METEOR__');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setTint(0x886655);
        this.setDisplaySize(40, 40);
    }

    spawn(args: MeteorSpawnArgs): void {
        this.hp = METEOR_HP;
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setPosition(args.x, args.y);
        this.setVelocity(0, 180);
        this.setAngularVelocity(60);
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
        this.setAngularVelocity(0);
    }

    takeDamage(amount: number): boolean {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.deactivate();
            return true;
        }
        return false;
    }

    recycleIfOffscreen(playAreaBottom: number): void {
        if (!this.active) return;
        if (this.y > playAreaBottom + 80) {
            this.deactivate();
        }
    }
}

export function makeMeteorPool(scene: Phaser.Scene, size: number): Phaser.Physics.Arcade.Group {
    if (!scene.textures.exists('__METEOR__')) {
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(20, 20, 20);
        g.generateTexture('__METEOR__', 40, 40);
        g.destroy();
    }
    const group = scene.physics.add.group({
        classType: Meteor,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: '__METEOR__', quantity: size, active: false, visible: false });
    return group;
}
