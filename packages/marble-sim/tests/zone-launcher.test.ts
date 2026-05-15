import { describe, it, expect, vi } from 'vitest';
import { World } from '../src/world.js';
import { PLANE_SPAWNER_PRESET, STANDALONE_PRESET } from '../src/presets.js';

describe('marble-sim/Zone onEnter', () => {
    it('球进入矩形 zone 触发回调', () => {
        const w = new World({ bounds: { x: 0, y: 0, w: 1000, h: 1000 }, gravity: 0, bounce: 1 });
        const enter = vi.fn();
        w.addZone({ x: 400, y: 400, w: 200, h: 200, onEnter: enter });
        w.addBall({ pos: { x: 500, y: 500 }, vel: { x: 0, y: 0 }, r: 5 });
        w.step(0.01);
        expect(enter).toHaveBeenCalledTimes(1);
    });

    it('球在 zone 外不触发', () => {
        const w = new World({ bounds: { x: 0, y: 0, w: 1000, h: 1000 }, gravity: 0, bounce: 1 });
        const enter = vi.fn();
        w.addZone({ x: 0, y: 0, w: 50, h: 50, onEnter: enter });
        w.addBall({ pos: { x: 500, y: 500 }, vel: { x: 0, y: 0 }, r: 5 });
        w.step(0.01);
        expect(enter).not.toHaveBeenCalled();
    });

    it('球离开后重新进入会再触发', () => {
        const w = new World({ bounds: { x: 0, y: 0, w: 1000, h: 1000 }, gravity: 0, bounce: 1 });
        const enter = vi.fn();
        w.addZone({ x: 400, y: 400, w: 100, h: 100, onEnter: enter });
        const id = w.addBall({ pos: { x: 450, y: 450 }, vel: { x: 0, y: 0 }, r: 5 });
        w.step(0.01);
        w.teleportBall(id, { x: 100, y: 100 });
        w.step(0.01);
        w.teleportBall(id, { x: 450, y: 450 });
        w.step(0.01);
        expect(enter).toHaveBeenCalledTimes(2);
    });
});

describe('marble-sim/Launcher', () => {
    it('按周期发射球', () => {
        const w = new World({ bounds: { x: 0, y: 0, w: 1000, h: 1000 }, gravity: 0, bounce: 1 });
        w.addLauncher({ pos: { x: 50, y: 50 }, vel: { x: 100, y: 0 }, r: 4, interval: 0.5 });
        for (let i = 0; i < 96; i++) w.step(1 / 60);
        expect(w.snapshot().balls.length).toBe(4);
    });
});

describe('marble-sim/presets', () => {
    it('PLANE_SPAWNER_PRESET 与 STANDALONE_PRESET 都暴露 bounds/gravity/bounce', () => {
        for (const p of [PLANE_SPAWNER_PRESET, STANDALONE_PRESET]) {
            expect(p.bounds.w).toBeGreaterThan(0);
            expect(p.gravity).toBeGreaterThanOrEqual(0);
            expect(p.bounce).toBeGreaterThanOrEqual(0);
            expect(p.bounce).toBeLessThanOrEqual(1);
        }
    });
});
