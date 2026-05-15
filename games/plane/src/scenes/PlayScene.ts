import Phaser from 'phaser';
import { PLANE_THEME, PLAY_AREA } from '../data/theme.js';
import { Player } from '../entities/Player.js';
import { Bullet, makeBulletPool } from '../entities/Bullet.js';
import { Enemy, makeEnemyPool } from '../entities/Enemy.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { WaveDirector } from '../systems/WaveDirector.js';
import { updateBehavior, type BehaviorTarget } from '../systems/EnemyBehavior.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { WEAPONS } from '../data/weapons.js';
import { E } from '../events.js';

export class PlayScene extends Phaser.Scene {
    private player!: Player;
    private bullets!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private weapon = new WeaponSystem();
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
        this.enemies = makeEnemyPool(this, 64);

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
        this.player.tick();

        const shots = this.weapon.tick(delta);
        for (let i = 0; i < shots; i++) this.fireOnce();

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
            const target: BehaviorTarget = {
                typeKey: e.typeKey,
                x: e.x,
                y: e.y,
                spawnX: e.spawnX,
                behaviorTime: e.behaviorTime,
                sweepDir: e.sweepDir,
                getVelocityX: () => (e.body as Phaser.Physics.Arcade.Body).velocity.x,
                setVelocityX: (v: number) =>
                    (e.body as Phaser.Physics.Arcade.Body).setVelocityX(v)
            };
            updateBehavior(target, dtSec, pX);
            e.behaviorTime = target.behaviorTime;
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
    }

    private fireOnce(): void {
        const bullet = this.bullets.get() as Bullet | null;
        if (!bullet) return;
        const weapon = WEAPONS[this.weapon.getLevel()]!;
        bullet.fire({
            x: this.player.x,
            y: this.player.y - 30,
            vx: 0,
            vy: -weapon.bulletSpeed,
            damage: weapon.damage,
            color: 0x7df9ff
        });
        this.events.emit(E.PlayerFire, { weaponLevel: this.weapon.getLevel() });
    }

    private refreshHud(): void {
        this.scoreText.setText(`分数 ${this.score}    击杀 ${this.kills}`);
        this.hpText.setText(`HP ${this.player.hp} / ${this.player.maxHp}`);
    }
}
