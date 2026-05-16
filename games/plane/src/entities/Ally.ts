import Phaser from 'phaser';

export interface AllySpawnArgs {
    x: number;
    y: number;
}

const ALLY_LIFETIME_MS = 12_000;
const ALLY_FIRE_INTERVAL_MS = 333;

export class Ally extends Phaser.Physics.Arcade.Sprite {
    lifetimeRemainingMs = 0;
    fireCooldownMs = 0;
    private isAlive = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'hero');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setTint(0x9d4edd);
        this.setDisplaySize(40, 40);
        this.setActive(false);
        this.setVisible(false);
        (this.body as Phaser.Physics.Arcade.Body).setSize(28, 28, true);
        this.body!.enable = false;
    }

    deploy(args: AllySpawnArgs): void {
        this.isAlive = true;
        this.lifetimeRemainingMs = ALLY_LIFETIME_MS;
        this.fireCooldownMs = 0;
        this.setPosition(args.x, args.y);
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
    }

    deactivate(): void {
        this.isAlive = false;
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
    }

    /** 推进寿命与开火冷却；返回 true 表示本帧应开火 */
    tickAlly(dtMs: number, followX: number, followY: number, offsetX: number): boolean {
        if (!this.isAlive) return false;
        this.lifetimeRemainingMs -= dtMs;
        if (this.lifetimeRemainingMs <= 0) {
            this.deactivate();
            return false;
        }
        this.setPosition(followX + offsetX, followY);

        this.fireCooldownMs -= dtMs;
        if (this.fireCooldownMs <= 0) {
            this.fireCooldownMs = ALLY_FIRE_INTERVAL_MS;
            return true;
        }
        return false;
    }
}
