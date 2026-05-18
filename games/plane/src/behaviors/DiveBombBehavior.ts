import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class DiveBombBehavior implements IEnemyBehavior {
    readonly id = 'dive-bomb';
    readonly displayName = '俯冲';
    private hoverDuration = 1.5;
    private diveSpeed = 400;
    private trackingVx = 80;
    private state: 'hover' | 'dive' = 'hover';
    private t = 0;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
        this.state = 'hover';
        this.t = 0;
    }

    update(dtMs: number, playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        this.t += dtSec;
        if (this.state === 'hover') {
            if (this.t < this.hoverDuration) {
                e.setVelocityX(0);
                e.setVelocityY(0);
            } else {
                this.state = 'dive';
            }
        }
        if (this.state === 'dive') {
            const sign = playerX > e.x ? 1 : playerX < e.x ? -1 : 0;
            e.setVelocityX(sign * this.trackingVx);
            e.setVelocityY(this.diveSpeed);
        }
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'hoverDuration', label: '悬停时间(秒)', min: 0.3, max: 4, step: 0.1, get: () => this.hoverDuration, set: (v) => (this.hoverDuration = v) },
            { key: 'diveSpeed', label: '俯冲速度', min: 100, max: 800, step: 20, get: () => this.diveSpeed, set: (v) => (this.diveSpeed = v) },
            { key: 'trackingVx', label: '追踪横速', min: 0, max: 200, step: 10, get: () => this.trackingVx, set: (v) => (this.trackingVx = v) }
        ];
    }
}
