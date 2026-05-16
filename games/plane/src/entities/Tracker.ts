import Phaser from 'phaser';
import {
    computeTrackerSteering,
    type TrackerLike,
    type TrackerTarget
} from './tracker-steering.js';

export type { TrackerLike, TrackerTarget };
export { computeTrackerSteering };

export interface TrackerSpawnArgs {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    lifetimeMs: number;
    maxSpeed: number;
}

export class Tracker extends Phaser.Physics.Arcade.Image {
    damage = 0;
    lifetimeRemainingMs = 0;
    maxSpeed = 360;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '__TRACKER__');
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    fire(args: TrackerSpawnArgs): void {
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setPosition(args.x, args.y);
        this.setVelocity(args.vx, args.vy);
        this.damage = args.damage;
        this.lifetimeRemainingMs = args.lifetimeMs;
        this.maxSpeed = args.maxSpeed;
        this.setTint(0x9d4edd);
        this.setDisplaySize(8, 14);
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
    }

    updateTracking(target: TrackerTarget | null, dtMs: number): void {
        if (!this.active) return;
        this.lifetimeRemainingMs -= dtMs;
        if (this.lifetimeRemainingMs <= 0) {
            this.deactivate();
            return;
        }
        const body = this.body as Phaser.Physics.Arcade.Body;
        const { vx, vy } = computeTrackerSteering(
            { x: this.x, y: this.y, vx: body.velocity.x, vy: body.velocity.y },
            target,
            dtMs / 1000,
            this.maxSpeed
        );
        body.setVelocity(vx, vy);
    }
}

export function makeTrackerPool(scene: Phaser.Scene, size: number): Phaser.Physics.Arcade.Group {
    if (!scene.textures.exists('__TRACKER__')) {
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 1, 1);
        g.generateTexture('__TRACKER__', 1, 1);
        g.destroy();
    }
    const group = scene.physics.add.group({
        classType: Tracker,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: '__TRACKER__', quantity: size, active: false, visible: false });
    return group;
}
