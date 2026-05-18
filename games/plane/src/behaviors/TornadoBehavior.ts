import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    y: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class TornadoBehavior implements IEnemyBehavior {
    readonly id = 'tornado';
    readonly displayName = '龙卷';
    private spinRadius = 15;
    private angularSpeed = 8;
    private descendSpeed = 50;
    private maxV = 500;
    private cx = 0;
    private cy = 0;
    private t = 0;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
        this.cx = enemy.x;
        this.cy = enemy.y;
        this.t = 0;
    }

    update(dtMs: number, _playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        this.t += dtSec;
        this.cy += this.descendSpeed * dtSec;
        const targetX = this.cx + this.spinRadius * Math.cos(this.angularSpeed * this.t);
        const targetY = this.cy + this.spinRadius * Math.sin(this.angularSpeed * this.t);
        const dt = Math.max(dtSec, 1 / 240);
        const vx = Math.max(-this.maxV, Math.min(this.maxV, (targetX - e.x) / dt));
        const vy = Math.max(-this.maxV, Math.min(this.maxV, (targetY - e.y) / dt));
        e.setVelocityX(vx);
        e.setVelocityY(vy);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'spinRadius', label: '旋转半径', min: 5, max: 60, step: 1, get: () => this.spinRadius, set: (v) => (this.spinRadius = v) },
            { key: 'angularSpeed', label: '旋转速度(rad/s)', min: 1, max: 20, step: 0.5, get: () => this.angularSpeed, set: (v) => (this.angularSpeed = v) },
            { key: 'descendSpeed', label: '下降速度', min: 0, max: 200, step: 5, get: () => this.descendSpeed, set: (v) => (this.descendSpeed = v) }
        ];
    }
}
