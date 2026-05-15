import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../src/data/weapons.js';

describe('data/weapons 表', () => {
    it('Lv0 主炮存在', () => {
        const w = WEAPONS[0];
        expect(w).toBeDefined();
        expect(w!.name).toBe('主炮');
    });

    it('Lv0 间隔为 133ms（旧版 8 帧 @60fps）', () => {
        expect(WEAPONS[0]!.intervalMs).toBe(133);
    });

    it('Lv0 子弹速度 720 px/s（旧版 12 px/帧 @60fps）', () => {
        expect(WEAPONS[0]!.bulletSpeed).toBe(720);
    });

    it('Lv0 主弹伤害大于 0', () => {
        expect(WEAPONS[0]!.damage).toBeGreaterThan(0);
    });
});
