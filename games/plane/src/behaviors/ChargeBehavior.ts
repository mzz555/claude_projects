import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class ChargeBehavior implements IEnemyBehavior {
    readonly id = 'charge';
    readonly displayName = '蓄力冲锋';
    private chargeTime = 1.0;
    private dashDuration = 0.6;
    private dashSpeed = 350;
    private state: 'charge' | 'dash' = 'charge';
    private t = 0;
    private dashDirX = 0;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
        this.state = 'charge';
        this.t = 0;
        this.dashDirX = 0;
    }

    update(dtMs: number, playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        this.t += dtSec;
        if (this.state === 'charge') {
            e.setVelocityX(0);
            e.setVelocityY(0);
            if (this.t >= this.chargeTime) {
                this.dashDirX = playerX > e.x ? 1 : playerX < e.x ? -1 : 0;
                this.state = 'dash';
                this.t = 0;
            }
        } else {
            e.setVelocityX(this.dashDirX * this.dashSpeed);
            e.setVelocityY(this.dashSpeed * 0.3);
            if (this.t >= this.dashDuration) {
                this.state = 'charge';
                this.t = 0;
            }
        }
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'chargeTime', label: '蓄力时间(秒)', min: 0.2, max: 3, step: 0.1, get: () => this.chargeTime, set: (v) => (this.chargeTime = v) },
            { key: 'dashDuration', label: '冲刺时长(秒)', min: 0.2, max: 2, step: 0.1, get: () => this.dashDuration, set: (v) => (this.dashDuration = v) },
            { key: 'dashSpeed', label: '冲刺速度', min: 100, max: 600, step: 20, get: () => this.dashSpeed, set: (v) => (this.dashSpeed = v) }
        ];
    }
}
