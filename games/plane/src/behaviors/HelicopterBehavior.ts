import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class HelicopterBehavior implements IEnemyBehavior {
    readonly id = 'helicopter';
    readonly displayName = '升降式';
    private descendStep = 80;
    private descendDuration = 0.6;
    private hoverDuration = 1.0;
    private strafeAmp = 100;
    private state: 'descend' | 'hover' = 'descend';
    private t = 0;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
        this.state = 'descend';
        this.t = 0;
    }

    update(dtMs: number, _playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        this.t += dtSec;
        if (this.state === 'descend') {
            if (this.t < this.descendDuration) {
                e.setVelocityY(this.descendStep / this.descendDuration);
                e.setVelocityX(0);
            } else {
                this.state = 'hover';
                this.t = 0;
            }
        } else {
            // hover
            if (this.t < this.hoverDuration) {
                e.setVelocityY(0);
                e.setVelocityX(Math.sin(this.t * 3) * this.strafeAmp);
            } else {
                this.state = 'descend';
                this.t = 0;
            }
        }
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'descendStep', label: '下降步距', min: 20, max: 200, step: 10, get: () => this.descendStep, set: (v) => (this.descendStep = v) },
            { key: 'descendDuration', label: '下降时长(秒)', min: 0.2, max: 2, step: 0.1, get: () => this.descendDuration, set: (v) => (this.descendDuration = v) },
            { key: 'hoverDuration', label: '悬停时长(秒)', min: 0.3, max: 3, step: 0.1, get: () => this.hoverDuration, set: (v) => (this.hoverDuration = v) },
            { key: 'strafeAmp', label: '扫荡幅度', min: 0, max: 200, step: 5, get: () => this.strafeAmp, set: (v) => (this.strafeAmp = v) }
        ];
    }
}
