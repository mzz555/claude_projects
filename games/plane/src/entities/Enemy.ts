import Phaser from 'phaser';
import { ENEMY_TYPES, defaultHealthBarByTier, type EnemyTypeKey } from '../data/enemyTypes.js';
import type { EnemyWeaponState } from '../systems/EnemyWeapon.js';
import { ENEMY_WEAPON_MAP, type EnemyWeaponKey } from '../data/enemyWeapons.js';
import { debugParams, type HealthBarType, type BulletAimMode } from '../debug/debugParams.js';
import { getAlphaBounds } from '../debug/textureBounds.js';
import { BehaviorRegistry, type IEnemyBehavior } from '../behaviors/index.js';

interface HealthBarStyle {
    w: number; h: number;
    bg: number; fill: number;
    border: number | null; borderWidth: number;
}

const HEALTH_BAR_STYLES: Record<HealthBarType, HealthBarStyle> = {
    normal: { w: 24, h: 3, bg: 0x222222, fill: 0x6fbf6f, border: null, borderWidth: 0 },
    elite:  { w: 30, h: 5, bg: 0x2a2300, fill: 0xffd700, border: 0xffaa00, borderWidth: 1 },
    epic:   { w: 36, h: 6, bg: 0x2a004a, fill: 0xcc66ff, border: 0xaa44ff, borderWidth: 1 },
    boss:   { w: 60, h: 9, bg: 0x000000, fill: 0xff2222, border: 0x660000, borderWidth: 2 }
};

export interface EnemySpawnArgs {
    x: number;
    y: number;
    typeKey: EnemyTypeKey;
    vy: number;
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    typeKey: EnemyTypeKey = 'scout';
    hp = 0;
    maxHp = 0;
    score = 0;
    dmg = 0;
    behaviorTime = 0;
    spawnX = 0;
    sweepDir: 1 | -1 = 1;
    confronting = false;
    fieldTimer = 0;
    spawnTimer = 0;
    weaponState: EnemyWeaponState = { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };
    weaponKey: EnemyWeaponKey = 'single';
    behavior: IEnemyBehavior | null = null;
    bulletTextureKey: string = '';
    bulletAim: BulletAimMode = 'aim';
    healthBarType: HealthBarType = 'normal';
    private healthBarGfx: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy-1');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.healthBarGfx = scene.add.graphics();
        this.healthBarGfx.setDepth(100);
        this.healthBarGfx.setVisible(false);
    }

    spawn(args: EnemySpawnArgs): void {
        const t = ENEMY_TYPES[args.typeKey];
        this.typeKey = args.typeKey;
        const override = debugParams.enemyOverrides[args.typeKey];
        this.hp = override?.hp ?? t.hp;
        this.maxHp = this.hp;
        this.healthBarType = override?.healthBarType ?? defaultHealthBarByTier(t.tier);
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
        this.bulletTextureKey = override?.bulletTexture ?? t.bulletTexture;
        this.weaponKey = (override?.weaponKey as EnemyWeaponKey | undefined)
            ?? ENEMY_WEAPON_MAP[args.typeKey]
            ?? 'single';
        this.bulletAim = override?.bulletAim ?? 'aim';
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

    setWeapon(key: EnemyWeaponKey): void {
        this.weaponKey = key;
        // 切武器时清状态，避免 burst 串扰
        this.weaponState = { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };
    }

    setBulletAim(mode: BulletAimMode): void {
        this.bulletAim = mode;
    }

    setTypeKey(newKey: EnemyTypeKey): void {
        this.typeKey = newKey;
        const t = ENEMY_TYPES[newKey];
        const override = debugParams.enemyOverrides[newKey];

        // 数值（重置 hp 到新 typeKey 的默认满血）
        this.hp = override?.hp ?? t.hp;
        this.maxHp = this.hp;
        this.healthBarType = override?.healthBarType ?? defaultHealthBarByTier(t.tier);
        this.score = override?.score ?? t.score;
        this.dmg = override?.dmg ?? t.dmg;

        // 贴图 + display size 重新算
        this.setTexture(t.sprite);
        const targetW = t.w * debugParams.enemyDisplayScale;
        const srcAspect =
            this.width > 0 && this.height > 0 ? this.height / this.width : t.h / t.w;
        const targetH = targetW * srcAspect;
        this.setDisplaySize(targetW, targetH);

        // 子弹
        this.bulletTextureKey = override?.bulletTexture ?? t.bulletTexture;

        // 发射方式
        this.weaponKey = (override?.weaponKey as EnemyWeaponKey | undefined)
            ?? ENEMY_WEAPON_MAP[newKey]
            ?? 'single';
        // 切武器时清状态，避免上一种武器的 burst 状态串扰
        this.weaponState = { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };

        // 子弹方向
        this.bulletAim = override?.bulletAim ?? 'aim';

        // 行为（沿用现有 setBehavior 复用）
        this.setBehavior(override?.behaviorId ?? t.behaviorId);

        // hitbox 按新贴图重算
        this.recomputeAlphaTightBody();
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
        this.behavior = null;
        this.healthBarGfx.setVisible(false);
    }

    setHealthBarType(type: HealthBarType): void {
        this.healthBarType = type;
    }

    /** 每帧由 scene update 调用，绘制头顶血条 */
    updateHealthBar(): void {
        if (!this.active) {
            this.healthBarGfx.setVisible(false);
            return;
        }
        this.healthBarGfx.setVisible(true);
        const g = this.healthBarGfx;
        g.clear();
        const style = HEALTH_BAR_STYLES[this.healthBarType];
        // 长度 = 类型基础宽 + maxHp 加成（cap 120）。类型保留视觉差异，maxHp 越大血条越长
        const w = style.w + Math.min(120, this.maxHp * 1.5);
        const h = style.h;
        const x = this.x - w / 2;
        const y = this.y - this.displayHeight / 2 - h - 6;
        const ratio = this.maxHp > 0 ? Math.max(0, Math.min(1, this.hp / this.maxHp)) : 0;
        g.fillStyle(style.bg, 1);
        g.fillRect(x, y, w, h);
        g.fillStyle(style.fill, 1);
        g.fillRect(x, y, w * ratio, h);
        if (style.border !== null) {
            g.lineStyle(style.borderWidth, style.border, 1);
            g.strokeRect(x, y, w, h);
        }
        // boss 装饰：左右尖角
        if (this.healthBarType === 'boss' && style.border !== null) {
            g.fillStyle(style.border, 1);
            g.fillTriangle(x - 4, y, x, y, x, y + h);
            g.fillTriangle(x + w + 4, y, x + w, y, x + w, y + h);
        }
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
