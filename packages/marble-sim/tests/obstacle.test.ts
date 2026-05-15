import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

const cfg = {
    bounds: { x: 0, y: 0, w: 1000, h: 1000 },
    gravity: 0,
    bounce: 1
};

describe('marble-sim/Obstacle 圆-圆碰撞', () => {
    it('正对撞回弹（一维对称）', () => {
        const w = new World(cfg);
        w.addBall({ pos: { x: 100, y: 500 }, vel: { x: 200, y: 0 }, r: 10 });
        w.addObstacle({ pos: { x: 200, y: 500 }, r: 10 });
        for (let i = 0; i < 30; i++) w.step(1 / 60);
        const b = w.snapshot().balls[0]!;
        expect(b.vel.x).toBeLessThan(0);
    });

    it('能量守恒（bounce=1）', () => {
        const w = new World(cfg);
        w.addBall({ pos: { x: 100, y: 500 }, vel: { x: 200, y: 0 }, r: 10 });
        w.addObstacle({ pos: { x: 200, y: 500 }, r: 10 });
        const ke0 = 0.5 * 200 ** 2;
        for (let i = 0; i < 30; i++) w.step(1 / 60);
        const b = w.snapshot().balls[0]!;
        const ke1 = 0.5 * (b.vel.x ** 2 + b.vel.y ** 2);
        expect(ke1).toBeGreaterThan(ke0 * 0.95);
        expect(ke1).toBeLessThan(ke0 * 1.05);
    });

    it('未接触不变速', () => {
        const w = new World(cfg);
        w.addBall({ pos: { x: 100, y: 500 }, vel: { x: 50, y: 0 }, r: 5 });
        w.addObstacle({ pos: { x: 800, y: 500 }, r: 5 });
        w.step(1 / 60);
        const b = w.snapshot().balls[0]!;
        expect(b.vel.x).toBeCloseTo(50, 1);
    });
});
