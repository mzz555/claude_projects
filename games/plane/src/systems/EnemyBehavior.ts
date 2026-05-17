import type { EnemyTypeKey } from '../data/enemyTypes.js';
import { CONFRONTATION_DISTANCE } from '../data/confrontation.js';

export interface BehaviorTarget {
    typeKey: EnemyTypeKey;
    x: number;
    y: number;
    spawnX: number;
    behaviorTime: number;
    sweepDir: 1 | -1;
    confronting: boolean;
    getVelocityX(): number;
    setVelocityX(v: number): void;
    getVelocityY(): number;
    setVelocityY(v: number): void;
}

export function shouldConfront(
    typeKey: EnemyTypeKey,
    enemyY: number,
    playerY: number
): boolean {
    const dist = CONFRONTATION_DISTANCE[typeKey];
    if (dist === undefined) return false;
    return playerY - enemyY >= dist;
}

