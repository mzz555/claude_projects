import { describe, it, expect } from 'vitest';
import { pickEnemy, getSpawnIntervalMs } from '../src/data/wavePresets.js';

describe('wavePresets/pickEnemy', () => {
    it('0-30s 段只出 scout', () => {
        for (let i = 0; i < 50; i++) {
            const r = i / 50;
            expect(pickEnemy(15, r)).toBe('scout');
        }
    });

    it('30-90s 段在 scout/fighter/interceptor 三选一', () => {
        const seen = new Set<string>();
        for (let i = 0; i < 200; i++) seen.add(pickEnemy(60, i / 200));
        expect(seen.has('scout')).toBe(true);
        expect(seen.has('fighter') || seen.has('interceptor')).toBe(true);
        for (const v of seen) {
            expect(['scout', 'fighter', 'interceptor']).toContain(v);
        }
    });

    it('180s+ 段能出 carrier 或 bomber', () => {
        const seen = new Set<string>();
        for (let i = 0; i < 500; i++) seen.add(pickEnemy(200, i / 500));
        expect(seen.has('carrier') || seen.has('bomber')).toBe(true);
    });
});

describe('wavePresets/getSpawnIntervalMs', () => {
    it('早期段间隔较长（1500ms）', () => {
        expect(getSpawnIntervalMs(10)).toBe(1500);
    });

    it('30s 后变短', () => {
        expect(getSpawnIntervalMs(60)).toBeLessThan(1500);
    });

    it('返回值始终是正数', () => {
        for (let t = 0; t < 600; t += 5) {
            expect(getSpawnIntervalMs(t)).toBeGreaterThan(0);
        }
    });
});
