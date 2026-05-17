import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class PulseBehavior implements IEnemyBehavior {
    readonly id = 'pulse';
    readonly displayName = '脉冲停走';
    private moveDuration = 0.6;
    private stopDuration = 0.4;
    private moveSpeed = 180;
    private state: 'moving' | 'stopped' = 'moving';
    private t = 0;
    private dir: 1 | -1 = 1;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
        this.state = 'moving';
        this.t = 0;
        this.dir = Math.random() < 0.5 ? 1 : -1;
    }

    update(dtMs: number, _playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        this.t += dtSec;
        if (this.state === 'moving') {
            e.setVelocityX(this.dir * this.moveSpeed);
            if (this.t >= this.moveDuration) {
                this.state = 'stopped';
                this.t = 0;
            }
        } else {
            e.setVelocityX(0);
            if (this.t >= this.stopDuration) {
                this.state = 'moving';
                this.dir = this.dir === 1 ? -1 : 1;
                this.t = 0;
            }
        }
        e.setVelocityY(0);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'moveDuration', label: '移动时长(秒)', min: 0.1, max: 2, step: 0.05, get: () => this.moveDuration, set: (v) => (this.moveDuration = v) },
            { key: 'stopDuration', label: '停止时长(秒)', min: 0.1, max: 2, step: 0.05, get: () => this.stopDuration, set: (v) => (this.stopDuration = v) },
            { key: 'moveSpeed', label: '移速', min: 20, max: 400, step: 10, get: () => this.moveSpeed, set: (v) => (this.moveSpeed = v) }
        ];
    }
}
