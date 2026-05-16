import { describe, it, expect } from 'vitest';
import { WeaponSystem } from '../src/systems/WeaponSystem.js';
import { PRIMARY, SPREAD } from '../src/data/weapons.js';

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
