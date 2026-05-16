import { describe, it, expect } from 'vitest';
import { decideDrop, decideMeteorDrop, type PlayerNeeds } from '../src/systems/PowerupSystem.js';
import { TIER_DROP_RATE, type PowerupKey } from '../src/data/powerups.js';

const fullNeeds: PlayerNeeds = {
    needsHp: false,
    needsSpeed: false,
    needsShield: false,
    needsAlly: false,
    fireLevelMaxed: false
};

function mockRand(values: number[]): () => number {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)]!;
}

describe('decideDrop', () => {
    it('returns null when rate roll fails (rand >= TIER_DROP_RATE)', () => {
        const out = decideDrop(1, new Set(), 0, { ...fullNeeds, needsHp: true }, () => 1.0);
        expect(out).toBeNull();
    });

    it('returns null when player needs nothing and power is on cooldown', () => {
        const out = decideDrop(4, new Set(), 9999, fullNeeds, () => 0.01);
        expect(out).toBeNull();
    });

    it('returns power on 50% roll when power eligible (not maxed, cooldown ready)', () => {
        const r = decideDrop(4, new Set(), 0, { ...fullNeeds, needsHp: true }, mockRand([0.01, 0.4]));
        expect(r).toBe('power');
    });

    it('still picks power when maxed (refresh overdrive)', () => {
        const r = decideDrop(4, new Set(), 0, { ...fullNeeds, fireLevelMaxed: true }, mockRand([0.01, 0.4]));
        expect(r).toBe('power');
    });

    it('skips power when on cooldown, falls back to needs', () => {
        // rate roll pass (0.01) → power 不能（cooldown 9999）→ 走 needs 列表（只剩 hp）
        const r = decideDrop(4, new Set(), 9999, { ...fullNeeds, needsHp: true }, mockRand([0.01, 0.4]));
        expect(r).toBe('hp');
    });

    it('skips power when in onscreenKeys, falls back to needs', () => {
        const r = decideDrop(
            4,
            new Set<PowerupKey>(['power']),
            0,
            { ...fullNeeds, needsHp: true },
            mockRand([0.01, 0.4])
        );
        expect(r).toBe('hp');
    });

    it('only picks among needed non-power items', () => {
        const seen = new Set<string>();
        for (let i = 0; i < 200; i++) {
            const r = decideDrop(4, new Set(), 9999, { ...fullNeeds, needsHp: true }, Math.random);
            if (r) seen.add(r);
        }
        // 期望 200 次中 (rate=0.5) 约 100 次掉，全是 hp
        expect(seen).toEqual(new Set(['hp']));
    });

    it('respects tier rate (Lv1 rate 0.03)', () => {
        // mockRand[0]=0.05 → 0.05 > 0.03 → null
        const r = decideDrop(1, new Set(), 0, { ...fullNeeds, needsHp: true }, mockRand([0.05]));
        expect(r).toBeNull();
    });

    it('filters onscreenKeys from non-power needs', () => {
        const r = decideDrop(
            4,
            new Set<PowerupKey>(['hp']),
            9999,
            { ...fullNeeds, needsHp: true, needsSpeed: true },
            mockRand([0.01, 0.99]) // 跳过 power (50% 之外)，走 needs
        );
        expect(r).toBe('speed');
    });
});

describe('decideMeteorDrop', () => {
    it('picks among needed items + power (when not maxed and not on cooldown)', () => {
        const r = decideMeteorDrop(
            new Set(),
            0,
            { ...fullNeeds, needsHp: true },
            mockRand([0]) // 选第 0 个候选
        );
        // 候选列表至少含 hp（因为 needsHp）；power 候选位置取决于实现，但 r 不应为 null
        expect(r).not.toBeNull();
    });

    it('falls back to [hp, shield, ally] when no needs match', () => {
        const r = decideMeteorDrop(
            new Set(),
            9999,
            fullNeeds, // 全 false
            mockRand([0.5])
        );
        expect(['hp', 'shield', 'ally']).toContain(r);
    });

    it('fallback excludes onscreenKeys', () => {
        const r = decideMeteorDrop(
            new Set<PowerupKey>(['hp', 'shield']),
            9999,
            fullNeeds,
            mockRand([0])
        );
        expect(r).toBe('ally');
    });

    it('skips power when fireLevelMaxed', () => {
        // 没有其他需求，fireLevelMaxed=true → 候选为空 → 兜底 [hp/shield/ally]
        const r = decideMeteorDrop(
            new Set(),
            0,
            { ...fullNeeds, fireLevelMaxed: true },
            mockRand([0])
        );
        expect(['hp', 'shield', 'ally']).toContain(r);
    });

    it('skips power when on cooldown', () => {
        const r = decideMeteorDrop(
            new Set(),
            9999,
            { ...fullNeeds, needsHp: true },
            mockRand([0])
        );
        expect(r).toBe('hp');
    });
});
