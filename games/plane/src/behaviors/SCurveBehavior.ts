import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class SCurveBehavior implements IEnemyBehavior {
    readonly id = 's-curve';
    readonly displayName = 'S 形入场';
    private amp = 100;
    private freq = 0.6;
    private vy = 60;
    private cx = 0;
    private t = 0;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
        this.cx = enemy.x;
        this.t = 0;
    }

    update(dtMs: number, _playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        this.t += dtSec;
        const targetX = this.cx + this.amp * Math.sin(this.freq * 2 * Math.PI * this.t);
        const dx = targetX - e.x;
        const dtSecSafe = Math.max(dtSec, 1 / 240);
        e.setVelocityX(Math.max(-300, Math.min(300, dx / dtSecSafe)));
        e.setVelocityY(this.vy);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'amp', label: '横向幅度', min: 10, max: 200, step: 5, get: () => this.amp, set: (v) => (this.amp = v) },
            { key: 'freq', label: '频率(Hz)', min: 0.1, max: 3, step: 0.1, get: () => this.freq, set: (v) => (this.freq = v) },
            { key: 'vy', label: '下移速度', min: 0, max: 200, step: 5, get: () => this.vy, set: (v) => (this.vy = v) }
        ];
    }
}
