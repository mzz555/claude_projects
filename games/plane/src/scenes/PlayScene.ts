import Phaser from 'phaser';
import { PLANE_THEME, PLAY_AREA } from '../data/theme.js';
import { Player } from '../entities/Player.js';
import { Bullet, makeBulletPool } from '../entities/Bullet.js';
import { Enemy, makeEnemyPool } from '../entities/Enemy.js';
import { Tracker, makeTrackerPool } from '../entities/Tracker.js';
import { Beam } from '../entities/Beam.js';
import { WeaponSystem, type BeamState, type ShotSpec } from '../systems/WeaponSystem.js';
import { WEAPONS } from '../data/weapons.js';
import { WaveDirector } from '../systems/WaveDirector.js';
import {
    updateBehavior,
    shouldConfront,
    type BehaviorTarget
} from '../systems/EnemyBehavior.js';
import { updateBossBehavior } from '../systems/BossBehavior.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { E } from '../events.js';

export class PlayScene extends Phaser.Scene {
    private player!: Player;
    private bullets!: Phaser.Physics.Arcade.Group;
    private trackers!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private weapon = new WeaponSystem();
    private beam!: Beam;
    private beamDamageBucket = 0;
    private fields: Phaser.Physics.Arcade.Image[] = [];
    private director!: WaveDirector;

    private score = 0;
    private kills = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private hpText!: Phaser.GameObjects.Text;

    constructor() {
        super('play');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);
        this.physics.world.setBounds(PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.w, PLAY_AREA.h);

        this.score = 0;
        this.kills = 0;

        const downKeys = new Set<string>();
        const onDown = (e: KeyboardEvent): void => {
            downKeys.add(e.code);
        };
        const onUp = (e: KeyboardEvent): void => {
            downKeys.delete(e.code);
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        this.events.once('shutdown', () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
        });
        const kbSource = { isKeyDown: (code: string): boolean => downKeys.has(code) };

        this.player = new Player(
            this,
            this.scale.width / 2,
            PLAY_AREA.y + PLAY_AREA.h - 80,
            kbSource
        );
        this.bullets = makeBulletPool(this, 256);
        this.trackers = makeTrackerPool(this, 32);
        this.enemies = makeEnemyPool(this, 64);
        this.beam = new Beam(this);
        this.beamDamageBucket = 0;

        this.director = new WaveDirector({
            minX: PLAY_AREA.x + 60,
            maxX: PLAY_AREA.x + PLAY_AREA.w - 60,
            randSource: Math.random
        });

        new CollisionSystem({
            scene: this,
            player: this.player,
            enemies: this.enemies,
            bullets: this.bullets
        });

        this.physics.add.overlap(this.trackers, this.enemies, (a, b) => {
            const tracker = a as Tracker;
            const enemy = b as Enemy;
            if (!tracker.active || !enemy.active) return;
            const killed = enemy.takeDamage(tracker.damage);
            tracker.deactivate();
            if (killed) {
                this.events.emit(E.EnemyKilled, {
                    enemyType: enemy.typeKey,
                    score: enemy.score,
                    x: enemy.x,
                    y: enemy.y
                });
            }
        });

        this.scoreText = this.add.text(20, 20, '', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '22px',
            color: PLANE_THEME.primary
        });
        this.hpText = this.add.text(20, 50, '', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '20px',
            color: PLANE_THEME.text
        });
        this.refreshHud();

        this.events.on(E.EnemyKilled, (p: { score: number }) => {
            this.score += p.score;
            this.kills += 1;
            this.refreshHud();
        });

        this.events.on(E.PlayerHit, (p: { damage: number }) => {
            this.player.hp = Math.max(0, this.player.hp - p.damage);
            this.refreshHud();
            if (this.player.hp <= 0) {
                this.scene.start('result', { score: this.score, kills: this.kills });
            }
        });
    }

    override update(_time: number, delta: number): void {
        this.player.tickPlayer(delta);

        if (WEAPONS[this.weapon.getLevel()]!.mode === 'beam') {
            this.handleBeam(this.weapon.tickBeam(delta), delta);
        } else {
            this.beam.hide();
            const specs = this.weapon.tick(delta);
            for (const spec of specs) this.fireSpec(spec);
        }

        const reqs = this.director.tick(delta);
        for (const r of reqs) {
            const enemy = this.enemies.get() as Enemy | null;
            if (enemy) {
                enemy.spawn({
                    x: r.x,
                    y: PLAY_AREA.y - 40,
                    typeKey: r.typeKey,
                    vy: r.vy
                });
            }
        }

        const dtSec = delta / 1000;
        const pX = this.player.x;
        this.enemies.children.iterate((obj) => {
            const e = obj as Enemy;
            if (!e.active) return null;
            const body = e.body as Phaser.Physics.Arcade.Body;
            const target: BehaviorTarget = {
                typeKey: e.typeKey,
                x: e.x,
                y: e.y,
                spawnX: e.spawnX,
                behaviorTime: e.behaviorTime,
                sweepDir: e.sweepDir,
                confronting: e.confronting,
                getVelocityX: () => body.velocity.x,
                setVelocityX: (v: number) => body.setVelocityX(v),
                getVelocityY: () => body.velocity.y,
                setVelocityY: (v: number) => body.setVelocityY(v)
            };
            updateBehavior(target, dtSec, pX);
            e.behaviorTime = target.behaviorTime;
            if (!e.confronting && shouldConfront(e.typeKey, e.y, this.player.y)) {
                e.confronting = true;
            }
            for (const fx of updateBossBehavior(e, delta)) {
                if (fx.kind === 'bomber-field') {
                    this.spawnBomberField(fx.x, fx.y);
                } else if (fx.kind === 'carrier-spawn') {
                    for (const s of fx.spawns) {
                        const child = this.enemies.get() as Enemy | null;
                        if (child) {
                            child.spawn({ typeKey: 'scout', x: s.x, y: s.y, vy: 80 });
                        }
                    }
                }
            }
            if (e.typeKey === 'interceptor') {
                if (e.x < PLAY_AREA.x + 20) e.sweepDir = 1;
                else if (e.x > PLAY_AREA.x + PLAY_AREA.w - 20) e.sweepDir = -1;
            }
            e.recycleIfOffscreen(PLAY_AREA.y + PLAY_AREA.h);
            return null;
        });

        this.bullets.children.iterate((b) => {
            (b as Bullet).recycleIfOffscreen(PLAY_AREA.y);
            return null;
        });

        this.trackers.children.iterate((obj) => {
            const t = obj as Tracker;
            if (!t.active) return null;
            const tgt = this.pickNearestEnemy(t.x, t.y);
            t.updateTracking(tgt, delta);
            return null;
        });

        // bomber 电场寿命与清理
        this.fields = this.fields.filter((f) => {
            const left = (f.getData('lifetimeMs') as number) - delta;
            if (left <= 0 || f.y > PLAY_AREA.y + PLAY_AREA.h + 100) {
                f.destroy();
                return false;
            }
            f.setData('lifetimeMs', left);
            return true;
        });
    }

    private spawnBomberField(x: number, y: number): void {
        if (!this.textures.exists('__FIELD__')) {
            const g = this.add.graphics();
            g.fillStyle(0xffaa00, 0.3);
            g.fillCircle(60, 60, 60);
            g.generateTexture('__FIELD__', 120, 120);
            g.destroy();
        }
        const field = this.physics.add.image(x, y + 80, '__FIELD__');
        (field.body as Phaser.Physics.Arcade.Body).setCircle(60);
        field.setData('damage', 2);
        field.setData('lifetimeMs', 1500);
        field.setVelocity(0, 100);
        this.fields.push(field);
        this.physics.add.overlap(this.player, field, () => {
            if (this.player.isShielded()) return;
            this.events.emit(E.PlayerHit, { damage: field.getData('damage') as number });
        });
    }

    private fireSpec(spec: ShotSpec): void {
        if (spec.kind === 'bullet') {
            const bullet = this.bullets.get() as Bullet | null;
            if (!bullet) return;
            bullet.fire({
                x: this.player.x + spec.ox,
                y: this.player.y + spec.oy,
                vx: spec.vx,
                vy: spec.vy,
                damage: spec.damage,
                color: 0x7df9ff
            });
        } else if (spec.kind === 'tracker') {
            const tracker = this.trackers.get() as Tracker | null;
            if (!tracker) return;
            tracker.fire({
                x: this.player.x + spec.ox,
                y: this.player.y + spec.oy,
                vx: spec.vx,
                vy: spec.vy,
                damage: spec.damage,
                lifetimeMs: spec.lifetimeMs ?? 5000,
                maxSpeed: 360
            });
        }
        this.events.emit(E.PlayerFire, { weaponLevel: this.weapon.getLevel() });
    }

    private handleBeam(bs: BeamState | null, deltaMs: number): void {
        if (!bs || bs.state !== 'firing') {
            this.beam.hide();
            return;
        }
        this.beam.show(this.player.x, this.player.y, bs.width);
        this.beamDamageBucket += (bs.damagePerSec * deltaMs) / 1000;
        if (this.beamDamageBucket >= 1) {
            const dmg = Math.floor(this.beamDamageBucket);
            this.beamDamageBucket -= dmg;
            const halfW = bs.width / 2;
            const beamX = this.player.x;
            this.enemies.children.iterate((obj) => {
                const e = obj as Enemy;
                if (!e.active) return null;
                if (e.x >= beamX - halfW && e.x <= beamX + halfW && e.y <= this.player.y) {
                    const killed = e.takeDamage(dmg);
                    if (killed) {
                        this.events.emit(E.EnemyKilled, {
                            enemyType: e.typeKey,
                            score: e.score,
                            x: e.x,
                            y: e.y
                        });
                    }
                }
                return null;
            });
        }
    }

    private pickNearestEnemy(
        fx: number,
        fy: number
    ): { x: number; y: number; active: boolean } | null {
        let best: Enemy | null = null;
        let bestDistSq = Infinity;
        this.enemies.children.iterate((obj) => {
            const e = obj as Enemy;
            if (!e.active) return null;
            const dSq = (e.x - fx) ** 2 + (e.y - fy) ** 2;
            if (dSq < bestDistSq) {
                best = e;
                bestDistSq = dSq;
            }
            return null;
        });
        if (!best) return null;
        return { x: (best as Enemy).x, y: (best as Enemy).y, active: true };
    }

    private refreshHud(): void {
        this.scoreText.setText(`分数 ${this.score}    击杀 ${this.kills}`);
        this.hpText.setText(`HP ${this.player.hp} / ${this.player.maxHp}`);
    }
}
