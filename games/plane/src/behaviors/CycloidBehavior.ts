import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    y: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class CycloidBehavior implements IEnemyBehavior {
    readonly id = 'cycloid';
    readonly displayName = '外摆线';
    private radius = 30;
    private angularSpeed = 4;
    private horizontalSpeed = 0;
    private descendSpeed = 60;
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
        this.cx += this.horizontalSpeed * dtSec;
        this.cy += this.descendSpeed * dtSec;
        const angle = this.angularSpeed * this.t;
        const targetX = this.cx + this.radius * Math.sin(angle);
        const targetY = this.cy + this.radius * (1 - Math.cos(angle));
        const dtSecSafe = Math.max(dtSec, 1 / 240);
        e.setVelocityX(Math.max(-500, Math.min(500, (targetX - e.x) / dtSecSafe)));
        e.setVelocityY(Math.max(-500, Math.min(500, (targetY - e.y) / dtSecSafe)));
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'radius', label: '圆半径', min: 10, max: 100, step: 5, get: () => this.radius, set: (v) => (this.radius = v) },
            { key: 'angularSpeed', label: '角速度', min: 1, max: 10, step: 0.5, get: () => this.angularSpeed, set: (v) => (this.angularSpeed = v) },
            { key: 'horizontalSpeed', label: '横向速度', min: -100, max: 100, step: 10, get: () => this.horizontalSpeed, set: (v) => (this.horizontalSpeed = v) },
            { key: 'descendSpeed', label: '下降速度', min: 10, max: 200, step: 5, get: () => this.descendSpeed, set: (v) => (this.descendSpeed = v) }
        ];
    }
}
