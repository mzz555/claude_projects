import { describe, it, expect } from 'vitest';
import {
    updateEnemyWeapon,
    type EnemyWeaponState
} from '../src/systems/EnemyWeapon.js';

function newState(): EnemyWeaponState {
    return { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };
}

describe('EnemyWeapon/single', () => {
    it('首次 tick 立刻发 1 弹瞄准玩家', () => {
        const s = newState();
        const shots = updateEnemyWeapon(
            s,
            { ex: 500, ey: 100, px: 500, py: 500 },
            16,
            'single'
        );
        expect(shots.length).toBe(1);
        expect(shots[0]!.vy).toBeGreaterThan(0);
    });

    it('intervalMs 后才发第二轮', () => {
        const s = newState();
        updateEnemyWeapon(s, { ex: 500, ey: 100, px: 500, py: 500 }, 16, 'single');
        const noShots = updateEnemyWeapon(
            s,
            { ex: 500, ey: 100, px: 500, py: 500 },
            1000,
            'single'
        );
        expect(noShots.length).toBe(0);
    });
});

describe('EnemyWeapon/double', () => {
    it('一次发 3 弹', () => {
        const s = newState();
        const shots = updateEnemyWeapon(
            s,
            { ex: 500, ey: 100, px: 500, py: 500 },
            16,
            'double'
        );
        expect(shots.length).toBe(3);
    });
});

describe('EnemyWeapon/fan', () => {
    it('一次发 7 弹', () => {
        const s = newState();
        const shots = updateEnemyWeapon(
            s,
            { ex: 500, ey: 100, px: 500, py: 500 },
            16,
            'fan'
        );
        expect(shots.length).toBe(7);
    });

    it('damage 含倍数（>= 2）', () => {
        const s = newState();
        const shots = updateEnemyWeapon(
            s,
            { ex: 500, ey: 100, px: 500, py: 500 },
            16,
            'fan'
        );
        expect(shots[0]!.damage).toBeGreaterThanOrEqual(2);
    });
});

describe('EnemyWeapon/rapid burst', () => {
    it('1083ms 内进入 burst，5 弹分散在 133ms 间', () => {
        const s = newState();
        let total = 0;
        for (let i = 0; i < 90; i++) {
            total += updateEnemyWeapon(
                s,
                { ex: 500, ey: 100, px: 500, py: 500 },
                1000 / 60,
                'rapid'
            ).length;
        }
        expect(total).toBeGreaterThanOrEqual(5);
    });

    it('单帧只发 1 弹（连发期内不会一帧出多发）', () => {
        const s = newState();
        const first = updateEnemyWeapon(
            s,
            { ex: 500, ey: 100, px: 500, py: 500 },
            16,
            'rapid'
        );
        expect(first.length).toBeLessThanOrEqual(1);
    });
});
