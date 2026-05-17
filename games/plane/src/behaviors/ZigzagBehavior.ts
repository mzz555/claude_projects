import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class ZigzagBehavior implements IEnemyBehavior {
    readonly id = 'zigzag';
    readonly displayName = '之字形';
    private amp = 100;
    private period = 0.8;
    private t = 0;
    private dir: 1 | -1 = 1;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
        this.t = 0;
        this.dir = 1;
    }

    update(dtMs: number, _playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        this.t += dtSec;
        if (this.t >= this.period / 2) {
            this.dir = this.dir === 1 ? -1 : 1;
            this.t = 0;
        }
        e.setVelocityX(this.dir * this.amp);
        e.setVelocityY(0);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'amp', label: '横向速度', min: 0, max: 400, step: 10, get: () => this.amp, set: (v) => (this.amp = v) },
            { key: 'period', label: '周期(秒)', min: 0.1, max: 3, step: 0.1, get: () => this.period, set: (v) => (this.period = v) }
        ];
    }
}
