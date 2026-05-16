import type { EnemyTypeKey } from '../data/enemyTypes.js';

export interface BossTarget {
    typeKey: EnemyTypeKey;
    x: number;
    y: number;
    fieldTimer: number;
    spawnTimer: number;
}

export type BossSideEffect =
    | { kind: 'bomber-field'; x: number; y: number }
    | { kind: 'carrier-spawn'; spawns: Array<{ x: number; y: number }> };

const BOMBER_FIELD_INTERVAL_MS = 5000;
const CARRIER_SPAWN_INTERVAL_MS = 3300;

export function updateBossBehavior(e: BossTarget, dtMs: number): BossSideEffect[] {
    const effects: BossSideEffect[] = [];
    if (e.typeKey === 'bomber') {
        e.fieldTimer += dtMs;
        if (e.fieldTimer >= BOMBER_FIELD_INTERVAL_MS) {
            e.fieldTimer -= BOMBER_FIELD_INTERVAL_MS;
            effects.push({ kind: 'bomber-field', x: e.x, y: e.y });
        }
    } else if (e.typeKey === 'carrier') {
        e.spawnTimer += dtMs;
        if (e.spawnTimer >= CARRIER_SPAWN_INTERVAL_MS) {
            e.spawnTimer -= CARRIER_SPAWN_INTERVAL_MS;
            effects.push({
                kind: 'carrier-spawn',
                spawns: [
                    { x: e.x - 30, y: e.y + 40 },
                    { x: e.x + 30, y: e.y + 40 }
                ]
            });
        }
    }
    return effects;
}
