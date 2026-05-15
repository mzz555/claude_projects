import Phaser from 'phaser';
import { PLANE_THEME, PLAY_AREA } from '../data/theme.js';
import { Player } from '../entities/Player.js';
import { Bullet, makeBulletPool } from '../entities/Bullet.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { WEAPONS } from '../data/weapons.js';
import { E } from '../events.js';

export class PlayScene extends Phaser.Scene {
    private player!: Player;
    private bullets!: Phaser.Physics.Arcade.Group;
    private weapon = new WeaponSystem();

    constructor() {
        super('play');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);
        this.physics.world.setBounds(PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.w, PLAY_AREA.h);

        const kbSource = {
            isKeyDown: (code: string): boolean => {
                const k = this.input.keyboard;
                if (!k) return false;
                return k.checkDown(k.addKey(code));
            }
        };

        this.player = new Player(
            this,
            this.scale.width / 2,
            PLAY_AREA.y + PLAY_AREA.h - 80,
            kbSource
        );
        this.bullets = makeBulletPool(this, 256);
    }

    override update(_time: number, delta: number): void {
        this.player.tick();

        const shots = this.weapon.tick(delta);
        for (let i = 0; i < shots; i++) {
            this.fireOnce();
        }

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
}
