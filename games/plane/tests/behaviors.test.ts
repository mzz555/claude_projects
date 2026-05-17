import { describe, it, expect } from 'vitest';
import { SinusoidalBehavior } from '../src/behaviors/SinusoidalBehavior.js';
import { PlayerTrackerBehavior } from '../src/behaviors/PlayerTrackerBehavior.js';
import { HorizontalSweepBehavior } from '../src/behaviors/HorizontalSweepBehavior.js';
import { HoverBehavior } from '../src/behaviors/HoverBehavior.js';

// Phaser Sprite 在测试环境难造，给 behavior 一个最小的 mock enemy
function mockEnemy(over: Partial<{ x: number; spawnX: number; confronting: boolean; sweepDir: 1 | -1 }> = {}) {
    let vx = 0;
    let vy = 100;
    return {
        x: 640,
        y: 200,
        spawnX: 640,
        behaviorTime: 0,
        sweepDir: 1 as 1 | -1,
        confronting: false,
        getVelocityX: () => vx,
        setVelocityX: (v: number) => { vx = v; },
        getVelocityY: () => vy,
        setVelocityY: (v: number) => { vy = v; },
        ...over
    };
}

describe('SinusoidalBehavior (scout)', () => {
    it('正弦摆动：spawnX ± 25px 范围内', () => {
        const e = mockEnemy({ x: 640, spawnX: 640 });
        const b = new SinusoidalBehavior();
        b.init(e as never);
        b.update(500, 640);
        expect(typeof e.getVelocityX()).toBe('number');
    });
});

describe('PlayerTrackerBehavior (fighter/elite)', () => {
    it('玩家在左 → vx 为负；玩家在右 → vx 为正', () => {
        const e = mockEnemy({ x: 640 });
        const b = new PlayerTrackerBehavior({ trackSpeed: 80 });
        b.init(e as never);
        b.update(16, 400);
        expect(e.getVelocityX()).toBeLessThan(0);
        b.update(16, 800);
        expect(e.getVelocityX()).toBeGreaterThan(0);
    });
});

describe('HorizontalSweepBehavior (interceptor)', () => {
    it('vx = sweepDir × speed', () => {
        const e = mockEnemy({ sweepDir: 1 });
        const b = new HorizontalSweepBehavior({ speed: 240 });
        b.init(e as never);
        b.update(16, 640);
        expect(e.getVelocityX()).toBe(240);
    });
});

describe('HoverBehavior (cruiser/bomber/carrier)', () => {
    it('对峙时小幅摆动，否则 vx=0', () => {
        const e1 = mockEnemy({ confronting: false });
        const b1 = new HoverBehavior();
        b1.init(e1 as never);
        b1.update(16, 640);
        expect(e1.getVelocityX()).toBe(0);

        const e2 = mockEnemy({ confronting: true });
        const b2 = new HoverBehavior();
        b2.init(e2 as never);
        b2.update(500, 640);
        expect(typeof e2.getVelocityX()).toBe('number');
    });
});
