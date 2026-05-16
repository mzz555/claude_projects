import { describe, it, expect } from 'vitest';
import { WeaponSystem } from '../src/systems/WeaponSystem.js';

describe('WeaponSystem 超频 buff', () => {
    it('默认未激活', () => {
        const w = new WeaponSystem();
        expect(w.isOverdrive()).toBe(false);
    });

    it('enterOverdrive 激活并维持 5s', () => {
        const w = new WeaponSystem();
        w.enterOverdrive();
        expect(w.isOverdrive()).toBe(true);
        w.tick(4999);
        expect(w.isOverdrive()).toBe(true);
        w.tick(2);
        expect(w.isOverdrive()).toBe(false);
    });

    it('Lv0 + 超频：节奏翻倍（200ms 内 ≥2 发）', () => {
        const w = new WeaponSystem();
        w.enterOverdrive();
        let count = 0;
        for (let i = 0; i < 10; i++) count += w.tick(20).length;
        expect(count).toBeGreaterThanOrEqual(2);
    });

    it('重复 enterOverdrive 刷新到 5s', () => {
        const w = new WeaponSystem();
        w.enterOverdrive();
        w.tick(3000);
        w.enterOverdrive();
        w.tick(4000);
        expect(w.isOverdrive()).toBe(true);
    });
});
