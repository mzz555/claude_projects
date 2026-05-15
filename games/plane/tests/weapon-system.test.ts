import { describe, it, expect } from 'vitest';
import { WeaponSystem } from '../src/systems/WeaponSystem.js';

describe('WeaponSystem Lv0', () => {
    it('首次 tick 立刻发射（旧版行为：按下开火立刻发）', () => {
        const w = new WeaponSystem();
        expect(w.tick(16)).toBe(1);
    });

    it('冷却期内不重发', () => {
        const w = new WeaponSystem();
        w.tick(16); // 首发进入冷却
        expect(w.tick(50)).toBe(0); // 仍冷却中
    });

    it('累积 dt 超过间隔时只发 1 次（防尖峰一帧多发）', () => {
        const w = new WeaponSystem();
        expect(w.tick(400)).toBe(1);
    });

    it('多帧累计触发节奏稳定', () => {
        const w = new WeaponSystem();
        let total = 0;
        for (let i = 0; i < 60; i++) total += w.tick(1000 / 60);
        expect(total).toBeGreaterThanOrEqual(7);
        expect(total).toBeLessThanOrEqual(8);
    });

    it('setLevel 0 是默认主炮 133ms', () => {
        const w = new WeaponSystem();
        w.setLevel(0);
        expect(w.tick(133)).toBe(1);
    });
});
