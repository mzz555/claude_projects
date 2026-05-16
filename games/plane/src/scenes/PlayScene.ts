import Phaser from 'phaser';
import { PLANE_THEME, PLAY_AREA } from '../data/theme.js';
import { Player } from '../entities/Player.js';
import { Bullet, makeBulletPool } from '../entities/Bullet.js';
import { Enemy, makeEnemyPool } from '../entities/Enemy.js';
import { Tracker, makeTrackerPool } from '../entities/Tracker.js';
import { Beam } from '../entities/Beam.js';
import { Ally } from '../entities/Ally.js';
import { Powerup, makePowerupPool } from '../entities/Powerup.js';
import { EnemyBullet, makeEnemyBulletPool } from '../entities/EnemyBullet.js';
import { Meteor, makeMeteorPool } from '../entities/Meteor.js';
import { AllySystem } from '../systems/AllySystem.js';
import { updateEnemyWeapon } from '../systems/EnemyWeapon.js';
import { MeteorDirector, METEOR_DROP_RATE } from '../systems/MeteorDirector.js';
import { FxSystem } from '../systems/FxSystem.js';
import { MarbleSpawner } from '../systems/MarbleSpawner.js';
import { MarblePanel } from '../entities/MarblePanel.js';
import { ENEMY_WEAPON_MAP } from '../data/enemyWeapons.js';
import { SFX } from '../data/sfxKeys.js';
import { SfxBank } from '../audio/sfxBank.js';
import {
    decideDrop,
    decideMeteorDrop,
    applyEffect,
    POWER_COOLDOWN_MS,
    type PlayerNeeds
} from '../systems/PowerupSystem.js';
import { WeaponSystem, type BeamState, type ShotSpec } from '../systems/WeaponSystem.js';
import { WEAPONS, MAX_LEVEL } from '../data/weapons.js';
import { ENEMY_TYPES, type EnemyTypeKey } from '../data/enemyTypes.js';
import type { PowerupKey } from '../data/powerups.js';
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
    private allyLeft!: Ally;
    private allyRight!: Ally;
    private allySystem = new AllySystem();
    private alliesHud!: Phaser.GameObjects.Text;
    private powerups!: Phaser.Physics.Arcade.Group;
    private powerCooldownMs = 0;
    private onscreenPowerupKeys = new Set<PowerupKey>();
    private enemyBullets!: Phaser.Physics.Arcade.Group;
    private meteors!: Phaser.Physics.Arcade.Group;
    private meteorDirector!: MeteorDirector;
    private sfx!: SfxBank;
    private marbleSpawner!: MarbleSpawner;
    private marblePanel!: MarblePanel;
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
        this.allyLeft = new Ally(this, this.player.x - 60, this.player.y);
        this.allyRight = new Ally(this, this.player.x + 60, this.player.y);
        this.allySystem = new AllySystem();
        this.powerups = makePowerupPool(this, 8);
        this.powerCooldownMs = 0;
        this.onscreenPowerupKeys = new Set<PowerupKey>();
        this.enemyBullets = makeEnemyBulletPool(this, 128);
        this.meteors = makeMeteorPool(this, 8);
        this.meteorDirector = new MeteorDirector({
            minX: PLAY_AREA.x + 40,
            maxX: PLAY_AREA.x + PLAY_AREA.w - 40,
            randSource: Math.random
        });
        this.sfx = new SfxBank(this);
        new FxSystem(this);
        this.marbleSpawner = new MarbleSpawner();
        this.marblePanel = new MarblePanel(this);

        this.director = new WaveDirector({
            minX: PLAY_AREA.x + 60,
            maxX: PLAY_AREA.x + PLAY_AREA.w - 60,
            randSource: Math.random
        });

        new CollisionSystem({
            scene: this,
            player: this.player,
            enemies: this.enemies,
            bullets: this.bullets,
            powerups: this.powerups,
            meteors: this.meteors,
            onPowerupPicked: (key) => this.handlePowerupPicked(key)
        });

        this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => {
            const bullet = b as EnemyBullet;
            if (!bullet.active) return;
            bullet.deactivate();
            if (!this.player.isShielded()) {
                this.events.emit(E.PlayerHit, { damage: bullet.damage });
            }
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
        this.alliesHud = this.add.text(20, 80, '', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '20px',
            color: PLANE_THEME.secondary
        });
        this.refreshHud();

        this.events.on(
            E.EnemyKilled,
            (p: { score: number; x: number; y: number; enemyType: string }) => {
                this.score += p.score;
                this.kills += 1;
                this.refreshHud();

                const meta = ENEMY_TYPES[p.enemyType as EnemyTypeKey];
                if (meta) {
                    const dropKey = decideDrop(
                        meta.tier,
                        this.onscreenPowerupKeys,
                        this.powerCooldownMs,
                        this.currentPlayerNeeds(),
                        Math.random
                    );
                    if (dropKey) {
                        this.spawnPowerupEntity(p.x, p.y, dropKey);
                    }
                }
            }
        );

        this.events.on(E.PlayerHit, (p: { damage: number }) => {
            this.player.hp = Math.max(0, this.player.hp - p.damage);
            this.refreshHud();
            if (this.player.hp <= 0) {
                this.scene.start('result', { score: this.score, kills: this.kills });
            }
        });

        this.events.on('meteor-broken', (p: { x: number; y: number }) => {
            this.sfx.playSfx(SFX.MeteorBreak);
            if (Math.random() < METEOR_DROP_RATE) {
                const key = decideMeteorDrop(
                    this.onscreenPowerupKeys,
                    this.powerCooldownMs,
                    this.currentPlayerNeeds(),
                    Math.random
                );
                if (key) this.spawnPowerupEntity(p.x, p.y, key);
            }
        });

        this.events.on(E.EnemyKilled, () => this.sfx.playSfx(SFX.EnemyExplode));
        this.events.on(E.PlayerHit, () => this.sfx.playSfx(SFX.PlayerHit));
        this.events.on(E.PlayerFire, () => this.sfx.playSfx(SFX.PlayerFire));
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

        // 弹珠面板推进：Zone 命中累积 → typeKey[] 注入 director
        const marbleSpawns = this.marbleSpawner.tick(delta / 1000);
        for (const tk of marbleSpawns) {
            this.director.enqueueExternal(tk);
            this.events.emit(E.MarbleSpawn, { enemyType: tk });
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
            // 敌机开火（进入屏幕后才开）
            if (e.y > PLAY_AREA.y) {
                const wkey = ENEMY_WEAPON_MAP[e.typeKey];
                if (wkey) {
                    const shots = updateEnemyWeapon(
                        e.weaponState,
                        { ex: e.x, ey: e.y, px: this.player.x, py: this.player.y },
                        delta,
                        wkey
                    );
                    for (const s of shots) {
                        const eb = this.enemyBullets.get() as EnemyBullet | null;
                        if (!eb) continue;
                        eb.fire({
                            x: e.x + s.ox,
                            y: e.y + s.oy,
                            vx: s.vx,
                            vy: s.vy,
                            damage: s.damage,
                            color: s.color
                        });
                    }
                }
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

        // 僚机召唤
        if (this.player.justPressedCallAlly()) {
            if (
                !this.allyLeft.active &&
                !this.allyRight.active &&
                this.allySystem.tryDeploy()
            ) {
                this.allyLeft.deploy({ x: this.player.x - 60, y: this.player.y });
                this.allyRight.deploy({ x: this.player.x + 60, y: this.player.y });
                this.refreshHud();
            }
        }

        const fireL = this.allyLeft.tickAlly(delta, this.player.x, this.player.y, -60);
        const fireR = this.allyRight.tickAlly(delta, this.player.x, this.player.y, 60);
        if (fireL) this.fireAllyBullet(this.allyLeft.x);
        if (fireR) this.fireAllyBullet(this.allyRight.x);

        // power 冷却推进
        if (this.powerCooldownMs > 0) {
            this.powerCooldownMs = Math.max(0, this.powerCooldownMs - delta);
        }

        // 道具漂浮 + 回池
        this.powerups.children.iterate((obj) => {
            const p = obj as Powerup;
            if (!p.active) return null;
            p.floatUpdate(delta);
            p.recycleIfOffscreen(PLAY_AREA.y + PLAY_AREA.h);
            if (!p.active) this.onscreenPowerupKeys.delete(p.powerupKey);
            return null;
        });

        // 敌机子弹回池
        this.enemyBullets.children.iterate((b) => {
            (b as EnemyBullet).recycleIfOffscreen(PLAY_AREA.y, PLAY_AREA.y + PLAY_AREA.h);
            return null;
        });

        // 陨石生成 + 回池
        const meteorReqs = this.meteorDirector.tick(delta);
        for (const r of meteorReqs) {
            const m = this.meteors.get() as Meteor | null;
            if (m) m.spawn({ x: r.x, y: PLAY_AREA.y - 60 });
        }
        this.meteors.children.iterate((m) => {
            (m as Meteor).recycleIfOffscreen(PLAY_AREA.y + PLAY_AREA.h);
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

        // 弹珠面板渲染
        this.marblePanel.draw(this.marbleSpawner.snapshot());
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

    private currentPlayerNeeds(): PlayerNeeds {
        return {
            needsHp: this.player.needsHp(),
            needsSpeed: this.player.needsSpeed(),
            needsShield: this.player.needsShield(),
            needsAlly: this.allySystem.getCharges() < 5,
            fireLevelMaxed: this.weapon.getLevel() >= MAX_LEVEL
        };
    }

    private spawnPowerupEntity(x: number, y: number, key: PowerupKey): void {
        const p = this.powerups.get() as Powerup | null;
        if (!p) return;
        p.spawn({ x, y, key });
        this.onscreenPowerupKeys.add(key);
        if (key === 'power') {
            this.powerCooldownMs = POWER_COOLDOWN_MS;
        }
    }

    private handlePowerupPicked(key: PowerupKey): void {
        this.onscreenPowerupKeys.delete(key);
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
            addAllyCharge: () => this.allySystem.addCharge()
        });
        this.events.emit(E.PowerupTaken, { kind: key });
        this.refreshHud();
    }

    private fireAllyBullet(x: number): void {
        const bullet = this.bullets.get() as Bullet | null;
        if (!bullet) return;
        bullet.fire({
            x,
            y: this.player.y - 20,
            vx: 0,
            vy: -660,
            damage: 1,
            color: 0x9d4edd
        });
    }

    private refreshHud(): void {
        const lvl = this.weapon.getLevel();
        const name = WEAPONS[lvl]?.name ?? '?';
        const overdrive = this.weapon.isOverdrive() ? ' [超频]' : '';
        const shield = this.player.isShielded() ? '  [护盾]' : '';
        this.scoreText.setText(
            `分数 ${this.score}    击杀 ${this.kills}    武器 Lv${lvl} ${name}${overdrive}`
        );
        this.hpText.setText(`HP ${this.player.hp} / ${this.player.maxHp}${shield}`);
        this.alliesHud.setText(`支援 ${this.allySystem.getCharges()}`);
    }
}
