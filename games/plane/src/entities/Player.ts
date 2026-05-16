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

    constructor(scene: Phaser.Scene, x: number, y: number, kbSource: InputSource) {
        super(scene, x, y, 'hero');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.setDisplaySize(64, 64);
        (this.body as Phaser.Physics.Arcade.Body).setSize(40, 40, true);

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
}
