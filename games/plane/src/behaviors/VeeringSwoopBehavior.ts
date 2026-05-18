import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class VeeringSwoopBehavior implements IEnemyBehavior {
    readonly id = 'veering-swoop';
    readonly displayName = '侧偏俯冲';
    private hoverDuration = 1.0;
    private swoopSpeed = 350;
    private veeringAmp = 200;
    private state: 'hover' | 'swoop' = 'hover';
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
                this.state = 'swoop';
            }
        }
        if (this.state === 'swoop') {
            e.setVelocityY(this.swoopSpeed);
            const rawVx = (playerX - e.x) * 1.5;
            const clampedVx = Math.max(-this.veeringAmp, Math.min(this.veeringAmp, rawVx));
            e.setVelocityX(clampedVx);
        }
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'hoverDuration', label: '悬停时间(秒)', min: 0.3, max: 3, step: 0.1, get: () => this.hoverDuration, set: (v) => (this.hoverDuration = v) },
            { key: 'swoopSpeed', label: '俯冲速度', min: 100, max: 600, step: 20, get: () => this.swoopSpeed, set: (v) => (this.swoopSpeed = v) },
            { key: 'veeringAmp', label: '侧偏上限', min: 50, max: 400, step: 10, get: () => this.veeringAmp, set: (v) => (this.veeringAmp = v) }
        ];
    }
}
