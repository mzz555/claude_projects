import { describe, it, expect } from 'vitest';
import { WEAPONS, type WeaponLevel } from '../src/data/weapons.js';

describe('data/weapons 表', () => {
    it('Lv0 主炮存在', () => {
        const w = WEAPONS[0];
        expect(w).toBeDefined();
        expect(w!.name).toBe('主炮');
    });

    it('Lv0 间隔为 133ms（旧版 8 帧 @60fps）', () => {
        expect(WEAPONS[0]!.intervalMs).toBe(133);
    });

    it('Lv0 子弹速度 720 px/s（旧版 12 px/帧 @60fps）', () => {
        expect(WEAPONS[0]!.bulletSpeed).toBe(720);
    });

    it('Lv0 主弹伤害大于 0', () => {
        expect(WEAPONS[0]!.damage).toBeGreaterThan(0);
    });
});

describe('data/weapons Lv1-6 扩展', () => {
    it('7 级武器都存在（Lv0-Lv6）', () => {
        expect(WEAPONS.length).toBe(7);
        for (let lvl = 0; lvl < 7; lvl++) {
            expect(WEAPONS[lvl]).toBeDefined();
            expect(WEAPONS[lvl]!.name).toBeTruthy();
        }
    });

    it('Lv1 副炮 mode=spread 含 3 个弹道', () => {
        const w = WEAPONS[1] as WeaponLevel & { mode: string; angles?: number[] };
        expect(w.mode).toBe('spread');
        expect(w.angles?.length).toBe(3);
    });

    it('Lv2 蜂群 mode=burst 节奏（burstInterval ≤ 100ms / cycleInterval ≥ 300ms）', () => {
        const w = WEAPONS[2] as WeaponLevel & {
            mode: string;
            burstSize?: number;
            burstIntervalMs?: number;
            cycleIntervalMs?: number;
        };
        expect(w.mode).toBe('burst');
        expect(w.burstSize).toBeGreaterThanOrEqual(6);
        expect(w.burstIntervalMs).toBeLessThanOrEqual(100);
        expect(w.cycleIntervalMs).toBeGreaterThanOrEqual(300);
    });

    it('Lv3 追踪导弹 mode=tracker 伤害 8 / 失效 5s', () => {
        const w = WEAPONS[3] as WeaponLevel & {
            mode: string;
            lifetimeMs?: number;
        };
        expect(w.mode).toBe('tracker');
        expect(w.damage).toBe(8);
        expect(w.lifetimeMs).toBe(5000);
    });

    it('Lv4 双追踪 trackerCount=2 / 装填更快', () => {
        const w4 = WEAPONS[4] as WeaponLevel & { trackerCount?: number };
        const w3 = WEAPONS[3] as WeaponLevel;
        expect(w4.trackerCount).toBe(2);
        expect(w4.intervalMs).toBeLessThan(w3.intervalMs);
    });

    it('Lv5 激光 mode=beam / chargeMs=1000 / fireMs=4000', () => {
        const w = WEAPONS[5] as WeaponLevel & {
            mode: string;
            chargeMs?: number;
            fireMs?: number;
            damageStartPerSec?: number;
            damageEndPerSec?: number;
        };
        expect(w.mode).toBe('beam');
        expect(w.chargeMs).toBe(1000);
        expect(w.fireMs).toBe(4000);
        expect(w.damageEndPerSec).toBeGreaterThan(w.damageStartPerSec!);
    });

    it('Lv6 超频 mode=overdrive / 持续 5s', () => {
        const w = WEAPONS[6] as WeaponLevel & {
            mode: string;
            durationMs?: number;
        };
        expect(w.mode).toBe('overdrive');
        expect(w.durationMs).toBe(5000);
    });
});
