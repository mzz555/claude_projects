import { describe, it, expect } from 'vitest';
import { SinusoidalBehavior } from '../src/behaviors/SinusoidalBehavior.js';
import { PlayerTrackerBehavior } from '../src/behaviors/PlayerTrackerBehavior.js';
import { HorizontalSweepBehavior } from '../src/behaviors/HorizontalSweepBehavior.js';
import { shouldConfront, type BehaviorTarget } from '../src/systems/EnemyBehavior.js';

function mockEnemy(over: Partial<BehaviorTarget> = {}): BehaviorTarget {
    let vx = 0;
    let vy = 0;
    return {
        typeKey: 'scout',
        x: 640,
        y: 100,
        spawnX: 640,
        behaviorTime: 0,
        sweepDir: 1,
        confronting: false,
        getVelocityX: () => vx,
        setVelocityX: (v: number) => { vx = v; },
        getVelocityY: () => vy,
        setVelocityY: (v: number) => { vy = v; },
        ...over
    };
}

describe('SinusoidalBehavior (scout) 正弦摆动', () => {
    it('vx 在合理范围（|vx| <= 60）', () => {
        const e = mockEnemy({ x: 640, spawnX: 640 });
        const b = new SinusoidalBehavior();
        b.init(e as never);
        for (let i = 0; i < 50; i++) b.update(50, 640);
        expect(Math.abs(e.getVelocityX())).toBeLessThanOrEqual(60);
    });
});

describe('PlayerTrackerBehavior (fighter) 朝玩家漂移', () => {
    it('玩家在右边 -> vx > 0', () => {
        const e = mockEnemy({ x: 400 });
        const b = new PlayerTrackerBehavior({ trackSpeed: 80 });
        b.init(e as never);
        b.update(100, 900);
        expect(e.getVelocityX()).toBeGreaterThan(0);
    });

    it('玩家在左边 -> vx < 0', () => {
        const e = mockEnemy({ x: 800 });
        const b = new PlayerTrackerBehavior({ trackSpeed: 80 });
        b.init(e as never);
        b.update(100, 200);
        expect(e.getVelocityX()).toBeLessThan(0);
    });
});

describe('HorizontalSweepBehavior (interceptor) 横扫', () => {
    it('|vx| 接近 240 px/s', () => {
        const e = mockEnemy({ sweepDir: 1 });
        const b = new HorizontalSweepBehavior({ speed: 240 });
        b.init(e as never);
        b.update(16, 640);
        expect(Math.abs(e.getVelocityX())).toBeCloseTo(240, 0);
    });
});

describe('shouldConfront', () => {
    it('距离不足时不对峙', () => {
        expect(shouldConfront('scout', 100, 200)).toBe(false);
    });
});
