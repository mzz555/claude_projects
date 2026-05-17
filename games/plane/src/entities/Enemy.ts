import Phaser from 'phaser';
import { ENEMY_TYPES, type EnemyTypeKey } from '../data/enemyTypes.js';
import type { EnemyWeaponState } from '../systems/EnemyWeapon.js';
import { debugParams } from '../debug/debugParams.js';
import { getAlphaBounds } from '../debug/textureBounds.js';
import { BehaviorRegistry, type IEnemyBehavior } from '../behaviors/index.js';

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
    behavior: IEnemyBehavior | null = null;
    bulletTextureKey: string = '';

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy-1');
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    spawn(args: EnemySpawnArgs): void {
        const t = ENEMY_TYPES[args.typeKey];
        this.typeKey = args.typeKey;
        const override = debugParams.enemyOverrides[args.typeKey];
        this.hp = override?.hp ?? t.hp;
        this.score = override?.score ?? t.score;
        this.dmg = override?.dmg ?? t.dmg;
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
        // 按贴图原始 aspect ratio 缩放：以 t.w*SCALE 作为目标显示宽度，高度跟随贴图自然比例
        // （ENEMY_TYPES 里的 w/h 是原版 v9.0 卡通飞机比例，与新美术高清贴图比例不一致，
        //  直接 setDisplaySize(dw, dh) 会强行拉伸贴图，并造成命中框与视觉机体形状对不上）
        const targetW = t.w * debugParams.enemyDisplayScale;
        const srcAspect =
            this.width > 0 && this.height > 0 ? this.height / this.width : t.h / t.w;
        const targetH = targetW * srcAspect;
        this.setDisplaySize(targetW, targetH);
        this.bulletTextureKey = t.bulletTexture;
        this.recomputeAlphaTightBody();
        this.setPosition(args.x, args.y);
        this.setVelocity(0, args.vy);
        // 优先用 debugParams.enemyOverrides[typeKey].behaviorId（测试场覆写），否则用 ENEMY_TYPES 默认
        const behaviorId = override?.behaviorId ?? t.behaviorId;
        this.behavior = BehaviorRegistry.instance.create(behaviorId);
        this.behavior?.init(this as never);
    }

    private recomputeAlphaTightBody(): void {
        const t = ENEMY_TYPES[this.typeKey];
        const body = this.body as Phaser.Physics.Arcade.Body;
        const bounds = getAlphaBounds(this.scene, t.sprite);
        const per = debugParams.perEnemyBodyRatio[this.typeKey] ?? { w: 1, h: 1 };
        const ratioW = debugParams.enemyBodyRatio * per.w;
        const ratioH = debugParams.enemyBodyRatio * per.h;
        if (bounds) {
            const bw = bounds.w * ratioW;
            const bh = bounds.h * ratioH;
            // 微调时保持 alpha 包围盒中心不变
            const offX = bounds.x + (bounds.w - bw) / 2;
            const offY = bounds.y + (bounds.h - bh) / 2;
            body.setSize(bw, bh, false);
            body.setOffset(offX, offY);
        } else {
            body.setSize(this.width * ratioW, this.height * ratioH, true);
        }
    }

    setBehavior(behaviorId: string): void {
        this.behavior = BehaviorRegistry.instance.create(behaviorId);
        this.behavior?.init(this as never);
    }

    setBulletTexture(key: string): void {
        this.bulletTextureKey = key;
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
        this.behavior = null;
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
