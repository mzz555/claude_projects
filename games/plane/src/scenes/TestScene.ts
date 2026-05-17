import Phaser from 'phaser';
import { PLANE_THEME, PLAY_AREA } from '../data/theme.js';
import { Enemy, makeEnemyPool } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { Bullet, makeBulletPool } from '../entities/Bullet.js';
import { EnemyBullet, makeEnemyBulletPool } from '../entities/EnemyBullet.js';
import { ENEMY_TYPE_KEYS, type EnemyTypeKey } from '../debug/debugParams.js';
import { ENEMY_TYPES } from '../data/enemyTypes.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { WeaponSystem, type ShotSpec } from '../systems/WeaponSystem.js';
import { PRIMARY } from '../data/weapons.js';
import { E } from '../events.js';

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

    constructor() {
        super('test');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);
        this.physics.world.setBounds(PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.w, PLAY_AREA.h);

        const downKeys = new Set<string>();
        const onDown = (e: KeyboardEvent): void => { downKeys.add(e.code); };
        const onUp = (e: KeyboardEvent): void => { downKeys.delete(e.code); };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        this.events.once('shutdown', () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
            this.events.off(E.EnemyKilled);
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

        // 监听 EnemyKilled → 排入 1 秒后复活队列
        this.events.on(E.EnemyKilled, (p: { x: number; y: number }) => {
            const idx = this.findSlotIndexByPos(p.x, p.y);
            if (idx >= 0) this.respawnQueue.push({ slotIdx: idx, dueAt: this.time.now + 1000 });
        });
    }

    override update(_time: number, delta: number): void {
        this.player.tickPlayer(delta);
        // 武器开火
        const specs = this.weapon.tick(delta);
        for (const spec of specs) this.fireSpec(spec);

        // 敌机 behavior tick
        this.enemies.children.iterate((obj) => {
            const e = obj as Enemy;
            if (!e.active) return null;
            e.behavior?.update(delta, this.player.x);
            return null;
        });

        // 复活
        const now = this.time.now;
        while (this.respawnQueue.length > 0 && this.respawnQueue[0]!.dueAt <= now) {
            const { slotIdx } = this.respawnQueue.shift()!;
            this.spawnSlot(slotIdx);
        }
    }

    private spawnSlot(idx: number): void {
        const slot = this.slots[idx];
        if (!slot) return;
        const e = this.enemies.get() as Enemy | null;
        if (!e) return;
        e.spawn({ x: slot.x, y: slot.y, typeKey: slot.typeKey, vy: 0 });
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
}
