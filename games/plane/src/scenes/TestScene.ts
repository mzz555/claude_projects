import Phaser from 'phaser';
import { PLANE_THEME, PLAY_AREA } from '../data/theme.js';
import { Enemy, makeEnemyPool } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { Bullet, makeBulletPool } from '../entities/Bullet.js';
import { EnemyBullet, makeEnemyBulletPool } from '../entities/EnemyBullet.js';
import { Powerup, makePowerupPool } from '../entities/Powerup.js';
import { type EnemyTypeKey, debugParams } from '../debug/debugParams.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { WeaponSystem, type ShotSpec } from '../systems/WeaponSystem.js';
import { updateEnemyWeapon } from '../systems/EnemyWeapon.js';
import { FxSystem } from '../systems/FxSystem.js';
import { applyEffect } from '../systems/PowerupSystem.js';
import { PRIMARY, WEAPONS } from '../data/weapons.js';
import { type PowerupKey } from '../data/powerups.js';
import { E } from '../events.js';
import { DebugPanel } from '../debug/DebugPanel.js';

interface FixedSlot {
    typeKey: EnemyTypeKey;
    x: number;
    y: number;
}

interface PowerupLayoutItem {
    key: PowerupKey;
    x: number;
    y: number;
}

/** 测试场固定 powerup 位置（5 个，横向一排靠下，玩家上方 ~120px） */
const POWERUP_LAYOUT: PowerupLayoutItem[] = [
    { key: 'power',  x: PLAY_AREA.x + PLAY_AREA.w * 0.10, y: PLAY_AREA.y + PLAY_AREA.h - 200 },
    { key: 'shield', x: PLAY_AREA.x + PLAY_AREA.w * 0.30, y: PLAY_AREA.y + PLAY_AREA.h - 200 },
    { key: 'ally',   x: PLAY_AREA.x + PLAY_AREA.w * 0.50, y: PLAY_AREA.y + PLAY_AREA.h - 200 },
    { key: 'hp',     x: PLAY_AREA.x + PLAY_AREA.w * 0.70, y: PLAY_AREA.y + PLAY_AREA.h - 200 },
    { key: 'speed',  x: PLAY_AREA.x + PLAY_AREA.w * 0.90, y: PLAY_AREA.y + PLAY_AREA.h - 200 }
];

const POWERUP_RESPAWN_MS = 2000;

export class TestScene extends Phaser.Scene {
    private player!: Player;
    private bullets!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private enemyBullets!: Phaser.Physics.Arcade.Group;
    private powerups!: Phaser.Physics.Arcade.Group;
    private powerupRespawnQueue: { layoutIdx: number; dueAt: number }[] = [];
    private weapon = new WeaponSystem();
    private slots: FixedSlot[] = [];
    private respawnQueue: { slotIdx: number; dueAt: number }[] = [];
    private debugPanel: DebugPanel | null = null;
    private toolbar: HTMLDivElement | null = null;
    private trailGfx!: Phaser.GameObjects.Graphics;
    private trailHistory: Phaser.Math.Vector2[] = [];
    private readonly TRAIL_MAX = 60;

    constructor() {
        super('test');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);
        this.physics.world.setBounds(PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.w, PLAY_AREA.h);

        // 进入测试场强制重置时间相关状态，避免上次离开时残留
        debugParams.paused = false;
        debugParams.timeScale = 1.0;
        this.physics.world.timeScale = 1.0;

        const downKeys = new Set<string>();
        const onDown = (e: KeyboardEvent): void => {
            downKeys.add(e.code);
            if (e.code === 'F1') {
                e.preventDefault();
                debugParams.showHitbox = !debugParams.showHitbox;
                this.debugPanel?.render();
            }
        };
        const onUp = (e: KeyboardEvent): void => { downKeys.delete(e.code); };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        this.events.once('shutdown', () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
            this.events.off(E.EnemyKilled);
            this.debugPanel?.unmount();
            this.toolbar?.remove();
            this.debugPanel = null;
            this.toolbar = null;
        });
        const kbSource = { isKeyDown: (code: string): boolean => downKeys.has(code) };
        this.player = new Player(this, this.scale.width / 2, PLAY_AREA.y + PLAY_AREA.h - 80, kbSource);

        this.bullets = makeBulletPool(this, 256);
        this.enemies = makeEnemyPool(this, 16);
        this.enemyBullets = makeEnemyBulletPool(this, 128);
        this.powerups = makePowerupPool(this, POWERUP_LAYOUT.length);

        // 1 对 1 模式：场上只有 1 架敌机，类型完全由调参面板"敌机类别"下拉控制
        this.slots.push({
            typeKey: 'scout',
            x: PLAY_AREA.x + PLAY_AREA.w / 2,
            y: PLAY_AREA.y + 180
        });
        // spawn 放到 DebugPanel mount 之后，这样 spawnSlot 里 selectEnemy 才能生效

        new CollisionSystem({
            scene: this,
            player: this.player,
            enemies: this.enemies,
            bullets: this.bullets,
            powerups: this.powerups,
            meteors: this.physics.add.group(),
            onPowerupPicked: (key) => this.handlePowerupPicked(key),
            // 测试场：玩家从敌机身上穿过去，不触发反应（敌机不能因为撞机消失，否则没法继续观察）
            disablePlayerEnemyCollision: true
        });

        // spawn 5 个固定位置 powerup
        for (let i = 0; i < POWERUP_LAYOUT.length; i++) this.spawnFixedPowerup(i);

        // 玩家被敌机子弹击中：子弹失效 + 发 PlayerHit（不扣血，但让 FxSystem 演特效）
        this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => {
            const bullet = b as EnemyBullet;
            if (!bullet.active) return;
            bullet.deactivate();
            this.events.emit(E.PlayerHit, {
                damage: 0,
                x: this.player.x,
                y: this.player.y
            });
        });

        // 测试场也加 FxSystem（看升级版特效）
        new FxSystem(this);

        // 监听 EnemyKilled → 排入 1 秒后复活（1 对 1 模式恒为 slot 0）
        this.events.on(E.EnemyKilled, () => {
            this.respawnQueue.push({ slotIdx: 0, dueAt: this.time.now + 1000 });
        });

        // 轨迹图层
        this.trailGfx = this.add.graphics();
        this.trailGfx.setDepth(50);

        // 调参 UI
        this.debugPanel = new DebugPanel();
        this.debugPanel.mount();
        this.debugPanel.onSwapTypeKey = (i, k) => this.swapSlotTypeKey(i, k);
        this.debugPanel.resolveSlotIdx = () => 0;  // 1 对 1 模式恒为 slot 0
        this.toolbar = this.makeToolbar();

        // 现在 DebugPanel 已 mount，spawn 那架敌机（spawnSlot 内部会 selectEnemy）
        this.spawnSlot(0);

        // 敌机可点击：点击 → 选中（1 对 1 模式下只一架，自动选中后这个仍可用）
        this.input.on('gameobjectdown', (_pointer: unknown, obj: Phaser.GameObjects.GameObject) => {
            if (obj instanceof Enemy) this.debugPanel?.selectEnemy(obj);
        });

    }

    override update(_time: number, delta: number): void {
        this.debugPanel?.tick();

        // 同步命中框可视化（F1 / checkbox 切换 → physics 引擎）
        const world = this.physics.world;
        if (debugParams.showHitbox && !world.debugGraphic) {
            world.createDebugGraphic();
        }
        world.drawDebug = debugParams.showHitbox;
        if (world.debugGraphic) world.debugGraphic.setVisible(debugParams.showHitbox);

        // 暂停：DOM 面板仍可交互
        if (debugParams.paused) return;
        const dt = delta * debugParams.timeScale;

        this.player.tickPlayer(dt);
        const specs = this.weapon.tick(dt);
        for (const spec of specs) this.fireSpec(spec);

        this.enemies.children.iterate((obj) => {
            const e = obj as Enemy;
            if (!e.active) return null;
            e.behavior?.update(dt, this.player.x);
            e.updateHealthBar();

            // 攻击 pattern 推进：启用时拿 activeStep，决定是否开火 + 用哪套参数
            const patternActive = e.isAttackPatternActive();
            const activeStep = patternActive ? e.advancePattern(dt) : null;
            const canFire = !patternActive || activeStep !== null;
            const eff = e.getEffectiveAttackParams(activeStep);

            // 敌机开火（测试场固定在屏内，PlayScene 的"进入屏幕后才开"条件天然满足）
            // 预警进行中：跳过 updateEnemyWeapon 推进，等延迟结束再发
            if (canFire && eff.weaponKey && !e.hasPendingTelegraph()) {
                // bulletAim='straight' 时把 px/py 设为正下方一点，让 aimDirection 返回 (0, 1)
                const aimCtx = eff.bulletAim === 'straight'
                    ? { ex: e.x, ey: e.y, px: e.x, py: e.y + 100 }
                    : { ex: e.x, ey: e.y, px: this.player.x, py: this.player.y };
                const shots = updateEnemyWeapon(
                    e.weaponState,
                    aimCtx,
                    dt,
                    eff.weaponKey as import('../data/enemyWeapons.js').EnemyWeaponKey,
                    eff.attackIntervalMs ?? undefined,
                    eff.bulletSpeed ?? undefined
                );
                if (shots.length > 0) {
                    if (eff.telegraphEnabled) {
                        e.startTelegraph(
                            shots, this.player.x, this.player.y, this.time.now,
                            eff.telegraphMs, eff.telegraphType
                        );
                    } else {
                        this.fireEnemyShots(e, shots, eff.bulletTextureKey);
                    }
                }
            }
            // 推进预警：到点取出 shots 真发射
            const due = e.updateTelegraph(this.time.now);
            if (due) this.fireEnemyShots(e, due);
            return null;
        });

        // 敌机子弹超出屏幕回收
        this.enemyBullets.children.iterate((b) => {
            (b as EnemyBullet).recycleIfOffscreen(PLAY_AREA.y, PLAY_AREA.y + PLAY_AREA.h);
            return null;
        });

        // 玩家子弹超出屏幕回收（M6-fix17 修复：之前漏了这段，导致 32s 后子弹池耗尽，玩家停射）
        this.bullets.children.iterate((b) => {
            (b as Bullet).recycleIfOffscreen(PLAY_AREA.y);
            return null;
        });

        // 道具脉冲 / 旋转动画
        this.powerups.children.iterate((p) => {
            (p as Powerup).floatUpdate(delta);
            return null;
        });

        // 复活
        const now = this.time.now;
        while (this.respawnQueue.length > 0 && this.respawnQueue[0]!.dueAt <= now) {
            const { slotIdx } = this.respawnQueue.shift()!;
            this.spawnSlot(slotIdx);
        }

        // powerup 复活
        for (let i = this.powerupRespawnQueue.length - 1; i >= 0; i--) {
            if (this.powerupRespawnQueue[i]!.dueAt <= now) {
                const { layoutIdx } = this.powerupRespawnQueue.splice(i, 1)[0]!;
                this.spawnFixedPowerup(layoutIdx);
            }
        }

        // 轨迹可视化
        this.trailGfx.clear();
        const selectedKey = debugParams.selectedEnemyTypeKey;
        if (selectedKey) {
            let target: Enemy | null = null;
            this.enemies.children.iterate((obj) => {
                const e = obj as Enemy;
                if (e.active && e.typeKey === selectedKey) target = e;
                return null;
            });
            if (target) {
                const t = target as Enemy;
                this.trailHistory.push(new Phaser.Math.Vector2(t.x, t.y));
                if (this.trailHistory.length > this.TRAIL_MAX) this.trailHistory.shift();
                this.trailGfx.lineStyle(2, 0xffaa00, 0.5);
                this.trailGfx.beginPath();
                this.trailHistory.forEach((p, i) => {
                    if (i === 0) this.trailGfx.moveTo(p.x, p.y);
                    else this.trailGfx.lineTo(p.x, p.y);
                });
                this.trailGfx.strokePath();
            } else {
                this.trailHistory.length = 0;
            }
        } else {
            this.trailHistory.length = 0;
        }
    }

    private spawnSlot(idx: number): void {
        const slot = this.slots[idx];
        if (!slot) return;
        const e = this.enemies.get() as Enemy | null;
        if (!e) return;
        e.spawn({ x: slot.x, y: slot.y, typeKey: slot.typeKey, vy: 0 });
        e.setInteractive();
        // 1 对 1 模式：复活后自动选中，让 DebugPanel 跟着这架走
        this.debugPanel?.selectEnemy(e);
    }

    swapSlotTypeKey(slotIdx: number, newKey: EnemyTypeKey): void {
        const slot = this.slots[slotIdx];
        if (!slot) return;
        slot.typeKey = newKey;
        // 1 对 1 模式：所有 active enemy（其实只 1 架）都跟着切
        this.enemies.children.iterate((obj) => {
            const e = obj as Enemy;
            if (e.active) e.setTypeKey(newKey);
            return null;
        });
    }

    /** 在固定位置生成 powerup（静止悬浮，不下落） */
    private spawnFixedPowerup(idx: number): void {
        const item = POWERUP_LAYOUT[idx];
        if (!item) return;
        const p = this.powerups.get() as Powerup | null;
        if (!p) return;
        const args: { x: number; y: number; key: PowerupKey; nextLevel?: number } = {
            x: item.x, y: item.y, key: item.key
        };
        if (item.key === 'power') {
            const lvl = this.weapon.getLevel();
            args.nextLevel = lvl >= WEAPONS.length - 1 ? 6 : lvl + 1;
        }
        p.spawn(args);
        p.setVelocity(0, 0);  // 覆盖 Powerup.spawn 内的 vy=80，让它静止悬浮
    }

    /** 测试场拾取处理：调 applyEffect 真升级 + 排入 2 秒复活队列 */
    private handlePowerupPicked(key: PowerupKey): void {
        applyEffect(key, {
            weapon: {
                getLevel: () => this.weapon.getLevel(),
                setLevel: (lvl) => this.weapon.setLevel(lvl),
                enterOverdrive: () => this.weapon.enterOverdrive(),
                maxLevel: WEAPONS.length - 1
            },
            player: {
                activateShield: (ms) => this.player.activateShield(ms),
                heal: (n) => this.player.heal(n),
                activateSpeedBoost: (ms) => this.player.activateSpeedBoost(ms)
            },
            addAllyCharge: () => {}  // 测试场无 allySystem，noop
        });
        const layoutIdx = POWERUP_LAYOUT.findIndex((it) => it.key === key);
        if (layoutIdx >= 0) {
            this.powerupRespawnQueue.push({ layoutIdx, dueAt: this.time.now + POWERUP_RESPAWN_MS });
        }
    }

    private fireEnemyShots(
        e: Enemy,
        shots: import('../systems/EnemyWeapon.js').EnemyShotSpec[],
        textureKey?: string
    ): void {
        const bulletTexture = textureKey ?? e.bulletTextureKey;
        for (const s of shots) {
            const eb = this.enemyBullets.get() as EnemyBullet | null;
            if (!eb) continue;
            eb.fire({
                x: e.x + s.ox,
                y: e.y + s.oy,
                vx: s.vx,
                vy: s.vy,
                damage: s.damage,
                texture: bulletTexture
            });
        }
    }

    private fireSpec(spec: ShotSpec): void {
        const bullet = this.bullets.get() as Bullet | null;
        if (!bullet) return;
        const args: import('../entities/Bullet.js').BulletSpawnArgs = {
            x: this.player.x + (spec.ox ?? 0),
            y: this.player.y + (spec.oy ?? 0),
            vx: spec.vx ?? 0,
            vy: spec.vy ?? -600,
            damage: spec.damage ?? PRIMARY.damage
        };
        if (spec.color !== undefined) args.color = spec.color;
        bullet.fire(args);
    }

    private makeToolbar(): HTMLDivElement {
        const bar = document.createElement('div');
        bar.id = '__plane_toolbar__';
        bar.style.cssText = `
            position: fixed; bottom: 8px; left: 50%; transform: translateX(-50%); z-index: 9999;
            background: rgba(0, 16, 24, 0.92); padding: 6px 10px; border-radius: 4px;
            border: 1px solid #1a4a5a; display: flex; gap: 8px; align-items: center;
            font: 12px monospace;
        `;
        const mkBtn = (text: string, onClick: () => void): HTMLButtonElement => {
            const b = document.createElement('button');
            b.textContent = text;
            b.style.cssText = 'background: #1a4a5a; color: #fff; border: 1px solid #2a6a7a; padding: 4px 10px; cursor: pointer; border-radius: 2px;';
            b.onclick = onClick;
            return b;
        };
        const pauseBtn = mkBtn('⏸ 暂停', () => {
            debugParams.paused = !debugParams.paused;
            // Phaser Arcade 物理引擎独立于 scene.update()，必须显式 pause/resume 才能停子弹/敌机的物理位移
            if (debugParams.paused) this.physics.world.pause();
            else this.physics.world.resume();
            pauseBtn.textContent = debugParams.paused ? '▶ 继续' : '⏸ 暂停';
        });
        bar.appendChild(pauseBtn);

        // Phaser 物理 timeScale 是分母：1=正常，4=慢4倍
        bar.appendChild(mkBtn('🐢 慢放 ×0.25', () => {
            debugParams.timeScale = 0.25;
            this.physics.world.timeScale = 4.0;
        }));
        bar.appendChild(mkBtn('🐇 正常 ×1', () => {
            debugParams.timeScale = 1.0;
            this.physics.world.timeScale = 1.0;
        }));
        bar.appendChild(mkBtn('🔄 重置全部', () => {
            this.enemies.children.iterate((obj) => {
                (obj as Enemy).deactivate();
                return null;
            });
            this.slots.forEach((_, i) => this.spawnSlot(i));
            // 重新让新 spawn 的可交互
            this.enemies.children.iterate((obj) => {
                (obj as Enemy).setInteractive();
                return null;
            });
        }));
        bar.appendChild(mkBtn('🧹 清空子弹', () => {
            this.bullets.children.iterate((b) => { (b as Bullet).deactivate(); return null; });
            this.enemyBullets.children.iterate((b) => { (b as EnemyBullet).deactivate(); return null; });
        }));
        bar.appendChild(mkBtn('↩ 返回菜单', () => this.scene.start('title')));
        document.body.appendChild(bar);
        return bar;
    }
}
