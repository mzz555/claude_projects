import { describe, it, expect } from 'vitest';
import { MarbleScoreboard } from '../src/systems/MarbleSpawner.js';

describe('MarbleScoreboard tier 累积', () => {
    it('未达阈值返回 null', () => {
        const s = new MarbleScoreboard(() => 0);
        expect(s.addPoint(1)).toBeNull();
    });

    it('tier=1 满 2 次产出 scout', () => {
        const s = new MarbleScoreboard(() => 0);
        s.addPoint(1);
        const out = s.addPoint(1);
        expect(out).toBe('scout');
    });

    it('累积满后清零，再加要重新累', () => {
        const s = new MarbleScoreboard(() => 0);
        s.addPoint(1);
        s.addPoint(1);
        expect(s.addPoint(1)).toBeNull();
    });

    it('tier=2 用 rand=0.0 选 fighter / rand=0.9 选 interceptor', () => {
        const a = new MarbleScoreboard(() => 0);
        a.addPoint(2);
        a.addPoint(2);
        a.addPoint(2);
        expect(a.addPoint(2)).toBe('fighter');

        const b = new MarbleScoreboard(() => 0.9);
        b.addPoint(2);
        b.addPoint(2);
        b.addPoint(2);
        expect(b.addPoint(2)).toBe('interceptor');
    });

    it('tier=4 cost=16，加 15 次仍 null，第 16 次出 bomber/carrier', () => {
        const s = new MarbleScoreboard(() => 0);
        for (let i = 0; i < 15; i++) expect(s.addPoint(4)).toBeNull();
        const out = s.addPoint(4);
        expect(['bomber', 'carrier']).toContain(out);
    });
});
