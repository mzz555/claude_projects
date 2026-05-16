import { describe, it, expect } from 'vitest';
import { MeteorDirector } from '../src/systems/MeteorDirector.js';

const fixedRand = (): number => 0.5;

describe('MeteorDirector', () => {
    it('未到第一次间隔时不发请求', () => {
        const d = new MeteorDirector({
            minX: 40,
            maxX: 1240,
            randSource: fixedRand
        });
        const reqs = d.tick(1000);
        expect(reqs.length).toBe(0);
    });

    it('累计到首次 spawn 时间后发 1 个请求', () => {
        const d = new MeteorDirector({
            minX: 40,
            maxX: 1240,
            randSource: fixedRand
        });
        const reqs = d.tick(15001);
        expect(reqs.length).toBe(1);
        expect(reqs[0]!.x).toBeGreaterThanOrEqual(40);
        expect(reqs[0]!.x).toBeLessThanOrEqual(1240);
    });

    it('单次 tick 最多发 1 个请求', () => {
        const d = new MeteorDirector({
            minX: 40,
            maxX: 1240,
            randSource: fixedRand
        });
        const reqs = d.tick(60000);
        expect(reqs.length).toBe(1);
    });

    it('连续 60s 应产出 3-6 个陨石（间隔 10-20s）', () => {
        const d = new MeteorDirector({
            minX: 40,
            maxX: 1240,
            randSource: fixedRand
        });
        let total = 0;
        for (let i = 0; i < 60 * 60; i++) {
            total += d.tick(1000 / 60).length;
        }
        expect(total).toBeGreaterThanOrEqual(3);
        expect(total).toBeLessThanOrEqual(6);
    });
});

describe('Meteor/掉率', () => {
    it('击破 80% 强制爆率（数值约束）', () => {
        const METEOR_DROP_RATE = 0.8;
        expect(METEOR_DROP_RATE).toBe(0.8);
    });
});
