import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    y: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class RandomWalkBehavior implements IEnemyBehavior {
    readonly id = 'random-walk';
    readonly displayName = '随机游走';
    private range = 80;
    private waypointPeriod = 1.5;
    private moveSpeed = 80;
    private cx = 0;
    private cy = 0;
    private targetX = 0;
    private targetY = 0;
    private t = 0;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
        this.cx = enemy.x;
        this.cy = enemy.y;
        this.targetX = enemy.x;
        this.targetY = enemy.y;
        this.t = 0;
    }

    update(dtMs: number, _playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        this.t += dtSec;
        if (this.t >= this.waypointPeriod) {
            this.targetX = this.cx + (Math.random() - 0.5) * 2 * this.range;
            this.targetY = this.cy + (Math.random() - 0.5) * this.range;
            this.t = 0;
        }
        const dx = this.targetX - e.x;
        const dy = this.targetY - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 4) {
            e.setVelocityX(0);
            e.setVelocityY(0);
        } else {
            const inv = this.moveSpeed / dist;
            e.setVelocityX(dx * inv);
            e.setVelocityY(dy * inv);
        }
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'range', label: '游走范围', min: 10, max: 200, step: 5, get: () => this.range, set: (v) => (this.range = v) },
            { key: 'waypointPeriod', label: '换点周期(秒)', min: 0.3, max: 5, step: 0.1, get: () => this.waypointPeriod, set: (v) => (this.waypointPeriod = v) },
            { key: 'moveSpeed', label: '移速', min: 20, max: 300, step: 10, get: () => this.moveSpeed, set: (v) => (this.moveSpeed = v) }
        ];
    }
}
