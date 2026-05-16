export interface WeaponLevelSpec {
    /** UI 显示名（HUD 使用） */
    name: string;
    /** 该级启用哪些层（叠加） */
    layers: {
        primary: boolean;
        spread: boolean;
        swarm: boolean;
        tracker: 0 | 1 | 2;
        beam: boolean;
    };
}

/** 主炮层参数（所有级共享） */
export const PRIMARY = {
    intervalMs: 133,
    overdriveIntervalMs: 67,
    bulletSpeed: 720,
    damage: 1
} as const;

/** 副炮层参数（左右各一发斜向） */
export const SPREAD = {
    offsetX: 20,
    vy: -660,
    damage: 1,
    color: 0x00ff44
} as const;

/** 蜂群层参数（周期 + burst + swarmRate） */
export const SWARM = {
    cycleIntervalMs: 300,
    burstDurMs: 100,
    swarmRateMs: 33,
    overdriveSwarmRateMs: 17,
    bulletSpeed: 720,
    damage: 0.1,
    /** 6 发偏移与速度倍率（vy 倍率 0.92~1.0 之间，vx ±0.6） */
    pellets: [
        { ox: -20, vxFactor: -0.6, vyFactor: -0.92 },
        { ox: -13, vxFactor: -0.3, vyFactor: -1.0 },
        { ox: -6, vxFactor: -0.1, vyFactor: -1.0 },
        { ox: 6, vxFactor: 0.1, vyFactor: -1.0 },
        { ox: 13, vxFactor: 0.3, vyFactor: -1.0 },
        { ox: 20, vxFactor: 0.6, vyFactor: -0.92 }
    ]
} as const;

/** 追踪导弹层 */
export const TRACKER = {
    intervalMs: 2000,
    lv4Factor: 0.65,
    overdriveFactor: 0.5,
    bulletSpeed: 360,
    damage: 8,
    lifetimeMs: 5000
} as const;

/** 激光层 */
export const BEAM = {
    chargeMs: 1000,
    fireMs: 4000,
    idleMs: 2000,
    widthStart: 6,
    widthEnd: 17,
    overdriveWidthStart: 12,
    damageStartPerSec: 12,
    damageEndPerSec: 90
} as const;

export const OVERDRIVE = {
    durationMs: 10000
} as const;

export const WEAPONS: WeaponLevelSpec[] = [
    { name: '主炮', layers: { primary: true, spread: false, swarm: false, tracker: 0, beam: false } },
    { name: '副炮', layers: { primary: true, spread: true, swarm: false, tracker: 0, beam: false } },
    { name: '蜂群', layers: { primary: true, spread: true, swarm: true, tracker: 0, beam: false } },
    { name: '追踪导弹', layers: { primary: true, spread: true, swarm: true, tracker: 1, beam: false } },
    { name: '双导弹', layers: { primary: true, spread: true, swarm: true, tracker: 2, beam: false } },
    { name: '激光炮', layers: { primary: true, spread: true, swarm: true, tracker: 2, beam: true } },
    { name: '超频 MAX', layers: { primary: true, spread: true, swarm: true, tracker: 2, beam: true } }
];

export const MAX_LEVEL = WEAPONS.length - 1;
