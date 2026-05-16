import { describe, it, expect } from 'vitest';
import { POWERUPS, TIER_DROP_RATE, type PowerupKey } from '../src/data/powerups.js';

describe('data/powerups', () => {
    it('包含 5 种道具', () => {
        const keys: PowerupKey[] = ['power', 'shield', 'ally', 'hp', 'speed'];
        for (const k of keys) {
            expect(POWERUPS[k]).toBeDefined();
        }
    });

    it('每个道具有 label / icon / color', () => {
        for (const k of Object.keys(POWERUPS) as PowerupKey[]) {
            const p = POWERUPS[k];
            expect(p.label).toBeTruthy();
            expect(p.icon).toBeTruthy();
            expect(p.color).toMatch(/^0x|^#/);
        }
    });

    it('TIER_DROP_RATE Lv1/2/3/4 = 0.03/0.10/0.30/0.50', () => {
        expect(TIER_DROP_RATE[1]).toBeCloseTo(0.03);
        expect(TIER_DROP_RATE[2]).toBeCloseTo(0.1);
        expect(TIER_DROP_RATE[3]).toBeCloseTo(0.3);
        expect(TIER_DROP_RATE[4]).toBeCloseTo(0.5);
    });

    it('shield 时长 5000ms / speed 时长 6000ms', () => {
        expect(POWERUPS.shield.durationMs).toBe(5000);
        expect(POWERUPS.speed.durationMs).toBe(6000);
    });
});
