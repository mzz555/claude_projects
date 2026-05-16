import { describe, it, expect, vi } from 'vitest';
import {
    decideDrop,
    applyEffect,
    type PowerupEffectCtx,
    type PlayerNeeds
} from '../src/systems/PowerupSystem.js';

const allNeeds: PlayerNeeds = {
    needsHp: true,
    needsSpeed: true,
    needsShield: true,
    needsAlly: true,
    fireLevelMaxed: false
};

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
        const r = decideDrop(1, new Set(), 0, allNeeds, () => 0.02);
        expect(r).not.toBeNull();
    });

    it('tier=1 rand=0.5 未命中 -> 返回 null', () => {
        const r = decideDrop(1, new Set(), 0, allNeeds, () => 0.5);
        expect(r).toBeNull();
    });

    it('tier=4 rand=0.4 命中', () => {
        const r = decideDrop(4, new Set(), 0, allNeeds, () => 0.4);
        expect(r).not.toBeNull();
    });

    it('onscreen 已包含 power 且冷却中 -> 优先非 power', () => {
        // mockRand：rate roll 0 通过；power 不 eligible（cooldown 3000）；needs 列表非空
        const r = decideDrop(4, new Set(['power']), 3000, allNeeds, () => 0);
        expect(r).not.toBe('power');
        expect(r).not.toBeNull();
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
