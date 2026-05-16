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

const SCOUT_AMP = 25;
const SCOUT_FREQ = 2;
const FIGHTER_TRACK_SPEED = 80;
const ELITE_TRACK_SPEED = 60;
const INTERCEPTOR_SPEED = 240;

export function updateBehavior(e: BehaviorTarget, dtSec: number, playerX: number): void {
    e.behaviorTime += dtSec;
    if (e.confronting) {
        e.setVelocityY(0);
    }
    switch (e.typeKey) {
        case 'scout': {
            const targetX = e.spawnX + Math.sin(e.behaviorTime * SCOUT_FREQ) * SCOUT_AMP;
            const dx = targetX - e.x;
            const vx = Math.max(-60, Math.min(60, dx / Math.max(dtSec, 1 / 240)));
            e.setVelocityX(vx);
            break;
        }
        case 'fighter': {
            const dx = playerX - e.x;
            const speed = Math.sign(dx) * Math.min(FIGHTER_TRACK_SPEED, Math.abs(dx) * 4);
            e.setVelocityX(speed);
            break;
        }
        case 'elite': {
            const dx = playerX - e.x;
            const speed = Math.sign(dx) * Math.min(ELITE_TRACK_SPEED, Math.abs(dx) * 3);
            e.setVelocityX(speed);
            break;
        }
        case 'interceptor': {
            e.setVelocityX(e.sweepDir * INTERCEPTOR_SPEED);
            break;
        }
        case 'cruiser':
        case 'bomber':
        case 'carrier':
            if (e.confronting) {
                e.setVelocityX(Math.sin(e.behaviorTime * 0.8) * 30);
            } else {
                e.setVelocityX(0);
            }
            break;
    }
}
