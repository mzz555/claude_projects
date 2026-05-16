import { describe, it, expect } from 'vitest';
import {
    MARBLE_OBSTACLES,
    MARBLE_ZONES,
    MARBLE_LAUNCHER
} from '../src/data/marbleLayout.js';

describe('data/marbleLayout', () => {
    it('4 个 zone 对应 tier 1-4', () => {
        expect(MARBLE_ZONES.length).toBe(4);
        const tiers = MARBLE_ZONES.map((z) => z.tier).sort();
        expect(tiers).toEqual([1, 2, 3, 4]);
    });

    it('每个 zone 含 typePoints 阈值 (cost) > 0', () => {
        for (const z of MARBLE_ZONES) {
            expect(z.cost).toBeGreaterThan(0);
        }
    });

    it('obstacle 至少 3 个，全部在世界范围内', () => {
        expect(MARBLE_OBSTACLES.length).toBeGreaterThanOrEqual(3);
        for (const o of MARBLE_OBSTACLES) {
            expect(o.x).toBeGreaterThanOrEqual(0);
            expect(o.x).toBeLessThanOrEqual(220);
            expect(o.y).toBeGreaterThanOrEqual(0);
            expect(o.y).toBeLessThanOrEqual(540);
            expect(o.r).toBeGreaterThan(0);
        }
    });

    it('launcher 位于顶部、向下发射', () => {
        expect(MARBLE_LAUNCHER.y).toBeLessThan(50);
        expect(MARBLE_LAUNCHER.vy).toBeGreaterThan(0);
        expect(MARBLE_LAUNCHER.intervalSec).toBeGreaterThan(0);
    });
});
