import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    y: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class Figure8Behavior implements IEnemyBehavior {
    readonly id = 'figure-8';
    readonly displayName = '8 字形';
    private ampX = 60;
    private ampY = 30;
    private freq = 1.0;
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
        const targetX = this.cx + this.ampX * Math.sin(2 * this.freq * this.t);
        const targetY = this.cy + this.ampY * Math.sin(this.freq * this.t);
        const dt = Math.max(dtSec, 1 / 240);
        const vx = Math.max(-this.maxV, Math.min(this.maxV, (targetX - e.x) / dt));
        const vy = Math.max(-this.maxV, Math.min(this.maxV, (targetY - e.y) / dt));
        e.setVelocityX(vx);
        e.setVelocityY(vy);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'ampX', label: 'X 振幅', min: 0, max: 150, step: 5, get: () => this.ampX, set: (v) => (this.ampX = v) },
            { key: 'ampY', label: 'Y 振幅', min: 0, max: 100, step: 5, get: () => this.ampY, set: (v) => (this.ampY = v) },
            { key: 'freq', label: '频率', min: 0.1, max: 4, step: 0.1, get: () => this.freq, set: (v) => (this.freq = v) }
        ];
    }
}
