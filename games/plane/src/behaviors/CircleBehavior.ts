import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    y: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class CircleBehavior implements IEnemyBehavior {
    readonly id = 'circle';
    readonly displayName = '圆周环绕';
    private radius = 60;
    private angularSpeed = 1.5;
    private maxV = 300;
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
        const targetX = this.cx + this.radius * Math.cos(this.angularSpeed * this.t);
        const targetY = this.cy + this.radius * Math.sin(this.angularSpeed * this.t);
        const dt = Math.max(dtSec, 1 / 240);
        const vx = Math.max(-this.maxV, Math.min(this.maxV, (targetX - e.x) / dt));
        const vy = Math.max(-this.maxV, Math.min(this.maxV, (targetY - e.y) / dt));
        e.setVelocityX(vx);
        e.setVelocityY(vy);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'radius', label: '半径', min: 10, max: 200, step: 5, get: () => this.radius, set: (v) => (this.radius = v) },
            { key: 'angularSpeed', label: '角速度(rad/s)', min: 0.1, max: 6, step: 0.1, get: () => this.angularSpeed, set: (v) => (this.angularSpeed = v) }
        ];
    }
}
