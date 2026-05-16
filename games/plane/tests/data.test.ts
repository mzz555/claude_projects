import { describe, it, expect } from 'vitest';
import {
    WEAPONS,
    PRIMARY,
    SPREAD,
    SWARM,
    TRACKER,
    BEAM,
    OVERDRIVE,
    MAX_LEVEL
} from '../src/data/weapons.js';

describe('data/weapons 表', () => {
    it('7 级武器都存在（Lv0-Lv6）', () => {
        expect(WEAPONS.length).toBe(7);
        for (let lvl = 0; lvl < 7; lvl++) {
            expect(WEAPONS[lvl]).toBeDefined();
            expect(WEAPONS[lvl]!.name).toBeTruthy();
        }
    });

    it('MAX_LEVEL 与 WEAPONS 末位对齐', () => {
        expect(MAX_LEVEL).toBe(6);
    });

    it('Lv0 仅启用 primary 层', () => {
        const l = WEAPONS[0]!.layers;
        expect(l.primary).toBe(true);
        expect(l.spread).toBe(false);
        expect(l.swarm).toBe(false);
        expect(l.tracker).toBe(0);
        expect(l.beam).toBe(false);
    });

    it('Lv1 启用 primary + spread', () => {
        const l = WEAPONS[1]!.layers;
        expect(l.primary).toBe(true);
        expect(l.spread).toBe(true);
        expect(l.swarm).toBe(false);
    });

    it('Lv2 启用 primary + spread + swarm', () => {
        const l = WEAPONS[2]!.layers;
        expect(l.swarm).toBe(true);
        expect(l.tracker).toBe(0);
    });

    it('Lv3 加 1 颗 tracker', () => {
        expect(WEAPONS[3]!.layers.tracker).toBe(1);
    });

    it('Lv4 升至 2 颗 tracker', () => {
        expect(WEAPONS[4]!.layers.tracker).toBe(2);
    });

    it('Lv5 启用 beam 层', () => {
        expect(WEAPONS[5]!.layers.beam).toBe(true);
    });

    it('Lv6 layers 与 Lv5 相同（超频由 enterOverdrive 调制器激活）', () => {
        expect(WEAPONS[6]!.layers).toEqual(WEAPONS[5]!.layers);
    });
});

describe('data/weapons 层常量', () => {
    it('PRIMARY: 间隔 133ms / 子弹速 720 / 伤害 ≥1', () => {
        expect(PRIMARY.intervalMs).toBe(133);
        expect(PRIMARY.bulletSpeed).toBe(720);
        expect(PRIMARY.damage).toBeGreaterThan(0);
    });

    it('PRIMARY 超频间隔约为 1/2 标准间隔', () => {
        expect(PRIMARY.overdriveIntervalMs).toBeLessThan(PRIMARY.intervalMs);
        expect(PRIMARY.overdriveIntervalMs).toBeLessThanOrEqual(PRIMARY.intervalMs / 2 + 1);
    });

    it('SPREAD: 颜色绿 / 朝上 / 左右对称偏移', () => {
        expect(SPREAD.color).toBe(0x00ff44);
        expect(SPREAD.vy).toBeLessThan(0);
        expect(SPREAD.offsetX).toBeGreaterThan(0);
    });

    it('SWARM: 周期 300ms / burst 100ms / 6 颗 pellet', () => {
        expect(SWARM.cycleIntervalMs).toBe(300);
        expect(SWARM.burstDurMs).toBe(100);
        expect(SWARM.pellets).toHaveLength(6);
    });

    it('SWARM 超频 rate 严格快于普通 rate', () => {
        expect(SWARM.overdriveSwarmRateMs).toBeLessThan(SWARM.swarmRateMs);
    });

    it('TRACKER: 伤害 8 / 寿命 5s / 双发因子 0.65', () => {
        expect(TRACKER.damage).toBe(8);
        expect(TRACKER.lifetimeMs).toBe(5000);
        expect(TRACKER.dualIntervalFactor).toBe(0.65);
    });

    it('BEAM: charge 1s / fire 4s / 宽 6→17 / 伤害递增', () => {
        expect(BEAM.chargeMs).toBe(1000);
        expect(BEAM.fireMs).toBe(4000);
        expect(BEAM.widthStart).toBe(6);
        expect(BEAM.widthEnd).toBe(17);
        expect(BEAM.damageEndPerSec).toBeGreaterThan(BEAM.damageStartPerSec);
    });

    it('BEAM 超频起步宽是普通起步宽 ×2', () => {
        expect(BEAM.overdriveWidthStart).toBe(BEAM.widthStart * 2);
    });

    it('OVERDRIVE 持续 10s（与原版 600 帧/60fps 对齐）', () => {
        expect(OVERDRIVE.durationMs).toBe(10000);
    });
});
