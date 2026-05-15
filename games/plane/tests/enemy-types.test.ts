import { describe, it, expect } from 'vitest';
import { ENEMY_TYPES, type EnemyTypeKey } from '../src/data/enemyTypes.js';

describe('data/enemyTypes', () => {
    it('包含 7 类敌机', () => {
        const keys: EnemyTypeKey[] = [
            'scout',
            'fighter',
            'interceptor',
            'elite',
            'cruiser',
            'bomber',
            'carrier'
        ];
        for (const k of keys) {
            expect(ENEMY_TYPES[k]).toBeDefined();
        }
    });

    it('scout 参数对齐旧版（hp=2、score=100、tier=1）', () => {
        const s = ENEMY_TYPES.scout;
        expect(s.hp).toBe(2);
        expect(s.score).toBe(100);
        expect(s.tier).toBe(1);
        expect(s.dmg).toBe(1);
    });

    it('carrier 是 Lv4 最强（hp=88、tier=4、score=900）', () => {
        const c = ENEMY_TYPES.carrier;
        expect(c.hp).toBe(88);
        expect(c.tier).toBe(4);
        expect(c.score).toBe(900);
        expect(c.dmg).toBe(2);
    });

    it('所有敌机 hp/score/w/h 都 > 0', () => {
        for (const k of Object.keys(ENEMY_TYPES) as EnemyTypeKey[]) {
            const e = ENEMY_TYPES[k];
            expect(e.hp).toBeGreaterThan(0);
            expect(e.score).toBeGreaterThan(0);
            expect(e.w).toBeGreaterThan(0);
            expect(e.h).toBeGreaterThan(0);
        }
    });

    it('vy 已经是 px/s（数值范围合理 10-200）', () => {
        for (const k of Object.keys(ENEMY_TYPES) as EnemyTypeKey[]) {
            const e = ENEMY_TYPES[k];
            expect(e.vyMin).toBeGreaterThan(10);
            expect(e.vyMax).toBeLessThan(200);
            expect(e.vyMin).toBeLessThanOrEqual(e.vyMax);
        }
    });
});
