import { describe, it, expect } from 'vitest';
import { WeaponSystem } from '../src/systems/WeaponSystem.js';
import { PRIMARY, SPREAD, SWARM } from '../src/data/weapons.js';

describe('WeaponSystem primary layer', () => {
    it('Lv0 fires primary every PRIMARY.intervalMs', () => {
        const ws = new WeaponSystem();
        ws.setLevel(0);
        const shots1 = ws.tick(PRIMARY.intervalMs - 1);
        expect(shots1.filter((s) => s.layer === 'primary')).toHaveLength(1);
        const shots2 = ws.tick(1);
        expect(shots2.filter((s) => s.layer === 'primary')).toHaveLength(0);
        const shots3 = ws.tick(PRIMARY.intervalMs);
        expect(shots3.filter((s) => s.layer === 'primary')).toHaveLength(1);
    });

    it('Lv6 still fires primary (regression: old switch returned [])', () => {
        const ws = new WeaponSystem();
        ws.setLevel(6);
        const shots = ws.tick(PRIMARY.intervalMs);
        expect(shots.some((s) => s.layer === 'primary')).toBe(true);
    });

    it('overdrive halves primary interval', () => {
        const ws = new WeaponSystem();
        ws.setLevel(0);
        ws.enterOverdrive();
        const shots = ws.tick(PRIMARY.overdriveIntervalMs);
        expect(shots.filter((s) => s.layer === 'primary')).toHaveLength(1);
    });

    it('cooldown boundary: after first shot, intervalMs-1 does not fire, intervalMs does fire', () => {
        const ws = new WeaponSystem();
        ws.setLevel(0);
        ws.tick(PRIMARY.intervalMs); // 消耗首帧 cooldown=0 的立即触发，下一发需要等 interval
        expect(ws.tick(PRIMARY.intervalMs - 1).filter((s) => s.layer === 'primary')).toHaveLength(0);
        expect(ws.tick(1).filter((s) => s.layer === 'primary')).toHaveLength(1);
    });
});

describe('WeaponSystem spread layer', () => {
    it('Lv1 fires primary + 2 spread together (3 shots per tick)', () => {
        const ws = new WeaponSystem();
        ws.setLevel(1);
        const shots = ws.tick(PRIMARY.intervalMs);
        expect(shots.filter((s) => s.layer === 'primary')).toHaveLength(1);
        expect(shots.filter((s) => s.layer === 'spread')).toHaveLength(2);
    });

    it('Lv0 has no spread', () => {
        const ws = new WeaponSystem();
        ws.setLevel(0);
        const shots = ws.tick(PRIMARY.intervalMs);
        expect(shots.filter((s) => s.layer === 'spread')).toHaveLength(0);
    });

    it('spread shots use SPREAD constants (offsetX, vy, color)', () => {
        const ws = new WeaponSystem();
        ws.setLevel(1);
        const shots = ws.tick(PRIMARY.intervalMs);
        const spreads = shots.filter((s) => s.layer === 'spread');
        expect(spreads).toHaveLength(2);
        const left = spreads.find((s) => s.ox < 0)!;
        const right = spreads.find((s) => s.ox > 0)!;
        expect(left.ox).toBe(-SPREAD.offsetX);
        expect(right.ox).toBe(SPREAD.offsetX);
        expect(left.vy).toBe(SPREAD.vy);
        expect(right.vy).toBe(SPREAD.vy);
        expect(left.color).toBe(SPREAD.color);
        expect(right.color).toBe(SPREAD.color);
    });

    it('Lv2+ still fires spread (regression: spread enabled at all Lv1+)', () => {
        const ws = new WeaponSystem();
        ws.setLevel(2);
        const shots = ws.tick(PRIMARY.intervalMs);
        expect(shots.filter((s) => s.layer === 'spread')).toHaveLength(2);
    });

    it('overdrive does not break spread (Lv1 still fires 2 spread per tick)', () => {
        const ws = new WeaponSystem();
        ws.setLevel(1);
        ws.enterOverdrive();
        const shots = ws.tick(PRIMARY.overdriveIntervalMs);
        expect(shots.filter((s) => s.layer === 'spread')).toHaveLength(2);
    });
});

describe('WeaponSystem swarm layer', () => {
    it('Lv2 fires swarm pellets in burst window only', () => {
        const ws = new WeaponSystem();
        ws.setLevel(2);
        // burst 窗口（前 100ms）：每 33ms 一发，6 颗
        const shots1 = ws.tick(SWARM.swarmRateMs);
        expect(shots1.filter((s) => s.layer === 'swarm')).toHaveLength(SWARM.pellets.length);
        // cooldown 内不再发射
        const shots2 = ws.tick(SWARM.swarmRateMs - 1);
        expect(shots2.filter((s) => s.layer === 'swarm')).toHaveLength(0);
    });

    it('Lv2 swarm enters cooldown after burstDurMs (no swarm in cycle gap)', () => {
        const ws = new WeaponSystem();
        ws.setLevel(2);
        // 推到 burst 结束（100ms 用完）
        ws.tick(SWARM.burstDurMs);
        // 进入 cooldown，距 cycle 结束还有 200ms，期间无 swarm
        const shots = ws.tick(SWARM.cycleIntervalMs - SWARM.burstDurMs - 1);
        expect(shots.filter((s) => s.layer === 'swarm')).toHaveLength(0);
    });

    it('overdrive forces swarm every overdriveSwarmRateMs (no cycle gap)', () => {
        const ws = new WeaponSystem();
        ws.setLevel(2);
        ws.enterOverdrive();
        // 推一个完整 cycle，每 17ms 一发 × pellets.length
        const ticks = Math.floor(SWARM.cycleIntervalMs / SWARM.overdriveSwarmRateMs);
        let swarmCount = 0;
        for (let i = 0; i < ticks; i++) {
            const s = ws.tick(SWARM.overdriveSwarmRateMs);
            swarmCount += s.filter((x) => x.layer === 'swarm').length;
        }
        // 超频期内 swarm 总数应远超非超频（基线 6 × 1 burst = 6）
        expect(swarmCount).toBeGreaterThan(SWARM.pellets.length * 2);
    });

    it('Lv1 has no swarm', () => {
        const ws = new WeaponSystem();
        ws.setLevel(1);
        const shots = ws.tick(SWARM.swarmRateMs);
        expect(shots.filter((s) => s.layer === 'swarm')).toHaveLength(0);
    });

    it('swarm pellets use SWARM constants (vy negative, damage 0.1)', () => {
        const ws = new WeaponSystem();
        ws.setLevel(2);
        const shots = ws.tick(SWARM.swarmRateMs);
        const swarms = shots.filter((s) => s.layer === 'swarm');
        expect(swarms).toHaveLength(SWARM.pellets.length);
        for (const s of swarms) {
            expect(s.vy).toBeLessThan(0); // 朝上飞
            expect(s.damage).toBe(SWARM.damage);
        }
    });

    it('swarm restarts burst after full cycle (cycle boundary reentry)', () => {
        const ws = new WeaponSystem();
        ws.setLevel(2);
        // 首个 burst 用尽
        ws.tick(SWARM.burstDurMs);
        // silent 区间走完，进入下一个 cycle 起点
        ws.tick(SWARM.cycleIntervalMs - SWARM.burstDurMs);
        // 下一个 burst 起点：刚跨过 cycle 边界，应立即可发
        const shots = ws.tick(SWARM.swarmRateMs);
        expect(shots.filter((s) => s.layer === 'swarm')).toHaveLength(SWARM.pellets.length);
    });

    it('swarm transitions cleanly from overdrive back to normal cycle', () => {
        const ws = new WeaponSystem();
        ws.setLevel(2);
        ws.enterOverdrive();
        // overdrive 期间几次发射
        ws.tick(SWARM.overdriveSwarmRateMs * 5);
        // 直接推进 overdrive 全程（10s）让它结束
        ws.tick(10000);
        // 现在应回到 normal cycle：第一个 burst 一发应立即可发
        const shots = ws.tick(SWARM.swarmRateMs);
        expect(shots.filter((s) => s.layer === 'swarm')).toHaveLength(SWARM.pellets.length);
    });
});
