import { describe, it, expect } from 'vitest';
import { clamp, lerp, rand, randInt } from '../src/math/index.js';

describe('math/clamp', () => {
    it('限制下界', () => expect(clamp(-1, 0, 10)).toBe(0));
    it('限制上界', () => expect(clamp(99, 0, 10)).toBe(10));
    it('区间内不变', () => expect(clamp(5, 0, 10)).toBe(5));
    it('min == max 时返回该值', () => expect(clamp(99, 3, 3)).toBe(3));
});

describe('math/lerp', () => {
    it('t=0 返回 a', () => expect(lerp(10, 20, 0)).toBe(10));
    it('t=1 返回 b', () => expect(lerp(10, 20, 1)).toBe(20));
    it('t=0.5 取中点', () => expect(lerp(10, 20, 0.5)).toBe(15));
    it('外推 t>1', () => expect(lerp(0, 10, 2)).toBe(20));
});

describe('math/rand', () => {
    it('落在区间内', () => {
        for (let i = 0; i < 100; i++) {
            const v = rand(1, 2);
            expect(v).toBeGreaterThanOrEqual(1);
            expect(v).toBeLessThan(2);
        }
    });
});

describe('math/randInt', () => {
    it('返回整数', () => {
        for (let i = 0; i < 100; i++) {
            expect(Number.isInteger(randInt(0, 5))).toBe(true);
        }
    });
    it('包含上下界', () => {
        const seen = new Set<number>();
        for (let i = 0; i < 2000; i++) seen.add(randInt(0, 3));
        expect(seen).toEqual(new Set([0, 1, 2, 3]));
    });
});
