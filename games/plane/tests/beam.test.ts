import { describe, it, expect } from 'vitest';
import { WeaponSystem } from '../src/systems/WeaponSystem.js';

describe('WeaponSystem Lv5 beam', () => {
    it('Lv5 时 tick() ShotSpec[] 为空（不发普通子弹）', () => {
        const w = new WeaponSystem();
        w.setLevel(5);
        const specs = w.tick(16);
        expect(specs.length).toBe(0);
    });

    it('beam 初始状态 charging', () => {
        const w = new WeaponSystem();
        w.setLevel(5);
        const b = w.tickBeam(16);
        expect(b?.state).toBe('charging');
    });

    it('1000ms 后切到 firing', () => {
        const w = new WeaponSystem();
        w.setLevel(5);
        w.tickBeam(1000);
        const b = w.tickBeam(1);
        expect(b?.state).toBe('firing');
    });

    it('firing 期间宽度从 6 → 17 线性递增', () => {
        const w = new WeaponSystem();
        w.setLevel(5);
        w.tickBeam(1000); // charging done，elapsed=1000
        const start = w.tickBeam(0);
        w.tickBeam(2000); // elapsed=3000，firing 中段
        const mid = w.tickBeam(0);
        w.tickBeam(1999); // elapsed=4999，firing 接近末尾
        const end = w.tickBeam(0);
        expect(start?.width).toBeCloseTo(6, 0);
        expect(end?.width).toBeCloseTo(17, 0);
        expect(mid?.width).toBeGreaterThan(start!.width);
        expect(mid?.width).toBeLessThan(end!.width);
    });

    it('5001ms 后回到 charging（下一轮）', () => {
        const w = new WeaponSystem();
        w.setLevel(5);
        w.tickBeam(5001);
        const b = w.tickBeam(1);
        expect(b?.state).toBe('charging');
    });
});
