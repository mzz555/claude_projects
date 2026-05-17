import Phaser from 'phaser';
import { PLANE_THEME, PLAY_AREA } from '../data/theme.js';
import { Enemy, makeEnemyPool } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { Bullet, makeBulletPool } from '../entities/Bullet.js';
import { EnemyBullet, makeEnemyBulletPool } from '../entities/EnemyBullet.js';
import { ENEMY_TYPE_KEYS, type EnemyTypeKey, debugParams } from '../debug/debugParams.js';
import { ENEMY_TYPES } from '../data/enemyTypes.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { WeaponSystem, type ShotSpec } from '../systems/WeaponSystem.js';
import { updateEnemyWeapon } from '../systems/EnemyWeapon.js';
import { ENEMY_WEAPON_MAP } from '../data/enemyWeapons.js';
import { PRIMARY } from '../data/weapons.js';
import { E } from '../events.js';
import { DebugPanel } from '../debug/DebugPanel.js';

interface FixedSlot {
    typeKey: EnemyTypeKey;
    x: number;
    y: number;
}

export class TestScene extends Phaser.Scene {
    private player!: Player;
    private bullets!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private enemyBullets!: Phaser.Physics.Arcade.Group;
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
        const onDown = (e: KeyboardEvent): void => { downKeys.add(e.code); };
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

        // 7 架横向布局（顶部 1/3 位置）
        const margin = 100;
        const usableW = PLAY_AREA.w - margin * 2;
        const stepX = usableW / (ENEMY_TYPE_KEYS.length - 1);
        const rowY = PLAY_AREA.y + 140;
        ENEMY_TYPE_KEYS.forEach((typeKey, i) => {
            this.slots.push({ typeKey, x: PLAY_AREA.x + margin + stepX * i, y: rowY });
        });
        this.slots.forEach((_, i) => this.spawnSlot(i));

        // 中文名 label
        this.slots.forEach((slot) => {
            this.add.text(slot.x, slot.y + 60, ENEMY_TYPES[slot.typeKey].label, {
                fontFamily: PLANE_THEME.fontFamily,
                fontSize: '12px',
                color: '#ffaa00'
            }).setOrigin(0.5);
        });

        new CollisionSystem({
            scene: this,
            player: this.player,
            enemies: this.enemies,
            bullets: this.bullets,
            powerups: this.physics.add.group(),  // 测试场不用 powerup
            meteors: this.physics.add.group(),
            onPowerupPicked: () => {}
        });

        // 玩家被敌机子弹击中：子弹失效（测试场不发 PlayerHit 事件，避免误结算）
        this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => {
            const bullet = b as EnemyBullet;
            if (!bullet.active) return;
            bullet.deactivate();
        });

        // 监听 EnemyKilled → 排入 1 秒后复活队列
        this.events.on(E.EnemyKilled, (p: { x: number; y: number }) => {
            const idx = this.findSlotIndexByPos(p.x, p.y);
            if (idx >= 0) this.respawnQueue.push({ slotIdx: idx, dueAt: this.time.now + 1000 });
        });

        // 轨迹图层
        this.trailGfx = this.add.graphics();
        this.trailGfx.setDepth(50);

        // 调参 UI
        this.debugPanel = new DebugPanel();
        this.debugPanel.mount();
        this.debugPanel.onSwapTypeKey = (i, k) => this.swapSlotTypeKey(i, k);
        this.debugPanel.resolveSlotIdx = (x, y) => this.findSlotIndexByPos(x, y);
        this.toolbar = this.makeToolbar();

        // 敌机可点击：点击 → 选中
        this.input.on('gameobjectdown', (_pointer: unknown, obj: Phaser.GameObjects.GameObject) => {
            if (obj instanceof Enemy) this.debugPanel?.selectEnemy(obj);
        });
        // 让每架现有敌机和将来 spawn 的敌机都可交互
        this.enemies.children.iterate((obj) => {
            (obj as Enemy).setInteractive();
            return null;
        });

    }

    override update(_time: number, delta: number): void {
        this.debugPanel?.tick();

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

            // 敌机开火（测试场固定在屏内，PlayScene 的"进入屏幕后才开"条件天然满足）
            const wkey = ENEMY_WEAPON_MAP[e.typeKey];
            if (wkey) {
                const shots = updateEnemyWeapon(
                    e.weaponState,
                    { ex: e.x, ey: e.y, px: this.player.x, py: this.player.y },
                    dt,
                    wkey
                );
                const bulletTexture = e.bulletTextureKey;
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
            return null;
        });

        // 敌机子弹超出屏幕回收
        this.enemyBullets.children.iterate((b) => {
            (b as EnemyBullet).recycleIfOffscreen(PLAY_AREA.y, PLAY_AREA.y + PLAY_AREA.h);
            return null;
        });

        // 复活
        const now = this.time.now;
        while (this.respawnQueue.length > 0 && this.respawnQueue[0]!.dueAt <= now) {
            const { slotIdx } = this.respawnQueue.shift()!;
            this.spawnSlot(slotIdx);
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
    }

    swapSlotTypeKey(slotIdx: number, newKey: EnemyTypeKey): void {
        const slot = this.slots[slotIdx];
        if (!slot) return;
        slot.typeKey = newKey;
        this.enemies.children.iterate((obj) => {
            const e = obj as Enemy;
            if (!e.active) return null;
            const idx = this.findSlotIndexByPos(e.x, e.y);
            if (idx === slotIdx) e.setTypeKey(newKey);
            return null;
        });
    }

    private findSlotIndexByPos(x: number, y: number): number {
        // 半径 80px 内
        for (let i = 0; i < this.slots.length; i++) {
            const s = this.slots[i]!;
            if (Math.hypot(s.x - x, s.y - y) < 80) return i;
        }
        return -1;
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
