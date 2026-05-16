import Phaser from 'phaser';
import { ENEMY_TYPES, type EnemyTypeKey } from '../data/enemyTypes.js';
import type { EnemyWeaponState } from '../systems/EnemyWeapon.js';

/** 敌机贴图缩放：原 enemyTypes.ts 数据是原版 v9.0 px 尺寸（23~84），新版 1280×720 画布下显得偏小，×4 放大 */
const ENEMY_DISPLAY_SCALE = 4;

export interface EnemySpawnArgs {
    x: number;
    y: number;
    typeKey: EnemyTypeKey;
    vy: number;
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    typeKey: EnemyTypeKey = 'scout';
    hp = 0;
    score = 0;
    dmg = 0;
    behaviorTime = 0;
    spawnX = 0;
    sweepDir: 1 | -1 = 1;
    confronting = false;
    fieldTimer = 0;
    spawnTimer = 0;
    weaponState: EnemyWeaponState = { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy-1');
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    spawn(args: EnemySpawnArgs): void {
        const t = ENEMY_TYPES[args.typeKey];
        this.typeKey = args.typeKey;
        this.hp = t.hp;
        this.score = t.score;
        this.dmg = t.dmg;
        this.behaviorTime = 0;
        this.spawnX = args.x;
        this.sweepDir = Math.random() < 0.5 ? 1 : -1;
        this.confronting = false;
        this.fieldTimer = 0;
        this.spawnTimer = 0;
        this.weaponState = { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };

        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setTexture(t.sprite);
        const dw = t.w * ENEMY_DISPLAY_SCALE;
        const dh = t.h * ENEMY_DISPLAY_SCALE;
        this.setDisplaySize(dw, dh);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(dw * 0.8, dh * 0.8, true);
        this.setPosition(args.x, args.y);
        this.setVelocity(0, args.vy);
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
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
        if (this.y > playAreaBottom + 100) {
            this.deactivate();
        }
    }
}

export function makeEnemyPool(scene: Phaser.Scene, size: number): Phaser.Physics.Arcade.Group {
    const group = scene.physics.add.group({
        classType: Enemy,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: 'enemy-1', quantity: size, active: false, visible: false });
    return group;
}
