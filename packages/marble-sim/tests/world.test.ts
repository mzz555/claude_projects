import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

const cfg = {
    bounds: { x: 0, y: 0, w: 100, h: 200 },
    gravity: 1000,
    bounce: 0.8
};

describe('World/addBall + snapshot', () => {
    it('addBall 后 snapshot 能查到', () => {
        const w = new World(cfg);
        const id = w.addBall({ pos: { x: 50, y: 10 }, vel: { x: 0, y: 0 }, r: 5 });
        const snap = w.snapshot();
        expect(snap.balls.length).toBe(1);
        expect(snap.balls[0]!.id).toBe(id);
        expect(snap.balls[0]!.pos.y).toBe(10);
    });
});

describe('World/step 重力作用', () => {
    it('单球自由下落 1 秒 y 增量 ≈ 0.5gt^2', () => {
        // bounds 足够大（h=1000），确保下落 1 秒内不碰底
        // 欧拉积分 60 步，理论值 0.5*1000*1=500，允许欧拉法误差 ±30
        const w = new World({ ...cfg, bounds: { x: 0, y: 0, w: 100, h: 1000 } });
        w.addBall({ pos: { x: 50, y: 0 }, vel: { x: 0, y: 0 }, r: 1 });
        for (let i = 0; i < 60; i++) w.step(1 / 60);
        const ball = w.snapshot().balls[0]!;
        expect(ball.pos.y).toBeGreaterThan(460);
        expect(ball.pos.y).toBeLessThan(540);
    });

    it('碰底反弹后 |vy| 减半（bounce=0.5）', () => {
        const w = new World({ ...cfg, gravity: 0, bounce: 0.5 });
        w.addBall({ pos: { x: 50, y: 190 }, vel: { x: 0, y: 100 }, r: 5 });
        w.step(1);
        const b = w.snapshot().balls[0]!;
        expect(b.vel.y).toBeCloseTo(-50, 1);
    });

    it('左右墙反弹', () => {
        const w = new World({ ...cfg, gravity: 0, bounce: 1 });
        w.addBall({ pos: { x: 10, y: 100 }, vel: { x: -100, y: 0 }, r: 5 });
        w.step(0.2);
        const b = w.snapshot().balls[0]!;
        expect(b.vel.x).toBeGreaterThan(0);
    });
});
