import Phaser from 'phaser';
import { POWERUPS, type PowerupKey } from '../data/powerups.js';

export interface PowerupSpawnArgs {
    x: number;
    y: number;
    key: PowerupKey;
}

export class Powerup extends Phaser.Physics.Arcade.Image {
    powerupKey: PowerupKey = 'power';
    private floatPhase = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '__POWERUP__');
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    spawn(args: PowerupSpawnArgs): void {
        const p = POWERUPS[args.key];
        this.powerupKey = args.key;
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setTint(Phaser.Display.Color.HexStringToColor(p.color).color);
        this.setDisplaySize(28, 28);
        this.setPosition(args.x, args.y);
        this.setVelocity(0, 80);
        this.floatPhase = Math.random() * Math.PI * 2;
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
    }

    floatUpdate(dtMs: number): void {
        if (!this.active) return;
        this.floatPhase += (dtMs / 1000) * 2;
        this.scaleX = 1 + Math.sin(this.floatPhase) * 0.1;
    }

    recycleIfOffscreen(playAreaBottom: number): void {
        if (!this.active) return;
        if (this.y > playAreaBottom + 50) {
            this.deactivate();
        }
    }
}

export function makePowerupPool(scene: Phaser.Scene, size: number): Phaser.Physics.Arcade.Group {
    if (!scene.textures.exists('__POWERUP__')) {
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 1, 1);
        g.generateTexture('__POWERUP__', 1, 1);
        g.destroy();
    }
    const group = scene.physics.add.group({
        classType: Powerup,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: '__POWERUP__', quantity: size, active: false, visible: false });
    return group;
}
