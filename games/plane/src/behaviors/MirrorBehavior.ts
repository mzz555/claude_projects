import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class MirrorBehavior implements IEnemyBehavior {
    readonly id = 'mirror';
    readonly displayName = '镜像玩家';
    private mirrorAxisX = 520;
    private trackSpeed = 150;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
    }

    update(dtMs: number, playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        const targetX = 2 * this.mirrorAxisX - playerX;
        const dx = targetX - e.x;
        const dt = Math.max(dtSec, 1 / 240);
        const vx = Math.max(-this.trackSpeed, Math.min(this.trackSpeed, dx / dt));
        e.setVelocityX(vx);
        e.setVelocityY(0);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'mirrorAxisX', label: '镜像轴 X', min: 200, max: 840, step: 20, get: () => this.mirrorAxisX, set: (v) => (this.mirrorAxisX = v) },
            { key: 'trackSpeed', label: '跟随速度', min: 20, max: 400, step: 10, get: () => this.trackSpeed, set: (v) => (this.trackSpeed = v) }
        ];
    }
}
