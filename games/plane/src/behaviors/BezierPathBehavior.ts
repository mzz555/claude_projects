import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    y: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class BezierPathBehavior implements IEnemyBehavior {
    readonly id = 'bezier-path';
    readonly displayName = '贝塞尔路径';
    private duration = 4.0;
    private c1ox = -100;
    private c1oy = 50;
    private c2ox = 100;
    private c2oy = 150;
    private endox = 0;
    private endoy = 300;

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

        const progress = Math.min(1, this.t / this.duration);

        const u = progress;
        const v = 1 - u;
        const targetX = this.cx
            + (3 * v * v * u * this.c1ox)
            + (3 * v * u * u * this.c2ox)
            + (u * u * u * this.endox);
        const targetY = this.cy
            + (3 * v * v * u * this.c1oy)
            + (3 * v * u * u * this.c2oy)
            + (u * u * u * this.endoy);

        if (progress >= 1) {
            e.setVelocityX(0);
            e.setVelocityY(0);
            return;
        }

        const dtSecSafe = Math.max(dtSec, 1 / 240);
        const vx = Math.max(-500, Math.min(500, (targetX - e.x) / dtSecSafe));
        const vy = Math.max(-500, Math.min(500, (targetY - e.y) / dtSecSafe));
        e.setVelocityX(vx);
        e.setVelocityY(vy);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'duration', label: '总时长(s)', min: 1, max: 10, step: 0.5, get: () => this.duration, set: (v) => (this.duration = v) },
            { key: 'c1ox', label: '控制点1 X偏移', min: -300, max: 300, step: 10, get: () => this.c1ox, set: (v) => (this.c1ox = v) },
            { key: 'c1oy', label: '控制点1 Y偏移', min: -200, max: 400, step: 10, get: () => this.c1oy, set: (v) => (this.c1oy = v) },
            { key: 'c2ox', label: '控制点2 X偏移', min: -300, max: 300, step: 10, get: () => this.c2ox, set: (v) => (this.c2ox = v) },
            { key: 'c2oy', label: '控制点2 Y偏移', min: -200, max: 400, step: 10, get: () => this.c2oy, set: (v) => (this.c2oy = v) },
            { key: 'endox', label: '终点 X偏移', min: -300, max: 300, step: 10, get: () => this.endox, set: (v) => (this.endox = v) },
            { key: 'endoy', label: '终点 Y偏移', min: 0, max: 500, step: 10, get: () => this.endoy, set: (v) => (this.endoy = v) }
        ];
    }
}
