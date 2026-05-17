import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    confronting: boolean;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export interface PlayerTrackerOpts {
    trackSpeed?: number;
}

export class PlayerTrackerBehavior implements IEnemyBehavior {
    readonly id = 'player-tracker';
    readonly displayName = '追踪玩家';
    private trackSpeed: number;
    private enemy: BehaviorEnemyShape | null = null;

    constructor(opts: PlayerTrackerOpts = {}) {
        this.trackSpeed = opts.trackSpeed ?? 80;
    }

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
    }

    update(_dtMs: number, playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        if (e.confronting) e.setVelocityY(0);
        const dx = playerX - e.x;
        const speed = Math.sign(dx) * Math.min(this.trackSpeed, Math.abs(dx) * 4);
        e.setVelocityX(speed);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'trackSpeed', label: '追踪速度', min: 0, max: 400, step: 10, get: () => this.trackSpeed, set: (v) => (this.trackSpeed = v) }
        ];
    }
}
