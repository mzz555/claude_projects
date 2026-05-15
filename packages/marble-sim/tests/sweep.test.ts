import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

const cfg = { bounds: { x: 0, y: 0, w: 1000, h: 1000 }, gravity: 0, bounce: 1 };

describe('marble-sim/Sweep 圆-线段碰撞', () => {
    it('水平球碰上水平臂法向反弹', () => {
        const w = new World(cfg);
        w.addBall({ pos: { x: 500, y: 520 }, vel: { x: 0, y: -200 }, r: 5 });
        w.addSweep({ pivot: { x: 400, y: 500 }, length: 200, omega: 0, angle: 0 });
        for (let i = 0; i < 20; i++) w.step(1 / 60);
        const b = w.snapshot().balls[0]!;
        expect(b.vel.y).toBeGreaterThan(0);
    });

    it('远离 sweep 时不变速', () => {
        const w = new World(cfg);
        w.addBall({ pos: { x: 50, y: 50 }, vel: { x: 0, y: 100 }, r: 5 });
        w.addSweep({ pivot: { x: 800, y: 800 }, length: 100, omega: 1, angle: 0 });
        w.step(1 / 60);
        const b = w.snapshot().balls[0]!;
        expect(b.vel.x).toBe(0);
    });

    it('转动臂 angle 累加', () => {
        const w = new World(cfg);
        const id = w.addSweep({ pivot: { x: 500, y: 500 }, length: 100, omega: Math.PI, angle: 0 });
        w.step(1);
        const sweep = w.snapshotSweeps().find((s) => s.id === id)!;
        expect(sweep.angle).toBeCloseTo(Math.PI, 2);
    });
});
