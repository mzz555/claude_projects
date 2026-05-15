import { describe, it, expect } from 'vitest';
import { WaveDirector } from '../src/systems/WaveDirector.js';

const fixedRand = (): number => 0.5;

describe('WaveDirector', () => {
    it('首次 tick 立刻发出第一个 spawn 请求', () => {
        const d = new WaveDirector({
            minX: 100,
            maxX: 900,
            randSource: fixedRand
        });
        const reqs = d.tick(16);
        expect(reqs.length).toBe(1);
    });

    it('冷却期内不再发', () => {
        const d = new WaveDirector({ minX: 100, maxX: 900, randSource: fixedRand });
        d.tick(16);
        const reqs = d.tick(100);
        expect(reqs.length).toBe(0);
    });

    it('累积时间超过间隔仍只发 1 次（防尖峰）', () => {
        const d = new WaveDirector({ minX: 100, maxX: 900, randSource: fixedRand });
        d.tick(16);
        const reqs = d.tick(5000);
        expect(reqs.length).toBe(1);
    });

    it('多帧 1 秒累计在合理刷新频率（早期约 1500ms/次）', () => {
        const d = new WaveDirector({ minX: 100, maxX: 900, randSource: fixedRand });
        let total = 0;
        for (let i = 0; i < 60 * 5; i++) total += d.tick(1000 / 60).length;
        expect(total).toBeGreaterThanOrEqual(3);
        expect(total).toBeLessThanOrEqual(5);
    });
});
