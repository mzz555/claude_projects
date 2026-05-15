import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

const cfg = { bounds: { x: 0, y: 0, w: 1000, h: 1000 }, gravity: 0, bounce: 1 };

describe('marble-sim/Pipe', () => {
    it('水平管道内球沿 x 行进，y 速度被夹回', () => {
        const w = new World(cfg);
        w.addPipe({ a: { x: 100, y: 500 }, b: { x: 900, y: 500 }, halfWidth: 20 });
        w.addBall({ pos: { x: 500, y: 510 }, vel: { x: 200, y: 50 }, r: 5 });
        for (let i = 0; i < 60; i++) w.step(1 / 60);
        const ball = w.snapshot().balls[0]!;
        expect(ball.pos.y).toBeGreaterThan(480);
        expect(ball.pos.y).toBeLessThan(540);
    });

    it('管道外不影响', () => {
        const w = new World(cfg);
        w.addPipe({ a: { x: 100, y: 100 }, b: { x: 200, y: 100 }, halfWidth: 10 });
        w.addBall({ pos: { x: 500, y: 500 }, vel: { x: 0, y: 100 }, r: 5 });
        w.step(0.1);
        const b = w.snapshot().balls[0]!;
        expect(b.vel.y).toBeCloseTo(100, 1);
    });
});
