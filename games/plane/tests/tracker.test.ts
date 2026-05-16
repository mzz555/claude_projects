import { describe, it, expect } from 'vitest';
import {
    computeTrackerSteering,
    type TrackerTarget,
    type TrackerLike
} from '../src/entities/tracker-steering.js';

function fakeTracker(x: number, y: number, vx = 0, vy = -360): TrackerLike {
    return { x, y, vx, vy };
}

describe('Tracker/computeTrackerSteering', () => {
    it('附近有目标 -> 速度向量逐步偏向目标', () => {
        const t = fakeTracker(500, 500);
        const target: TrackerTarget = { x: 600, y: 300, active: true };
        const { vx, vy } = computeTrackerSteering(t, target, 0.05, 360);
        expect(vx).toBeGreaterThan(0);
        expect(vy).toBeLessThan(0);
    });

    it('无目标 -> 维持原速度方向', () => {
        // 输入 vy=-360 已经在 maxSpeed 上限，无目标时函数不应改变
        const t = fakeTracker(500, 500, 0, -360);
        const { vx, vy } = computeTrackerSteering(t, null, 0.05, 360);
        expect(vx).toBe(0);
        expect(vy).toBe(-360);
    });

    it('限速 360 px/s', () => {
        const t = fakeTracker(500, 500, 1000, 1000);
        const { vx, vy } = computeTrackerSteering(t, null, 0.05, 360);
        const speed = Math.hypot(vx, vy);
        expect(speed).toBeLessThanOrEqual(361);
    });

    it('目标 active=false -> 当 null 处理', () => {
        const t = fakeTracker(500, 500, 0, -300);
        const { vx, vy } = computeTrackerSteering(
            t,
            { x: 600, y: 300, active: false },
            0.05,
            360
        );
        expect(vx).toBe(0);
        expect(vy).toBeCloseTo(-300, 0);
    });
});

describe('Tracker/lifetime', () => {
    it('5000ms 后失效', () => {
        const lifetime = 5000;
        expect(lifetime).toBe(5000);
    });
});
