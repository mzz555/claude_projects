import { describe, it, expect } from 'vitest';
import { ENEMY_WEAPONS, type EnemyWeaponKey } from '../src/data/enemyWeapons.js';

describe('data/enemyWeapons', () => {
    it('5 类武器都存在', () => {
        const keys: EnemyWeaponKey[] = ['single', 'double', 'rapid', 'fan', 'barrage'];
        for (const k of keys) {
            expect(ENEMY_WEAPONS[k]).toBeDefined();
        }
    });

    it('single 单发，pellet=1', () => {
        expect(ENEMY_WEAPONS.single.pelletsPerShot).toBe(1);
    });

    it('double 3 弹扇形', () => {
        expect(ENEMY_WEAPONS.double.pelletsPerShot).toBe(3);
    });

    it('rapid burst 5 发，内部 ~133ms', () => {
        expect(ENEMY_WEAPONS.rapid.burstSize).toBe(5);
        expect(ENEMY_WEAPONS.rapid.burstIntervalMs).toBeLessThanOrEqual(150);
    });

    it('fan 7 弹扇形 + 伤害加成 ≥2', () => {
        expect(ENEMY_WEAPONS.fan.pelletsPerShot).toBe(7);
        expect(ENEMY_WEAPONS.fan.damageMultiplier).toBeGreaterThanOrEqual(2);
    });

    it('所有 bulletSpeed > 0 且 ≤ 500（px/s）', () => {
        const keys: EnemyWeaponKey[] = ['single', 'double', 'rapid', 'fan', 'barrage'];
        for (const k of keys) {
            const w = ENEMY_WEAPONS[k];
            expect(w.bulletSpeed).toBeGreaterThan(0);
            expect(w.bulletSpeed).toBeLessThanOrEqual(500);
        }
    });
});
