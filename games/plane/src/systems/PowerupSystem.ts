import {
    POWERUPS,
    TIER_DROP_RATE,
    POWER_COOLDOWN_MS,
    type PowerupKey
} from '../data/powerups.js';

export interface PowerupEffectCtx {
    weapon: {
        getLevel(): number;
        setLevel(level: number): void;
        enterOverdrive(): void;
        maxLevel: number;
    };
    player: {
        activateShield(durationMs: number): void;
        heal(amount: number): void;
        activateSpeedBoost(durationMs: number): void;
    };
    addAllyCharge(): void;
}

export function decideDrop(
    tier: 1 | 2 | 3 | 4,
    onscreenKeys: Set<PowerupKey>,
    powerCooldownLeftMs: number,
    rand01: () => number
): PowerupKey | null {
    const rate = TIER_DROP_RATE[tier];
    if (rand01() >= rate) return null;

    const allKeys: PowerupKey[] = ['power', 'shield', 'ally', 'hp', 'speed'];
    const available = allKeys.filter((k) => !onscreenKeys.has(k));
    if (available.length === 0) return null;

    const powerAvailable = available.includes('power') && powerCooldownLeftMs <= 0;
    if (powerAvailable && rand01() < 0.5) return 'power';

    const nonPower = available.filter((k) => k !== 'power');
    if (nonPower.length === 0) {
        return null;
    }
    const idx = Math.floor(rand01() * nonPower.length);
    return nonPower[Math.min(idx, nonPower.length - 1)]!;
}

export function applyEffect(key: PowerupKey, ctx: PowerupEffectCtx): void {
    switch (key) {
        case 'power': {
            const cur = ctx.weapon.getLevel();
            if (cur >= ctx.weapon.maxLevel) {
                ctx.weapon.enterOverdrive();
            } else {
                ctx.weapon.setLevel(cur + 1);
            }
            break;
        }
        case 'shield':
            ctx.player.activateShield(POWERUPS.shield.durationMs);
            break;
        case 'speed':
            ctx.player.activateSpeedBoost(POWERUPS.speed.durationMs);
            break;
        case 'hp':
            ctx.player.heal(33);
            break;
        case 'ally':
            ctx.addAllyCharge();
            break;
    }
}

export { POWER_COOLDOWN_MS };
