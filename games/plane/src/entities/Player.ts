import Phaser from 'phaser';
import { InputMap, type InputSource } from '@cp/core';

export type PlayerAction = 'up' | 'down' | 'left' | 'right' | 'callAlly' | 'pause';

const BASE_SPEED = 300;

export class Player extends Phaser.Physics.Arcade.Sprite {
    private inputMap: InputMap<PlayerAction>;
    hp = 100;
    maxHp = 100;
    private shieldRemainingMs = 0;
    private speedBoostRemainingMs = 0;
    private jetFlame: Phaser.GameObjects.Sprite | null = null;
    private jetPulseT = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, kbSource: InputSource) {
        super(scene, x, y, 'hero');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.setDisplaySize(64, 64);
        (this.body as Phaser.Physics.Arcade.Body).setSize(40, 40, true);

        if (scene.textures.exists('jet-flame')) {
            this.jetFlame = scene.add.sprite(x, y + 28, 'jet-flame');
            // 锚点：顶部中央 → 喷口贴飞机底部，火焰沿 +y 向下延伸
            this.jetFlame.setOrigin(0.5, 0);
            this.jetFlame.setBlendMode(Phaser.BlendModes.ADD);
            this.jetFlame.setDepth(this.depth - 1);
        }

        this.inputMap = new InputMap<PlayerAction>(kbSource);
        this.inputMap.bindKey('up', 'ArrowUp', 'KeyW');
        this.inputMap.bindKey('down', 'ArrowDown', 'KeyS');
        this.inputMap.bindKey('left', 'ArrowLeft', 'KeyA');
        this.inputMap.bindKey('right', 'ArrowRight', 'KeyD');
        this.inputMap.bindKey('callAlly', 'KeyB');
        this.inputMap.bindKey('pause', 'KeyP');
    }

    tickPlayer(dtMs: number): void {
        if (this.shieldRemainingMs > 0) {
            this.shieldRemainingMs = Math.max(0, this.shieldRemainingMs - dtMs);
        }
        if (this.speedBoostRemainingMs > 0) {
            this.speedBoostRemainingMs = Math.max(0, this.speedBoostRemainingMs - dtMs);
        }
        const speed = this.speedBoostRemainingMs > 0 ? BASE_SPEED * 1.5 : BASE_SPEED;
        this.inputMap.tick();
        const vx =
            (this.inputMap.isDown('right') ? 1 : 0) - (this.inputMap.isDown('left') ? 1 : 0);
        const vy =
            (this.inputMap.isDown('down') ? 1 : 0) - (this.inputMap.isDown('up') ? 1 : 0);
        const len = Math.hypot(vx, vy);
        const k = len > 0 ? speed / len : 0;
        this.setVelocity(vx * k, vy * k);

        if (this.jetFlame) {
            this.jetPulseT += dtMs / 1000;
            this.jetFlame.setPosition(this.x, this.y + 28);
            // 脉冲：宽度 12% 震荡，长度按加速 buff 拉长 1.5×；alpha 微跳
            const pulse = 1 + Math.sin(this.jetPulseT * 18) * 0.12;
            const lengthMul = this.speedBoostRemainingMs > 0 ? 1.5 : 1;
            // 贴图原始 887×1774，目标视觉约 28×80：宽 28/887≈0.032，高 80/1774≈0.045
            this.jetFlame.setScale(0.032 * pulse, 0.045 * lengthMul);
            this.jetFlame.setAlpha(0.85 + Math.sin(this.jetPulseT * 22) * 0.1);
        }
    }

    activateShield(durationMs: number): void {
        this.shieldRemainingMs = Math.max(this.shieldRemainingMs, durationMs);
    }

    isShielded(): boolean {
        return this.shieldRemainingMs > 0;
    }

    shieldRemaining(): number {
        return this.shieldRemainingMs;
    }

    heal(amount: number): void {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    activateSpeedBoost(durationMs: number): void {
        this.speedBoostRemainingMs = Math.max(this.speedBoostRemainingMs, durationMs);
    }

    speedBoostRemaining(): number {
        return this.speedBoostRemainingMs;
    }

    justPressedPause(): boolean {
        return this.inputMap.justPressed('pause');
    }

    justPressedCallAlly(): boolean {
        return this.inputMap.justPressed('callAlly');
    }

    needsHp(): boolean {
        return this.hp < this.maxHp - 2;
    }

    needsSpeed(): boolean {
        return this.speedBoostRemainingMs === 0;
    }

    needsShield(): boolean {
        return this.shieldRemainingMs === 0;
    }
}
