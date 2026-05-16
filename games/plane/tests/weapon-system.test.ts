import { describe, it, expect } from 'vitest';
import { WeaponSystem, type ShotSpec } from '../src/systems/WeaponSystem.js';

function countShots(specs: ShotSpec[]): number {
    return specs.filter((s) => s.kind === 'bullet').length;
}

describe('WeaponSystem Lv0 single', () => {
    it('首次 tick 立刻发射 1 颗', () => {
        const w = new WeaponSystem();
        expect(countShots(w.tick(16))).toBe(1);
    });

    it('冷却期内不重发', () => {
        const w = new WeaponSystem();
        w.tick(16);
        expect(countShots(w.tick(50))).toBe(0);
    });

    it('累积 dt 超过间隔仍只发 1 颗', () => {
        const w = new WeaponSystem();
        w.tick(16);
        expect(countShots(w.tick(5000))).toBe(1);
    });

    it('Lv0 子弹 vy = -720', () => {
        const w = new WeaponSystem();
        const specs = w.tick(16);
        expect(specs[0]!.vy).toBe(-720);
    });
});

describe('WeaponSystem Lv1 spread', () => {
    it('一次发射出 3 颗子弹', () => {
        const w = new WeaponSystem();
        w.setLevel(1);
        const specs = w.tick(16);
        expect(countShots(specs)).toBe(3);
    });

    it('3 颗子弹 vx 互不相同（左中右）', () => {
        const w = new WeaponSystem();
        w.setLevel(1);
        const specs = w.tick(16);
        const vxs = specs.map((s) => s.vx).sort((a, b) => a - b);
        expect(vxs[0]).toBeLessThan(0);
        expect(vxs[1]).toBeCloseTo(0, 0);
        expect(vxs[2]).toBeGreaterThan(0);
    });
});

describe('WeaponSystem Lv2 burst', () => {
    it('一轮蜂群 6 发结束后进入 300ms 冷却', () => {
        const w = new WeaponSystem();
        w.setLevel(2);
        let total = 0;
        for (let i = 0; i < 60; i++) total += countShots(w.tick(1000 / 60));
        expect(total).toBeGreaterThanOrEqual(6);
        expect(total).toBeLessThanOrEqual(8);
    });

    it('蜂群每次只发 1 颗（连发期内）', () => {
        const w = new WeaponSystem();
        w.setLevel(2);
        const specs = w.tick(100);
        expect(countShots(specs)).toBeLessThanOrEqual(1);
    });
});
