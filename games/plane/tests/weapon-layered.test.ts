import { describe, it, expect } from 'vitest';
import { WeaponSystem } from '../src/systems/WeaponSystem.js';
import { PRIMARY } from '../src/data/weapons.js';

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
});
