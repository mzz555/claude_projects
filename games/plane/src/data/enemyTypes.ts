import type { HealthBarType } from '../debug/debugParams.js';

export type EnemyTypeKey =
    | 'scout'
    | 'fighter'
    | 'interceptor'
    | 'elite'
    | 'cruiser'
    | 'bomber'
    | 'carrier';

/** 按 tier 映射默认血条类型 — tier 1-2 普通、3 精英、4 史诗、boss 仅手动 override */
export function defaultHealthBarByTier(tier: 1 | 2 | 3 | 4): HealthBarType {
    if (tier <= 2) return 'normal';
    if (tier === 3) return 'elite';
    return 'epic';
}

export interface EnemyType {
    label: string;
    tier: 1 | 2 | 3 | 4;
    hp: number;
    score: number;
    dmg: number;
    w: number;
    h: number;
    vyMin: number;
    vyMax: number;
    sprite: string;
    bulletTexture: string;
    behaviorId: string;
}

export const ENEMY_TYPES: Record<EnemyTypeKey, EnemyType> = {
    scout: {
        label: '侦察机',
        tier: 1,
        hp: 2,
        score: 100,
        dmg: 1,
        w: 23,
        h: 21,
        vyMin: 60,
        vyMax: 120,
        sprite: 'enemy-1',
        bulletTexture: 'enemy-bullet-small',
        behaviorId: 'sinusoidal'
    },
    fighter: {
        label: '战斗机',
        tier: 2,
        hp: 8,
        score: 260,
        dmg: 1,
        w: 31,
        h: 30,
        vyMin: 36,
        vyMax: 60,
        sprite: 'enemy-2',
        bulletTexture: 'enemy-bullet-small',
        behaviorId: 'player-tracker'
    },
    interceptor: {
        label: '拦截机',
        tier: 2,
        hp: 4,
        score: 150,
        dmg: 1,
        w: 20,
        h: 19,
        vyMin: 84,
        vyMax: 132,
        sprite: 'enemy-3',
        bulletTexture: 'enemy-bullet-teardrop',
        behaviorId: 'horizontal-sweep'
    },
    elite: {
        label: '精英机',
        tier: 3,
        hp: 12,
        score: 380,
        dmg: 1,
        w: 36,
        h: 35,
        vyMin: 30,
        vyMax: 54,
        sprite: 'enemy-4',
        bulletTexture: 'enemy-bullet-shrapnel',
        behaviorId: 'elite-tracker'
    },
    cruiser: {
        label: '巡洋舰',
        tier: 3,
        hp: 20,
        score: 520,
        dmg: 2,
        w: 44,
        h: 42,
        vyMin: 21,
        vyMax: 39,
        sprite: 'enemy-5',
        bulletTexture: 'enemy-bullet-orb',
        behaviorId: 'hover'
    },
    bomber: {
        label: '轰炸机',
        tier: 4,
        hp: 64,
        score: 450,
        dmg: 2,
        w: 68,
        h: 56,
        vyMin: 15,
        vyMax: 30,
        sprite: 'enemy-6',
        bulletTexture: 'enemy-bullet-heavy',
        behaviorId: 'hover'
    },
    carrier: {
        label: '母舰',
        tier: 4,
        hp: 88,
        score: 900,
        dmg: 2,
        w: 84,
        h: 70,
        vyMin: 11,
        vyMax: 21,
        sprite: 'enemy-7',
        bulletTexture: 'enemy-bullet-heavy',
        behaviorId: 'hover'
    }
};
