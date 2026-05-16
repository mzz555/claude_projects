import { describe, it, expect } from 'vitest';
import {
    updateBossBehavior,
    type BossTarget,
    type BossSideEffect
} from '../src/systems/BossBehavior.js';

function fakeBomber(): BossTarget {
    return {
        typeKey: 'bomber',
        x: 500,
        y: 200,
        fieldTimer: 0,
        spawnTimer: 0
    };
}

function fakeCarrier(): BossTarget {
    return {
        typeKey: 'carrier',
        x: 600,
        y: 150,
        fieldTimer: 0,
        spawnTimer: 0
    };
}

describe('BossBehavior/bomber 电场', () => {
    it('未到 5s 不触发', () => {
        const e = fakeBomber();
        const fx = updateBossBehavior(e, 4999);
        expect(fx.find((f) => f.kind === 'bomber-field')).toBeUndefined();
    });

    it('5s 后触发 1 次电场', () => {
        const e = fakeBomber();
        const fx = updateBossBehavior(e, 5000);
        const f = fx.find((f) => f.kind === 'bomber-field') as
            | Extract<BossSideEffect, { kind: 'bomber-field' }>
            | undefined;
        expect(f).toBeDefined();
        expect(f!.x).toBe(500);
    });

    it('再次累计 5s 又触发 1 次', () => {
        const e = fakeBomber();
        updateBossBehavior(e, 5000);
        const fx = updateBossBehavior(e, 5000);
        expect(fx.find((f) => f.kind === 'bomber-field')).toBeDefined();
    });
});

describe('BossBehavior/carrier 孵化', () => {
    it('3300ms 后触发 carrier-spawn', () => {
        const e = fakeCarrier();
        const fx = updateBossBehavior(e, 3300);
        const f = fx.find((f) => f.kind === 'carrier-spawn') as
            | Extract<BossSideEffect, { kind: 'carrier-spawn' }>
            | undefined;
        expect(f).toBeDefined();
        expect(f!.spawns.length).toBe(2);
    });

    it('非 Boss 类型不产生副作用', () => {
        const e: BossTarget = {
            typeKey: 'scout',
            x: 100,
            y: 100,
            fieldTimer: 0,
            spawnTimer: 0
        };
        const fx = updateBossBehavior(e, 10000);
        expect(fx.length).toBe(0);
    });
});
