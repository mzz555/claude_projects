import { describe, it, expect } from 'vitest';
import { updateBehavior, type BehaviorTarget } from '../src/systems/EnemyBehavior.js';

function fake(typeKey: BehaviorTarget['typeKey'], opts: Partial<BehaviorTarget> = {}): BehaviorTarget {
    let vx = 0;
    return {
        typeKey,
        x: opts.x ?? 640,
        y: opts.y ?? 100,
        spawnX: opts.spawnX ?? 640,
        behaviorTime: 0,
        sweepDir: opts.sweepDir ?? 1,
        getVelocityX: () => vx,
        setVelocityX: (v: number) => {
            vx = v;
        }
    };
}

describe('EnemyBehavior/scout 正弦摆动', () => {
    it('behaviorTime 累加', () => {
        const e = fake('scout');
        updateBehavior(e, 0.1, 640);
        expect(e.behaviorTime).toBeCloseTo(0.1);
    });

    it('vx 在合理范围（|vx| <= 60）', () => {
        const e = fake('scout');
        for (let i = 0; i < 50; i++) updateBehavior(e, 0.05, 640);
        expect(Math.abs(e.getVelocityX())).toBeLessThanOrEqual(60);
    });
});

describe('EnemyBehavior/fighter 朝玩家漂移', () => {
    it('玩家在右边 -> vx > 0', () => {
        const e = fake('fighter', { x: 400 });
        updateBehavior(e, 0.1, 900);
        expect(e.getVelocityX()).toBeGreaterThan(0);
    });

    it('玩家在左边 -> vx < 0', () => {
        const e = fake('fighter', { x: 800 });
        updateBehavior(e, 0.1, 200);
        expect(e.getVelocityX()).toBeLessThan(0);
    });
});

describe('EnemyBehavior/interceptor 横扫', () => {
    it('|vx| 接近 240 px/s', () => {
        const e = fake('interceptor');
        updateBehavior(e, 0.016, 640);
        expect(Math.abs(e.getVelocityX())).toBeCloseTo(240, 0);
    });
});
