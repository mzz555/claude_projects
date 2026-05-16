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
