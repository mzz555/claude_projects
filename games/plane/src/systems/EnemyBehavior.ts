import type { EnemyTypeKey } from '../data/enemyTypes.js';

export interface BehaviorTarget {
    typeKey: EnemyTypeKey;
    x: number;
    y: number;
    spawnX: number;
    behaviorTime: number;
    sweepDir: 1 | -1;
    getVelocityX(): number;
    setVelocityX(v: number): void;
}

const SCOUT_AMP = 25;
const SCOUT_FREQ = 2;
const FIGHTER_TRACK_SPEED = 80;
const ELITE_TRACK_SPEED = 60;
const INTERCEPTOR_SPEED = 240;

export function updateBehavior(e: BehaviorTarget, dtSec: number, playerX: number): void {
    e.behaviorTime += dtSec;
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
            e.setVelocityX(0);
            break;
    }
}
