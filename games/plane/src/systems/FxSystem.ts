import Phaser from 'phaser';
import { E } from '../events.js';

export const METEOR_BROKEN_EVENT = 'meteor-broken';

export class FxSystem {
    private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    constructor(private scene: Phaser.Scene) {
        if (!scene.textures.exists('__SPARK__')) {
            const g = scene.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(2, 2, 2);
            g.generateTexture('__SPARK__', 4, 4);
            g.destroy();
        }
        this.emitter = scene.add.particles(0, 0, '__SPARK__', {
            lifespan: 300,
            speed: { min: 80, max: 220 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD',
            emitting: false
        });

        scene.events.on(E.EnemyKilled, this.onEnemyKilled, this);
        scene.events.on(E.PlayerHit, this.onPlayerHit, this);
        scene.events.on(METEOR_BROKEN_EVENT, this.onMeteorBroken, this);
    }

    private onEnemyKilled(p: { x: number; y: number }): void {
        this.emitter?.emitParticleAt(p.x, p.y, 12);
        this.scene.cameras.main.shake(150, 0.005);
    }

    private onPlayerHit(): void {
        this.scene.cameras.main.shake(280, 0.012);
    }

    private onMeteorBroken(p: { x: number; y: number }): void {
        this.emitter?.emitParticleAt(p.x, p.y, 28);
        this.scene.cameras.main.shake(220, 0.008);
    }
}
