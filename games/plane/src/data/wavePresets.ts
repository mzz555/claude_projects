import type { EnemyTypeKey } from './enemyTypes.js';

interface WaveSegment {
    fromSec: number;
    intervalMs: number;
    pool: Array<{ key: EnemyTypeKey; weight: number }>;
}

const SEGMENTS: WaveSegment[] = [
    {
        fromSec: 0,
        intervalMs: 1500,
        pool: [{ key: 'scout', weight: 1 }]
    },
    {
        fromSec: 30,
        intervalMs: 1200,
        pool: [
            { key: 'scout', weight: 0.5 },
            { key: 'fighter', weight: 0.25 },
            { key: 'interceptor', weight: 0.25 }
        ]
    },
    {
        fromSec: 90,
        intervalMs: 1000,
        pool: [
            { key: 'scout', weight: 0.25 },
            { key: 'fighter', weight: 0.2 },
            { key: 'interceptor', weight: 0.2 },
            { key: 'elite', weight: 0.2 },
            { key: 'cruiser', weight: 0.15 }
        ]
    },
    {
        fromSec: 180,
        intervalMs: 1000,
        pool: [
            { key: 'scout', weight: 0.15 },
            { key: 'fighter', weight: 0.15 },
            { key: 'interceptor', weight: 0.15 },
            { key: 'elite', weight: 0.18 },
            { key: 'cruiser', weight: 0.17 },
            { key: 'bomber', weight: 0.1 },
            { key: 'carrier', weight: 0.1 }
        ]
    }
];

function findSegment(seconds: number): WaveSegment {
    let chosen = SEGMENTS[0]!;
    for (const s of SEGMENTS) {
        if (seconds >= s.fromSec) chosen = s;
    }
    return chosen;
}

export function pickEnemy(seconds: number, rand01: number): EnemyTypeKey {
    const seg = findSegment(seconds);
    let acc = 0;
    for (const item of seg.pool) {
        acc += item.weight;
        if (rand01 < acc) return item.key;
    }
    return seg.pool[seg.pool.length - 1]!.key;
}

export function getSpawnIntervalMs(seconds: number): number {
    return findSegment(seconds).intervalMs;
}
