import Phaser from 'phaser';
import { E } from '../events.js';
import { debugParams } from '../debug/debugParams.js';

export const METEOR_BROKEN_EVENT = 'meteor-broken';

const HIT_SPARK_ANIM = 'hit-spark-burst';
const HIT_SPARK_FRAMES = 16;
const HIT_SPARK_FRAMERATE = 48;

const TEX_LIGHT = '__FX_LIGHT__';   // 半径渐变光斑（中心白 → 边缘透明）
const TEX_SPARK = '__FX_SPARK__';   // 十字星（核心 + 4 条射线）
const TEX_SMOKE = '__FX_SMOKE__';   // 不规则模糊圆（暗烟）

/**
 * 写实光效特效系统：
 *   onEnemyHit  → 击中火花 burst（核心闪光 + spark 散射，ADD blend）
 *   onEnemyKilled → 大爆炸（白闪 + 火球 + spark 飞溅 + 黑烟，4 层）
 *   onPlayerHit → 红色光晕 + camera shake
 *   onMeteorBroken → 中型爆炸（沿用 enemy explode 但烟更多）
 *
 * 所有 ADD blend 让重叠区域自动变白发光。
 * particle emitter 用完即 destroy（lifespan + 100ms 缓冲），避免泄漏。
 */
export class FxSystem {
    constructor(private scene: Phaser.Scene) {
        this.ensureTexture(TEX_LIGHT, () => this.genLightTexture(128));
        this.ensureTexture(TEX_SPARK, () => this.genSparkTexture(32));
        this.ensureTexture(TEX_SMOKE, () => this.genSmokeTexture(96));

        // 保留兼容：旧的 16 帧 hit-spark sprite sheet 动画注册（PlayScene 其他地方可能用）
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

    private ensureTexture(key: string, generator: () => void): void {
        if (!this.scene.textures.exists(key)) generator();
    }

    /** 半径渐变光斑：从中心 alpha 1 衰减到边缘 alpha 0，模拟柔光球 */
    private genLightTexture(size: number): void {
        const g = this.scene.add.graphics();
        const cx = size / 2;
        const layers = 12;
        // 多层同心圆叠加（外圈 alpha 低、内圈 alpha 高），形成柔和光斑
        for (let i = layers; i >= 1; i--) {
            const a = (i / layers) ** 2 * 0.22;
            g.fillStyle(0xffffff, a);
            g.fillCircle(cx, cx, (i / layers) * cx);
        }
        // 高光核心
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx, cx, cx * 0.18);
        g.generateTexture(TEX_LIGHT, size, size);
        g.destroy();
    }

    /** 十字星：中心实心圆 + 4 条射线，spark/碎屑的经典形状 */
    private genSparkTexture(size: number): void {
        const g = this.scene.add.graphics();
        const cx = size / 2;
        // 4 条射线（横竖）
        g.fillStyle(0xffffff, 1);
        g.fillRect(cx - 1, 1, 2, size - 2);
        g.fillRect(1, cx - 1, size - 2, 2);
        // 核心亮点
        g.fillCircle(cx, cx, 3);
        g.generateTexture(TEX_SPARK, size, size);
        g.destroy();
    }

    /** 不规则模糊圆（暗色），用于爆炸后的烟雾尾（NORMAL blend） */
    private genSmokeTexture(size: number): void {
        const g = this.scene.add.graphics();
        const cx = size / 2;
        const layers = 6;
        for (let i = layers; i >= 1; i--) {
            const a = (i / layers) ** 2 * 0.4;
            g.fillStyle(0x333333, a);
            g.fillCircle(cx, cx, (i / layers) * cx);
        }
        g.generateTexture(TEX_SMOKE, size, size);
        g.destroy();
    }

    /** 创建一次性 emitter，emit 后定时销毁（lifespan + 100ms 缓冲） */
    private oneShot(
        x: number,
        y: number,
        texture: string,
        config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
        quantity: number,
        destroyAfterMs: number
    ): void {
        const emitter = this.scene.add.particles(x, y, texture, {
            ...config,
            emitting: false
        });
        emitter.explode(quantity);
        this.scene.time.delayedCall(destroyAfterMs, () => emitter.destroy());
    }

    private onEnemyHit(p: { x: number; y: number }): void {
        if (!debugParams.fxEnabled) return;
        const k = debugParams.fxIntensity;
        // L1 核心闪光：1 个大光斑，短促 ADD
        this.oneShot(p.x, p.y, TEX_LIGHT, {
            scale: { start: 0.4 * k, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 150,
            tint: 0xffffcc,
            blendMode: 'ADD'
        }, 1, 300);
        // L2 spark 散射：10 颗向外飞，橙→红渐变
        this.oneShot(p.x, p.y, TEX_SPARK, {
            speed: { min: 100, max: 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8 * k, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: { min: 200, max: 350 },
            tint: [0xffaa44, 0xff6622, 0xff2222],
            blendMode: 'ADD'
        }, Math.round(10 * k), 500);
    }

    private onEnemyKilled(p: { x: number; y: number }): void {
        if (!debugParams.fxEnabled) return;
        const k = debugParams.fxIntensity;
        // L1 白闪：核心强光，scale 0.5 → 3.0 快速膨胀
        this.oneShot(p.x, p.y, TEX_LIGHT, {
            scale: { start: 0.5 * k, end: 3.0 * k },
            alpha: { start: 1, end: 0 },
            lifespan: 120,
            tint: 0xffffff,
            blendMode: 'ADD'
        }, 1, 300);
        // L2 火球扩散：5 个柔光球向外慢扩，黄→橙→深红
        this.oneShot(p.x, p.y, TEX_LIGHT, {
            speed: { min: 40, max: 130 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.9 * k, end: 0.3 * k },
            alpha: { start: 0.9, end: 0 },
            lifespan: 500,
            tint: [0xffee66, 0xff8822, 0xff3300],
            blendMode: 'ADD'
        }, Math.round(5 * k), 700);
        // L3 spark 飞溅：18 颗十字星向外飞，受重力下落
        this.oneShot(p.x, p.y, TEX_SPARK, {
            speed: { min: 140, max: 340 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.7 * k, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: { min: 400, max: 800 },
            gravityY: 250,
            tint: [0xffcc44, 0xff6622],
            blendMode: 'ADD'
        }, Math.round(18 * k), 1000);
        // L4 黑烟向上飘：5 个深色烟雾扩散，NORMAL blend（不发光）
        this.oneShot(p.x, p.y, TEX_SMOKE, {
            speed: { min: 20, max: 60 },
            angle: { min: -120, max: -60 },
            scale: { start: 0.6 * k, end: 1.4 * k },
            alpha: { start: 0.5, end: 0 },
            lifespan: 1200,
            tint: 0x222222
        }, Math.round(5 * k), 1400);

        this.scene.cameras.main.shake(180, 0.008);
    }

    private onPlayerHit(p: { x: number; y: number }): void {
        if (!debugParams.fxEnabled) {
            this.scene.cameras.main.shake(280, 0.012);
            return;
        }
        const k = debugParams.fxIntensity;
        // 红色冲击光晕：1 个大光斑膨胀，红色 tint
        this.oneShot(p.x, p.y, TEX_LIGHT, {
            scale: { start: 0.6 * k, end: 2.5 * k },
            alpha: { start: 1, end: 0 },
            lifespan: 180,
            tint: 0xff2222,
            blendMode: 'ADD'
        }, 1, 350);
        // 红色 spark 飞溅：8 颗
        this.oneShot(p.x, p.y, TEX_SPARK, {
            speed: { min: 80, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.7 * k, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: { min: 250, max: 450 },
            tint: [0xff4444, 0xff8866, 0xff2222],
            blendMode: 'ADD'
        }, Math.round(8 * k), 600);

        this.scene.cameras.main.shake(280, 0.012);
    }

    private onMeteorBroken(p: { x: number; y: number }): void {
        if (!debugParams.fxEnabled) return;
        const k = debugParams.fxIntensity;
        // 中型爆炸：白闪 + 灰色火球 + 大量烟（陨石碎裂感）
        this.oneShot(p.x, p.y, TEX_LIGHT, {
            scale: { start: 0.4 * k, end: 2.2 * k },
            alpha: { start: 0.9, end: 0 },
            lifespan: 150,
            tint: 0xffeecc,
            blendMode: 'ADD'
        }, 1, 350);
        this.oneShot(p.x, p.y, TEX_SPARK, {
            speed: { min: 100, max: 280 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6 * k, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: { min: 300, max: 600 },
            gravityY: 200,
            tint: [0xccaa88, 0x886644],
            blendMode: 'ADD'
        }, Math.round(14 * k), 800);
        this.oneShot(p.x, p.y, TEX_SMOKE, {
            speed: { min: 30, max: 90 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5 * k, end: 1.6 * k },
            alpha: { start: 0.6, end: 0 },
            lifespan: 1000,
            tint: 0x444444
        }, Math.round(8 * k), 1200);

        this.scene.cameras.main.shake(220, 0.008);
    }
}
