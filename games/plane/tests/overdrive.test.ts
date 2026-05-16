import { describe, it, expect } from 'vitest';
import { WeaponSystem } from '../src/systems/WeaponSystem.js';
import { OVERDRIVE } from '../src/data/weapons.js';

describe('WeaponSystem 超频 buff', () => {
    it('默认未激活', () => {
        const w = new WeaponSystem();
        expect(w.isOverdrive()).toBe(false);
    });

    it('enterOverdrive 激活并维持 OVERDRIVE.durationMs（10s）', () => {
        const w = new WeaponSystem();
        w.enterOverdrive();
        expect(w.isOverdrive()).toBe(true);
        w.tick(OVERDRIVE.durationMs - 1);
        expect(w.isOverdrive()).toBe(true);
        w.tick(2);
        expect(w.isOverdrive()).toBe(false);
    });

    it('Lv0 + 超频：节奏明显加快（200ms 内 ≥2 发）', () => {
        const w = new WeaponSystem();
        w.enterOverdrive();
        let count = 0;
        for (let i = 0; i < 10; i++) count += w.tick(20).length;
        expect(count).toBeGreaterThanOrEqual(2);
    });

    it('重复 enterOverdrive 用 Math.max 刷新（不叠加，取较大）', () => {
        const w = new WeaponSystem();
        w.enterOverdrive();
        w.tick(OVERDRIVE.durationMs - 2000); // 还剩 2s
        w.enterOverdrive();                  // 刷新到 10s
        w.tick(OVERDRIVE.durationMs - 1);    // 推到刚好剩 1ms
        expect(w.isOverdrive()).toBe(true);
        w.tick(2);
        expect(w.isOverdrive()).toBe(false);
    });
});
