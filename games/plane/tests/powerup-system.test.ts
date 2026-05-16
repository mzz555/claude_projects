import { describe, it, expect, vi } from 'vitest';
import {
    decideDrop,
    applyEffect,
    type PowerupEffectCtx
} from '../src/systems/PowerupSystem.js';

function makeCtx(overrides: Partial<PowerupEffectCtx> = {}): PowerupEffectCtx {
    return {
        weapon: {
            getLevel: () => 2,
            setLevel: vi.fn(),
            enterOverdrive: vi.fn(),
            maxLevel: 6
        },
        player: {
            activateShield: vi.fn(),
            heal: vi.fn(),
            activateSpeedBoost: vi.fn()
        },
        addAllyCharge: vi.fn(),
        ...overrides
    };
}

describe('PowerupSystem/decideDrop 概率', () => {
    it('tier=1 rand=0.02 命中 -> 返回某个 key', () => {
        const r = decideDrop(1, new Set(), 0, () => 0.02);
        expect(r).not.toBeNull();
    });

    it('tier=1 rand=0.5 未命中 -> 返回 null', () => {
        const r = decideDrop(1, new Set(), 0, () => 0.5);
        expect(r).toBeNull();
    });

    it('tier=4 rand=0.4 命中', () => {
        const r = decideDrop(4, new Set(), 0, () => 0.4);
        expect(r).not.toBeNull();
    });

    it('onscreen 已包含 power 且冷却中 -> 优先非 power', () => {
        const r = decideDrop(4, new Set(['power']), 3000, () => 0);
        expect(r).not.toBe('power');
    });
});

describe('PowerupSystem/applyEffect', () => {
    it('power -> 升级 WeaponSystem', () => {
        const setLevel = vi.fn();
        const ctx = makeCtx({
            weapon: {
                getLevel: () => 2,
                setLevel,
                enterOverdrive: vi.fn(),
                maxLevel: 6
            }
        });
        applyEffect('power', ctx);
        expect(setLevel).toHaveBeenCalledWith(3);
    });

    it('power 满级 -> 触发超频而非升级', () => {
        const enterOverdrive = vi.fn();
        const ctx = makeCtx({
            weapon: {
                getLevel: () => 6,
                setLevel: vi.fn(),
                enterOverdrive,
                maxLevel: 6
            }
        });
        applyEffect('power', ctx);
        expect(enterOverdrive).toHaveBeenCalled();
    });

    it('hp -> Player.heal', () => {
        const heal = vi.fn();
        const ctx = makeCtx({
            player: { activateShield: vi.fn(), heal, activateSpeedBoost: vi.fn() }
        });
        applyEffect('hp', ctx);
        expect(heal).toHaveBeenCalled();
    });

    it('ally -> addAllyCharge', () => {
        const addAllyCharge = vi.fn();
        const ctx = makeCtx({ addAllyCharge });
        applyEffect('ally', ctx);
        expect(addAllyCharge).toHaveBeenCalled();
    });
});
