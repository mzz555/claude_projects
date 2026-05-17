import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    behaviorTime: number;
    confronting: boolean;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class HoverBehavior implements IEnemyBehavior {
    readonly id = 'hover';
    readonly displayName = '悬停摆动';
    private confrontAmp = 30;
    private confrontFreq = 0.8;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
    }

    update(dtMs: number, _playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        e.behaviorTime += dtSec;
        if (e.confronting) {
            e.setVelocityY(0);
            e.setVelocityX(Math.sin(e.behaviorTime * this.confrontFreq) * this.confrontAmp);
        } else {
            e.setVelocityX(0);
        }
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'confrontAmp', label: '对峙振幅', min: 0, max: 200, step: 1, get: () => this.confrontAmp, set: (v) => (this.confrontAmp = v) },
            { key: 'confrontFreq', label: '对峙频率', min: 0.1, max: 4, step: 0.1, get: () => this.confrontFreq, set: (v) => (this.confrontFreq = v) }
        ];
    }
}
