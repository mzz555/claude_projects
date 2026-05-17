import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class FlankBehavior implements IEnemyBehavior {
    readonly id = 'flank';
    readonly displayName = '迂回包抄';
    private flankSpeed = 200;
    private wrapSpeed = 150;
    private wrapAt = 100;
    private screenWidth = 1040;
    private state: 'side' | 'wrap' | 'dive' = 'side';
    private dir: 1 | -1 = 1;
    private t = 0;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
        this.state = 'side';
        this.t = 0;
        this.dir = enemy.x < this.screenWidth / 2 ? -1 : 1;
    }

    update(dtMs: number, playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        if (this.state === 'side') {
            e.setVelocityX(this.dir * this.flankSpeed);
            e.setVelocityY(0);
            if (e.x < this.wrapAt || e.x > this.screenWidth - this.wrapAt) {
                this.state = 'wrap';
                this.t = 0;
            }
        } else if (this.state === 'wrap') {
            e.setVelocityX(0);
            e.setVelocityY(this.wrapSpeed);
            this.t += dtSec;
            if (this.t >= 0.8) {
                this.state = 'dive';
            }
        } else {
            const sign = playerX > e.x ? 1 : playerX < e.x ? -1 : 0;
            e.setVelocityX(sign * 60);
            e.setVelocityY(this.wrapSpeed * 1.5);
        }
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'flankSpeed', label: '侧飞速度', min: 50, max: 400, step: 10, get: () => this.flankSpeed, set: (v) => (this.flankSpeed = v) },
            { key: 'wrapSpeed', label: '下移速度', min: 50, max: 300, step: 10, get: () => this.wrapSpeed, set: (v) => (this.wrapSpeed = v) },
            { key: 'wrapAt', label: '翻折边距', min: 40, max: 300, step: 10, get: () => this.wrapAt, set: (v) => (this.wrapAt = v) }
        ];
    }
}
