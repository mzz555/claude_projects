export type EnemyTypeKey =
    | 'scout'
    | 'fighter'
    | 'interceptor'
    | 'elite'
    | 'cruiser'
    | 'bomber'
    | 'carrier';

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
        sprite: 'enemy-1'
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
        sprite: 'enemy-2'
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
        sprite: 'enemy-3'
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
        sprite: 'enemy-4'
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
        sprite: 'enemy-5'
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
        sprite: 'enemy-6'
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
        sprite: 'enemy-7'
    }
};
