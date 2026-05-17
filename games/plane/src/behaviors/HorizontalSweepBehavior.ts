import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    sweepDir: 1 | -1;
    confronting: boolean;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export interface HorizontalSweepOpts {
    speed?: number;
}

export class HorizontalSweepBehavior implements IEnemyBehavior {
    readonly id = 'horizontal-sweep';
    readonly displayName = '横向匀速';
    private speed: number;
    private enemy: BehaviorEnemyShape | null = null;

    constructor(opts: HorizontalSweepOpts = {}) {
        this.speed = opts.speed ?? 240;
    }

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
    }

    update(_dtMs: number, _playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        if (e.confronting) e.setVelocityY(0);
        e.setVelocityX(e.sweepDir * this.speed);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'speed', label: '横扫速度', min: 0, max: 600, step: 10, get: () => this.speed, set: (v) => (this.speed = v) }
        ];
    }
}
