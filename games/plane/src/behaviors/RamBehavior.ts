import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class RamBehavior implements IEnemyBehavior {
    readonly id = 'ram';
    readonly displayName = '直冲玩家';
    private speed = 400;
    private rampTime = 0.3;
    private vyMult = 0.6;
    private t = 0;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
        this.t = 0;
    }

    update(dtMs: number, playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        this.t += dtSec;
        const ramp = Math.min(1, this.t / this.rampTime);
        const curSpeed = this.speed * ramp;
        e.setVelocityX(Math.sign(playerX - e.x) * curSpeed);
        e.setVelocityY(curSpeed * this.vyMult);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'speed', label: '冲刺速度', min: 100, max: 800, step: 20, get: () => this.speed, set: (v) => (this.speed = v) },
            { key: 'rampTime', label: '加速时间(秒)', min: 0, max: 2, step: 0.1, get: () => this.rampTime, set: (v) => (this.rampTime = v) },
            { key: 'vyMult', label: '纵向速度倍率', min: 0, max: 1, step: 0.05, get: () => this.vyMult, set: (v) => (this.vyMult = v) }
        ];
    }
}
