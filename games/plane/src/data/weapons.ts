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
    dualIntervalFactor: 0.65,
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

/**
 * 武器等级表（7 级：Lv0 主炮 ~ Lv6 超频 MAX）。
 *
 * 设计意图：
 * - Lv0~Lv5 通过逐级新增层（spread / swarm / tracker / beam）实现强化。
 * - Lv6 的 layers 与 Lv5 完全相同，因为「超频 MAX」不是新增层，而是一个**调制器**：
 *   超频由外部 enterOverdrive() 调用激活（持续 OVERDRIVE.durationMs，默认 10s），
 *   期间所有已启用层都改用各自的 overdrive 参数运行：
 *     - PRIMARY.overdriveIntervalMs（主炮间隔）
 *     - SWARM.overdriveSwarmRateMs（蜂群子弹速率）
 *     - TRACKER.overdriveFactor（追踪导弹间隔系数）
 *     - BEAM.overdriveWidthStart（激光起始宽度）
 *   因此从 layers 数据看 Lv5 与 Lv6 相同是正确的，差异在调制层。
 */
export const WEAPONS: WeaponLevelSpec[] = [
    { name: '主炮', layers: { primary: true, spread: false, swarm: false, tracker: 0, beam: false } },
    { name: '副炮', layers: { primary: true, spread: true, swarm: false, tracker: 0, beam: false } },
    { name: '蜂群', layers: { primary: true, spread: true, swarm: true, tracker: 0, beam: false } },
    { name: '追踪导弹', layers: { primary: true, spread: true, swarm: true, tracker: 1, beam: false } },
    { name: '双导弹', layers: { primary: true, spread: true, swarm: true, tracker: 2, beam: false } },
    { name: '激光炮', layers: { primary: true, spread: true, swarm: true, tracker: 2, beam: true } },
    { name: '超频 MAX', layers: { primary: true, spread: true, swarm: true, tracker: 2, beam: true } } // layers 与 Lv5 同；超频由 enterOverdrive 调制器激活，强化各层参数
];

export const MAX_LEVEL = WEAPONS.length - 1;
