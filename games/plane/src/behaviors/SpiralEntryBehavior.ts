import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    y: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class SpiralEntryBehavior implements IEnemyBehavior {
    readonly id = 'spiral-entry';
    readonly displayName = '螺旋飞入';
    private startRadius = 200;
    private angularSpeed = 4;
    private duration = 2.5;
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
        if (this.t < this.duration) {
            const progress = this.t / this.duration;
            const r = this.startRadius * (1 - progress);
            const angle = this.angularSpeed * this.t;
            const targetX = this.cx + r * Math.cos(angle);
            const targetY = this.cy + r * Math.sin(angle);
            const dtSecSafe = Math.max(dtSec, 1 / 240);
            e.setVelocityX(Math.max(-500, Math.min(500, (targetX - e.x) / dtSecSafe)));
            e.setVelocityY(Math.max(-500, Math.min(500, (targetY - e.y) / dtSecSafe)));
        } else {
            e.setVelocityX(0);
            e.setVelocityY(0);
        }
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'startRadius', label: '起始半径', min: 50, max: 400, step: 10, get: () => this.startRadius, set: (v) => (this.startRadius = v) },
            { key: 'angularSpeed', label: '角速度', min: 1, max: 10, step: 0.5, get: () => this.angularSpeed, set: (v) => (this.angularSpeed = v) },
            { key: 'duration', label: '持续时间(秒)', min: 0.5, max: 5, step: 0.2, get: () => this.duration, set: (v) => (this.duration = v) }
        ];
    }
}
