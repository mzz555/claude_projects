export type WeaponMode = 'single' | 'spread' | 'burst' | 'tracker' | 'beam' | 'overdrive';

export interface WeaponLevel {
    name: string;
    mode: WeaponMode;
    intervalMs: number;
    bulletSpeed: number;
    damage: number;

    angles?: number[];

    burstSize?: number;
    burstIntervalMs?: number;
    cycleIntervalMs?: number;

    trackerCount?: number;
    lifetimeMs?: number;

    chargeMs?: number;
    fireMs?: number;
    damageStartPerSec?: number;
    damageEndPerSec?: number;
    widthStart?: number;
    widthEnd?: number;

    durationMs?: number;
}

const DEG = Math.PI / 180;

export const WEAPONS: WeaponLevel[] = [
    {
        name: '主炮',
        mode: 'single',
        intervalMs: 133,
        bulletSpeed: 720,
        damage: 1
    },
    {
        name: '副炮',
        mode: 'spread',
        intervalMs: 133,
        bulletSpeed: 720,
        damage: 1,
        angles: [-15 * DEG, 0, 15 * DEG]
    },
    {
        name: '蜂群散射',
        mode: 'burst',
        intervalMs: 0,
        bulletSpeed: 660,
        damage: 1,
        burstSize: 6,
        burstIntervalMs: 100,
        cycleIntervalMs: 300
    },
    {
        name: '追踪导弹',
        mode: 'tracker',
        intervalMs: 2000,
        bulletSpeed: 360,
        damage: 8,
        trackerCount: 1,
        lifetimeMs: 5000
    },
    {
        name: '双导弹',
        mode: 'tracker',
        intervalMs: 1800,
        bulletSpeed: 360,
        damage: 8,
        trackerCount: 2,
        lifetimeMs: 5000
    },
    {
        name: '激光炮',
        mode: 'beam',
        intervalMs: 0,
        bulletSpeed: 0,
        damage: 0,
        chargeMs: 1000,
        fireMs: 4000,
        damageStartPerSec: 12,
        damageEndPerSec: 90,
        widthStart: 6,
        widthEnd: 17
    },
    {
        name: '超频 MAX',
        mode: 'overdrive',
        intervalMs: 0,
        bulletSpeed: 0,
        damage: 0,
        durationMs: 5000
    }
];
