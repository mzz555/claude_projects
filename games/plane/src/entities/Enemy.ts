import Phaser from 'phaser';
import { ENEMY_TYPES, defaultHealthBarByTier, type EnemyTypeKey } from '../data/enemyTypes.js';
import type { EnemyWeaponState } from '../systems/EnemyWeapon.js';
import { ENEMY_WEAPON_MAP, type EnemyWeaponKey } from '../data/enemyWeapons.js';
import {
    debugParams,
    type HealthBarType,
    type BulletAimMode,
    type TelegraphType,
    type AttackStep
} from '../debug/debugParams.js';
import type { EnemyShotSpec } from '../systems/EnemyWeapon.js';
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
    /** 攻击间隔覆盖（ms）。null 时用 weaponKey 默认 */
    attackIntervalMs: number | null = null;
    /** 子弹速度覆盖（px/s）。null 时用 weaponKey 默认 */
    bulletSpeed: number | null = null;
    /** 是否启用预警线 */
    telegraphEnabled = false;
    /** 预警线类型 */
    telegraphType: TelegraphType = 'line-solid';
    /** 预警时间 ms */
    telegraphMs = 500;
    /** 进行中的预警（startTelegraph 后非 null，dueAt 到了 updateTelegraph 取出 shots 并清空） */
    private pendingTelegraph: {
        shots: EnemyShotSpec[];
        aimX: number;
        aimY: number;
        startAt: number;
        dueAt: number;
        /** 启动时快照的线型（防止 pattern 切 step 时类型被改但视觉跳变） */
        type: TelegraphType;
    } | null = null;
    /** 攻击 pattern 状态：当前 step 索引 */
    private patternStepIdx = 0;
    /** 攻击 pattern 状态：当前 step 已运行 ms（或处于 gap 中的已等待 ms） */
    private patternStepElapsed = 0;
    /** 攻击 pattern 状态：是否处于 step 后的 gap 静默期 */
    private patternInGap = false;
    /** 攻击 pattern 状态：走完不 loop 时 true，永久停火 */
    private patternExhausted = false;
    private telegraphGfx: Phaser.GameObjects.Graphics;
    healthBarType: HealthBarType = 'normal';
    private healthBarGfx: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy-1');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.healthBarGfx = scene.add.graphics();
        this.healthBarGfx.setDepth(100);
        this.healthBarGfx.setVisible(false);
        this.telegraphGfx = scene.add.graphics();
        this.telegraphGfx.setDepth(50);
        this.telegraphGfx.setVisible(false);
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
        this.applyDisplaySize();
        this.bulletTextureKey = override?.bulletTexture ?? t.bulletTexture;
        this.weaponKey = (override?.weaponKey as EnemyWeaponKey | undefined)
            ?? ENEMY_WEAPON_MAP[args.typeKey]
            ?? 'single';
        this.bulletAim = override?.bulletAim ?? 'aim';
        this.attackIntervalMs = override?.attackIntervalMs ?? null;
        this.bulletSpeed = override?.bulletSpeed ?? null;
        this.telegraphEnabled = override?.telegraphEnabled ?? false;
        this.telegraphType = override?.telegraphType ?? 'line-solid';
        this.telegraphMs = override?.telegraphMs ?? 500;
        this.pendingTelegraph = null;
        this.telegraphGfx.setVisible(false).clear();
        this.patternStepIdx = 0;
        this.patternStepElapsed = 0;
        this.patternInGap = false;
        this.patternExhausted = false;
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
        const override = debugParams.enemyOverrides[this.typeKey];
        // override.hitW/H 优先（绝对覆盖默认乘积），否则用 enemyBodyRatio * perEnemyBodyRatio 的乘积
        const ratioW = override?.hitW ?? (debugParams.enemyBodyRatio * per.w);
        const ratioH = override?.hitH ?? (debugParams.enemyBodyRatio * per.h);
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

    /** 按 override 或默认计算并应用 displaySize */
    private applyDisplaySize(): void {
        const t = ENEMY_TYPES[this.typeKey];
        const override = debugParams.enemyOverrides[this.typeKey];
        // 按贴图原始 aspect ratio 算默认值，避免拉伸贴图
        const defaultW = t.w * debugParams.enemyDisplayScale;
        const srcAspect =
            this.width > 0 && this.height > 0 ? this.height / this.width : t.h / t.w;
        const defaultH = defaultW * srcAspect;
        const w = override?.displayW ?? defaultW;
        const h = override?.displayH ?? defaultH;
        this.setDisplaySize(w, h);
    }

    /** 实时改显示尺寸：写入 override 后调用 */
    refreshDisplaySize(): void {
        this.applyDisplaySize();
        this.recomputeAlphaTightBody();
    }

    /** 实时改命中框：写入 override.hitW/H 后调用 */
    refreshHitbox(): void {
        this.recomputeAlphaTightBody();
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

    setAttackInterval(ms: number | null): void {
        this.attackIntervalMs = ms;
        // 改频率时清状态，让新间隔立刻生效（避免上一拍 cooldown 已蓄到一半）
        this.weaponState = { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };
    }

    setBulletSpeed(speed: number | null): void {
        this.bulletSpeed = speed;
        // 子弹速度只影响新发射的子弹，已在场的不变；无需清 weaponState
    }

    setTelegraphEnabled(v: boolean): void {
        this.telegraphEnabled = v;
        // 关闭预警时把进行中的预警直接抛弃（不补射，避免突然冒一发）
        if (!v) {
            this.pendingTelegraph = null;
            this.telegraphGfx.setVisible(false).clear();
        }
    }

    setTelegraphType(t: TelegraphType): void {
        this.telegraphType = t;
    }

    setTelegraphMs(ms: number): void {
        this.telegraphMs = ms;
    }

    /**
     * 开始预警：锁方向（基于 shots 已计算的 vx/vy）、记录玩家位置（十字标记用）、设 dueAt。
     * overrideMs / overrideType 可选：pattern step 覆盖默认值。
     */
    startTelegraph(
        shots: EnemyShotSpec[],
        aimX: number,
        aimY: number,
        nowMs: number,
        overrideMs?: number,
        overrideType?: TelegraphType
    ): void {
        const ms = overrideMs ?? this.telegraphMs;
        const type = overrideType ?? this.telegraphType;
        this.pendingTelegraph = {
            shots,
            aimX,
            aimY,
            startAt: nowMs,
            dueAt: nowMs + ms,
            type
        };
    }

    /** 推进预警：dueAt 已到则取出 shots 并清空、隐藏预警线；否则重绘预警线 */
    updateTelegraph(nowMs: number): EnemyShotSpec[] | null {
        const p = this.pendingTelegraph;
        if (!p) return null;
        if (nowMs >= p.dueAt) {
            this.pendingTelegraph = null;
            this.telegraphGfx.setVisible(false).clear();
            return p.shots;
        }
        this.drawTelegraph(nowMs);
        return null;
    }

    private drawTelegraph(nowMs: number): void {
        const p = this.pendingTelegraph;
        if (!p) return;
        const g = this.telegraphGfx;
        g.clear();
        g.setVisible(true);
        // 接近 dueAt 越红越粗（progress 0→1）
        const progress = Math.min(1, (nowMs - p.startAt) / Math.max(1, p.dueAt - p.startAt));
        const alpha = 0.4 + 0.5 * progress;
        const width = 2 + 2 * progress;
        const color = 0xff4444;
        const LEN = 600;

        if (p.type === 'crosshair') {
            // 在锁定的玩家位置画十字
            g.lineStyle(width, color, alpha);
            const cx = p.aimX, cy = p.aimY, s = 20;
            g.beginPath();
            g.moveTo(cx - s, cy); g.lineTo(cx + s, cy);
            g.moveTo(cx, cy - s); g.lineTo(cx, cy + s);
            g.strokePath();
            return;
        }

        // line-solid / line-dash 用第一发的方向；fan 遍历所有 shots
        const list = p.type === 'fan' ? p.shots : p.shots.slice(0, 1);
        for (const s of list) {
            const v = Math.hypot(s.vx, s.vy) || 1;
            const nx = s.vx / v, ny = s.vy / v;
            const x0 = this.x, y0 = this.y;
            const x1 = x0 + nx * LEN, y1 = y0 + ny * LEN;
            if (p.type === 'line-dash') {
                // 模拟虚线：每 16px 画 8px
                const dist = Math.hypot(x1 - x0, y1 - y0);
                const seg = 16, dash = 8;
                g.lineStyle(width, color, alpha);
                let t = 0;
                while (t < dist) {
                    const a = t / dist;
                    const b = Math.min(t + dash, dist) / dist;
                    g.beginPath();
                    g.moveTo(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a);
                    g.lineTo(x0 + (x1 - x0) * b, y0 + (y1 - y0) * b);
                    g.strokePath();
                    t += seg;
                }
            } else {
                g.lineStyle(width, color, alpha);
                g.beginPath();
                g.moveTo(x0, y0); g.lineTo(x1, y1);
                g.strokePath();
            }
        }
    }

    hasPendingTelegraph(): boolean {
        return this.pendingTelegraph !== null;
    }

    /** 取消正在进行的预警（pattern 切 step 时调用，避免方向锁死） */
    cancelTelegraph(): void {
        if (this.pendingTelegraph !== null) {
            this.pendingTelegraph = null;
            this.telegraphGfx.setVisible(false).clear();
        }
    }

    /** Pattern 是否启用且非空 */
    isAttackPatternActive(): boolean {
        const ov = debugParams.enemyOverrides[this.typeKey];
        return ov?.attackPatternEnabled === true
            && ov.attackPattern !== undefined
            && ov.attackPattern.steps.length > 0;
    }

    /**
     * 推进 pattern 状态机。
     * 返回当前生效的 AttackStep（用于场景层覆盖参数），或 null 表示「本帧不开火」
     * （gap 静默 / pattern 走完不 loop / pattern 未启用）。
     * 调用方应先用 isAttackPatternActive() 判断；若 false 直接走基础攻击逻辑。
     */
    advancePattern(dtMs: number): AttackStep | null {
        const ov = debugParams.enemyOverrides[this.typeKey];
        const pat = ov?.attackPattern;
        if (!pat || pat.steps.length === 0) return null;
        if (this.patternExhausted) return null;

        // 防越界：steps 被外部删到当前 idx 超出，钳到末尾
        if (this.patternStepIdx >= pat.steps.length) {
            this.patternStepIdx = pat.loop ? 0 : pat.steps.length - 1;
        }

        this.patternStepElapsed += dtMs;

        // 大循环：本帧 dt 可能跨越多个边界（duration→gap→next-step），逐段消化
        // 安全阀：8 轮内必收敛（实际 60fps 下基本走 1 轮）
        for (let safety = 0; safety < 8; safety++) {
            const step = pat.steps[this.patternStepIdx];
            if (!step) return null;

            const threshold = this.patternInGap ? step.gapMs : step.durationMs;
            if (this.patternStepElapsed < threshold) {
                // 还在当前阶段内
                return this.patternInGap ? null : step;
            }

            // 越过本阶段边界
            this.patternStepElapsed -= threshold;
            if (!this.patternInGap) {
                // duration 结束 → 进入 gap
                this.patternInGap = true;
                this.cancelTelegraph();
                this.weaponState = { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };
            } else {
                // gap 结束 → 切下一 step
                this.patternInGap = false;
                this.patternStepIdx++;
                if (this.patternStepIdx >= pat.steps.length) {
                    if (pat.loop) {
                        this.patternStepIdx = 0;
                    } else {
                        this.patternExhausted = true;
                        return null;
                    }
                }
                this.cancelTelegraph();
                this.weaponState = { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };
            }
        }
        return null;
    }

    /** 重置 pattern 周期到 step 0 起点（DebugPanel "▶ 重置周期"按钮用） */
    resetAttackPattern(): void {
        this.patternStepIdx = 0;
        this.patternStepElapsed = 0;
        this.patternInGap = false;
        this.patternExhausted = false;
        this.cancelTelegraph();
        this.weaponState = { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };
    }

    /** 当前 step（用于 DebugPanel 显示进度条） */
    getPatternRuntimeStatus(): { stepIdx: number; elapsed: number; inGap: boolean; exhausted: boolean } {
        return {
            stepIdx: this.patternStepIdx,
            elapsed: this.patternStepElapsed,
            inGap: this.patternInGap,
            exhausted: this.patternExhausted
        };
    }

    /**
     * 应用 step 覆盖后的"本帧有效攻击参数"。
     * step=null 时返回 enemy 自身的字段（基础攻击）。
     * 场景层用这个 helper 后只用统一一套 fire 调用，不再分叉。
     */
    getEffectiveAttackParams(step: AttackStep | null): {
        weaponKey: string;
        attackIntervalMs: number | null;
        bulletSpeed: number | null;
        bulletAim: BulletAimMode;
        bulletTextureKey: string;
        telegraphEnabled: boolean;
        telegraphType: TelegraphType;
        telegraphMs: number;
    } {
        if (!step) {
            return {
                weaponKey: this.weaponKey,
                attackIntervalMs: this.attackIntervalMs,
                bulletSpeed: this.bulletSpeed,
                bulletAim: this.bulletAim,
                bulletTextureKey: this.bulletTextureKey,
                telegraphEnabled: this.telegraphEnabled,
                telegraphType: this.telegraphType,
                telegraphMs: this.telegraphMs
            };
        }
        return {
            weaponKey: step.weaponKey ?? this.weaponKey,
            attackIntervalMs: step.attackIntervalMs ?? this.attackIntervalMs,
            bulletSpeed: step.bulletSpeed ?? this.bulletSpeed,
            bulletAim: step.bulletAim ?? this.bulletAim,
            bulletTextureKey: step.bulletTexture ?? this.bulletTextureKey,
            telegraphEnabled: step.telegraphEnabled ?? this.telegraphEnabled,
            telegraphType: step.telegraphType ?? this.telegraphType,
            telegraphMs: step.telegraphMs ?? this.telegraphMs
        };
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
        this.applyDisplaySize();

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

        // 攻击间隔
        this.attackIntervalMs = override?.attackIntervalMs ?? null;

        // 子弹速度
        this.bulletSpeed = override?.bulletSpeed ?? null;

        // 预警线
        this.telegraphEnabled = override?.telegraphEnabled ?? false;
        this.telegraphType = override?.telegraphType ?? 'line-solid';
        this.telegraphMs = override?.telegraphMs ?? 500;
        this.pendingTelegraph = null;
        this.telegraphGfx.setVisible(false).clear();

        // 攻击 pattern 状态重置（新 typeKey 的 attackPattern 由 advancePattern 读 override 取）
        this.patternStepIdx = 0;
        this.patternStepElapsed = 0;
        this.patternInGap = false;
        this.patternExhausted = false;

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
        this.pendingTelegraph = null;
        this.telegraphGfx.setVisible(false).clear();
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
