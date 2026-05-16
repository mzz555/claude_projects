export type PowerupKey = 'power' | 'shield' | 'ally' | 'hp' | 'speed';

export interface PowerupType {
    label: string;
    icon: string;
    color: string;
    durationMs: number;
}

export const POWERUPS: Record<PowerupKey, PowerupType> = {
    power: {
        label: '火力升级',
        icon: '⊕',
        color: '#7df9ff',
        durationMs: 0
    },
    shield: {
        label: '护盾',
        icon: '◈',
        color: '#9d4edd',
        durationMs: 5000
    },
    ally: {
        label: '支援 +1',
        icon: '✈',
        color: '#e6f1ff',
        durationMs: 0
    },
    hp: {
        label: '血包',
        icon: '♥',
        color: '#ff5577',
        durationMs: 0
    },
    speed: {
        label: '加速',
        icon: '▶',
        color: '#7df9ff',
        durationMs: 6000
    }
};

export const TIER_DROP_RATE: Record<1 | 2 | 3 | 4, number> = {
    1: 0.03,
    2: 0.1,
    3: 0.3,
    4: 0.5
};

export const MAX_ONSCREEN = 3;
export const POWER_COOLDOWN_MS = 5000;

export type FirepowerShape = 'diamond' | 'circle' | 'star' | 'pentagon' | 'hex' | 'burst';

export interface FirepowerVisual {
    color: number;
    icon: string;
    shape: FirepowerShape;
}

/**
 * 索引 = 升级后等级（1..6）。索引 0 与 1 同（占位，便于 clamp）。
 * 颜色梯度参考原版 v9.0：副炮绿 → 蜂群黄 → 导弹橙 → 双弹红 → 激光紫 → 超频青
 */
export const FP_DATA: ReadonlyArray<FirepowerVisual> = [
    { color: 0x00ff44, icon: '⊕', shape: 'diamond' },
    { color: 0x00ff44, icon: '⊕', shape: 'diamond' },
    { color: 0xffee00, icon: '≋', shape: 'circle' },
    { color: 0xff8800, icon: '◎', shape: 'star' },
    { color: 0xff2200, icon: '⦿', shape: 'pentagon' },
    { color: 0xcc00ff, icon: '⬡', shape: 'hex' },
    { color: 0x00ffff, icon: '✦', shape: 'burst' }
];
