import {
    POWERUPS,
    TIER_DROP_RATE,
    POWER_COOLDOWN_MS,
    type PowerupKey
} from '../data/powerups.js';

export interface PlayerNeeds {
    needsHp: boolean;
    needsSpeed: boolean;
    needsShield: boolean;
    needsAlly: boolean;
    /** 火力是否已达 MAX_LEVEL（满级仍可吃 power 刷新超频） */
    fireLevelMaxed: boolean;
}

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

/**
 * 敌机击杀掉落：按 tier 走 rate；若过 → 50% 尝试 power（cooldown OK 且未在屏）→ 余 50% 从 needs 中挑。
 *
 * 满级时 power 仍可掉，用于刷新超频。
 */
export function decideDrop(
    tier: 1 | 2 | 3 | 4,
    onscreenKeys: Set<PowerupKey>,
    powerCooldownLeftMs: number,
    needs: PlayerNeeds,
    rand01: () => number
): PowerupKey | null {
    const rate = TIER_DROP_RATE[tier];
    if (rand01() >= rate) return null;

    const powerEligible = !onscreenKeys.has('power') && powerCooldownLeftMs <= 0;
    if (powerEligible && rand01() < 0.5) return 'power';

    const candidates: PowerupKey[] = [];
    if (needs.needsHp && !onscreenKeys.has('hp')) candidates.push('hp');
    if (needs.needsSpeed && !onscreenKeys.has('speed')) candidates.push('speed');
    if (needs.needsShield && !onscreenKeys.has('shield')) candidates.push('shield');
    if (needs.needsAlly && !onscreenKeys.has('ally')) candidates.push('ally');

    if (candidates.length === 0) return null;
    const idx = Math.floor(rand01() * candidates.length);
    return candidates[Math.min(idx, candidates.length - 1)]!;
}

/**
 * 陨石爆破掉落：与敌机不同——
 * - 收集所有"玩家需要"的候选 + power（若 eligible），从中随机
 * - 若无候选，用兜底集合 [hp, shield, ally]（过滤 onscreenKeys）
 */
export function decideMeteorDrop(
    onscreenKeys: Set<PowerupKey>,
    powerCooldownLeftMs: number,
    needs: PlayerNeeds,
    rand01: () => number
): PowerupKey | null {
    const candidates: PowerupKey[] = [];
    if (needs.needsHp && !onscreenKeys.has('hp')) candidates.push('hp');
    if (needs.needsSpeed && !onscreenKeys.has('speed')) candidates.push('speed');
    if (needs.needsShield && !onscreenKeys.has('shield')) candidates.push('shield');
    if (needs.needsAlly && !onscreenKeys.has('ally')) candidates.push('ally');
    if (!needs.fireLevelMaxed && !onscreenKeys.has('power') && powerCooldownLeftMs <= 0) {
        candidates.push('power');
    }
    if (candidates.length === 0) {
        const fallback: PowerupKey[] = (['hp', 'shield', 'ally'] as PowerupKey[]).filter(
            (k) => !onscreenKeys.has(k)
        );
        if (fallback.length === 0) return null;
        const idx = Math.floor(rand01() * fallback.length);
        return fallback[Math.min(idx, fallback.length - 1)]!;
    }
    const idx = Math.floor(rand01() * candidates.length);
    return candidates[Math.min(idx, candidates.length - 1)]!;
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
