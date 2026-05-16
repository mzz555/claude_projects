import Phaser from 'phaser';
import { E } from '../events.js';

export const METEOR_BROKEN_EVENT = 'meteor-broken';

const HIT_SPARK_ANIM = 'hit-spark-burst';
const HIT_SPARK_FRAMES = 16;
const HIT_SPARK_FRAMERATE = 48;

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

        if (scene.textures.exists('hit-spark') && !scene.anims.exists(HIT_SPARK_ANIM)) {
            scene.anims.create({
                key: HIT_SPARK_ANIM,
                frames: scene.anims.generateFrameNumbers('hit-spark', {
                    start: 0,
                    end: HIT_SPARK_FRAMES - 1
                }),
                frameRate: HIT_SPARK_FRAMERATE,
                repeat: 0
            });
        }

        scene.events.on(E.EnemyKilled, this.onEnemyKilled, this);
        scene.events.on(E.EnemyHit, this.onEnemyHit, this);
        scene.events.on(E.PlayerHit, this.onPlayerHit, this);
        scene.events.on(METEOR_BROKEN_EVENT, this.onMeteorBroken, this);
    }

    private onEnemyKilled(p: { x: number; y: number }): void {
        this.emitter?.emitParticleAt(p.x, p.y, 12);
        this.scene.cameras.main.shake(150, 0.005);
    }

    private onEnemyHit(p: { x: number; y: number }): void {
        if (!this.scene.textures.exists('hit-spark')) return;
        const spark = this.scene.add.sprite(p.x, p.y, 'hit-spark', 0);
        spark.setBlendMode(Phaser.BlendModes.ADD);
        spark.setDisplaySize(40, 28); // 按帧 260×180 原始比例缩到 40×28
        spark.play(HIT_SPARK_ANIM);
        spark.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spark.destroy());
    }

    private onPlayerHit(): void {
        this.scene.cameras.main.shake(280, 0.012);
    }

    private onMeteorBroken(p: { x: number; y: number }): void {
        this.emitter?.emitParticleAt(p.x, p.y, 28);
        this.scene.cameras.main.shake(220, 0.008);
    }
}
