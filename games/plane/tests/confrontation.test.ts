import { describe, it, expect } from 'vitest';
import { CONFRONTATION_DISTANCE } from '../src/data/confrontation.js';
import { shouldConfront } from '../src/systems/EnemyBehavior.js';

describe('data/confrontation', () => {
    it('Lv2+ 各类型距离对齐 README', () => {
        expect(CONFRONTATION_DISTANCE.fighter).toBe(190);
        expect(CONFRONTATION_DISTANCE.interceptor).toBe(130);
        expect(CONFRONTATION_DISTANCE.elite).toBe(170);
        expect(CONFRONTATION_DISTANCE.cruiser).toBe(240);
        expect(CONFRONTATION_DISTANCE.bomber).toBe(270);
        expect(CONFRONTATION_DISTANCE.carrier).toBe(300);
    });

    it('scout 无对峙（undefined）', () => {
        expect(CONFRONTATION_DISTANCE.scout).toBeUndefined();
    });
});

describe('EnemyBehavior/shouldConfront', () => {
    it('scout 永远 false', () => {
        expect(shouldConfront('scout', 100, 500)).toBe(false);
    });

    it('fighter 距玩家 200px（>190）-> true', () => {
        expect(shouldConfront('fighter', 300, 500)).toBe(true);
    });

    it('fighter 距玩家 100px（<190）-> false', () => {
        expect(shouldConfront('fighter', 400, 500)).toBe(false);
    });

    it('carrier 距 350 -> true（>300）', () => {
        expect(shouldConfront('carrier', 250, 600)).toBe(true);
    });
});
