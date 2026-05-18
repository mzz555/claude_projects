import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

type LoopState = 'dive' | 'arc' | 'return' | 'dive2' | 'gone';

export class LoopBackBehavior implements IEnemyBehavior {
    readonly id = 'loop-back';
    readonly displayName = '俯冲回头';
    private diveSpeed = 350;
    private diveDuration = 0.6;
    private arcRadius = 80;
    private arcDuration = 1.0;
    private returnSpeed = 200;
    private returnDuration = 0.8;

    private state: LoopState = 'dive';
    private t = 0;
    private sideDir = 1;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
        this.state = 'dive';
        this.t = 0;
        this.sideDir = enemy.x < 520 ? 1 : -1;
    }

    update(dtMs: number, playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        this.t += dtSec;

        switch (this.state) {
            case 'dive': {
                const vxDir = playerX - e.x > 0 ? 1 : -1;
                e.setVelocityX(vxDir * 60);
                e.setVelocityY(this.diveSpeed);
                if (this.t >= this.diveDuration) {
                    this.state = 'arc';
                    this.t = 0;
                }
                break;
            }
            case 'arc': {
                const progress = this.t / this.arcDuration;
                const vx = this.sideDir * this.arcRadius * Math.cos(progress * Math.PI) * Math.PI / this.arcDuration;
                const vy = -this.arcRadius * Math.sin(progress * Math.PI) * Math.PI / this.arcDuration;
                e.setVelocityX(vx);
                e.setVelocityY(vy);
                if (this.t >= this.arcDuration) {
                    this.state = 'return';
                    this.t = 0;
                }
                break;
            }
            case 'return': {
                e.setVelocityX(0);
                e.setVelocityY(-this.returnSpeed);
                if (this.t >= this.returnDuration) {
                    this.state = 'dive2';
                    this.t = 0;
                }
                break;
            }
            case 'dive2': {
                const vxDir = playerX - e.x > 0 ? 1 : -1;
                e.setVelocityX(vxDir * 60);
                e.setVelocityY(this.diveSpeed);
                if (this.t >= this.diveDuration) {
                    this.state = 'gone';
                    this.t = 0;
                }
                break;
            }
            case 'gone': {
                e.setVelocityX(0);
                e.setVelocityY(0);
                break;
            }
        }
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'diveSpeed', label: '俯冲速度', min: 100, max: 600, step: 20, get: () => this.diveSpeed, set: (v) => (this.diveSpeed = v) },
            { key: 'arcRadius', label: '弧线半径', min: 40, max: 200, step: 10, get: () => this.arcRadius, set: (v) => (this.arcRadius = v) },
            { key: 'returnSpeed', label: '回升速度', min: 50, max: 400, step: 20, get: () => this.returnSpeed, set: (v) => (this.returnSpeed = v) }
        ];
    }
}
