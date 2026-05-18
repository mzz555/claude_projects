import { ENEMY_WEAPONS, type EnemyWeaponKey } from '../data/enemyWeapons.js';

export interface EnemyWeaponState {
    cooldownMs: number;
    burstRemaining: number;
    burstNextMs: number;
}

export interface EnemyShotSpec {
    ox: number;
    oy: number;
    vx: number;
    vy: number;
    damage: number;
    color: number;
}

export interface EnemyWeaponCtx {
    ex: number;
    ey: number;
    px: number;
    py: number;
}

function aimDirection(ctx: EnemyWeaponCtx): { nx: number; ny: number } {
    const dx = ctx.px - ctx.ex;
    const dy = ctx.py - ctx.ey;
    const d = Math.hypot(dx, dy) || 1;
    return { nx: dx / d, ny: dy / d };
}

function fanShots(
    ctx: EnemyWeaponCtx,
    pellets: number,
    spreadRad: number,
    speed: number,
    damage: number,
    color: number
): EnemyShotSpec[] {
    const { nx, ny } = aimDirection(ctx);
    const baseAngle = Math.atan2(ny, nx);
    const specs: EnemyShotSpec[] = [];
    if (pellets === 1) {
        specs.push({
            ox: 0,
            oy: 0,
            vx: nx * speed,
            vy: ny * speed,
            damage,
            color
        });
        return specs;
    }
    for (let i = 0; i < pellets; i++) {
        const t = pellets === 1 ? 0 : i / (pellets - 1);
        const a = baseAngle - spreadRad + 2 * spreadRad * t;
        specs.push({
            ox: 0,
            oy: 0,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            damage,
            color
        });
    }
    return specs;
}

export function updateEnemyWeapon(
    state: EnemyWeaponState,
    ctx: EnemyWeaponCtx,
    dtMs: number,
    key: EnemyWeaponKey,
    overrideIntervalMs?: number,
    overrideBulletSpeed?: number
): EnemyShotSpec[] {
    const w = ENEMY_WEAPONS[key];
    const intervalMs = overrideIntervalMs ?? w.intervalMs;
    const bulletSpeed = overrideBulletSpeed ?? w.bulletSpeed;
    state.cooldownMs -= dtMs;

    if (w.burstSize > 1) {
        if (state.cooldownMs <= 0 && state.burstRemaining <= 0) {
            state.cooldownMs = intervalMs;
            state.burstRemaining = w.burstSize;
            state.burstNextMs = 0;
        }
        if (state.burstRemaining > 0) {
            state.burstNextMs -= dtMs;
            if (state.burstNextMs <= 0) {
                state.burstNextMs = w.burstIntervalMs;
                state.burstRemaining -= 1;
                return fanShots(
                    ctx,
                    1,
                    0,
                    bulletSpeed,
                    Math.max(1, Math.floor(w.damageMultiplier)),
                    w.color
                );
            }
        }
        return [];
    }

    if (state.cooldownMs <= 0) {
        state.cooldownMs = intervalMs;
        return fanShots(
            ctx,
            w.pelletsPerShot,
            w.spreadRad,
            bulletSpeed,
            Math.max(1, Math.floor(w.damageMultiplier)),
            w.color
        );
    }
    return [];
}
