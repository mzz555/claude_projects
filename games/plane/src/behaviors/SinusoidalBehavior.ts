import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    spawnX: number;
    behaviorTime: number;
    confronting: boolean;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class SinusoidalBehavior implements IEnemyBehavior {
    readonly id = 'sinusoidal';
    readonly displayName = '正弦摆动';
    private amp = 25;
    private freq = 2;
    private maxVx = 60;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
    }

    update(dtMs: number, _playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        e.behaviorTime += dtSec;
        if (e.confronting) e.setVelocityY(0);
        const targetX = e.spawnX + Math.sin(e.behaviorTime * this.freq) * this.amp;
        const dx = targetX - e.x;
        const vx = Math.max(-this.maxVx, Math.min(this.maxVx, dx / Math.max(dtSec, 1 / 240)));
        e.setVelocityX(vx);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'amp', label: '振幅', min: 0, max: 200, step: 1, get: () => this.amp, set: (v) => (this.amp = v) },
            { key: 'freq', label: '频率', min: 0.1, max: 8, step: 0.1, get: () => this.freq, set: (v) => (this.freq = v) },
            { key: 'maxVx', label: '最大 vx', min: 0, max: 400, step: 10, get: () => this.maxVx, set: (v) => (this.maxVx = v) }
        ];
    }
}
