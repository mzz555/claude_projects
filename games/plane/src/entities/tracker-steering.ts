export interface TrackerLike {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

export interface TrackerTarget {
    x: number;
    y: number;
    active: boolean;
}

const TURN_RATE = 4;

/** 纯函数：根据当前速度与目标位置算新速度（带限速）。无 Phaser 依赖，可单测 */
export function computeTrackerSteering(
    me: TrackerLike,
    target: TrackerTarget | null,
    dtSec: number,
    maxSpeed: number
): { vx: number; vy: number } {
    let vx = me.vx;
    let vy = me.vy;
    if (target && target.active) {
        const dx = target.x - me.x;
        const dy = target.y - me.y;
        const dist = Math.hypot(dx, dy) || 1;
        const desiredVx = (dx / dist) * maxSpeed;
        const desiredVy = (dy / dist) * maxSpeed;
        vx += (desiredVx - vx) * Math.min(1, TURN_RATE * dtSec);
        vy += (desiredVy - vy) * Math.min(1, TURN_RATE * dtSec);
    }
    const speed = Math.hypot(vx, vy);
    if (speed > maxSpeed) {
        vx = (vx / speed) * maxSpeed;
        vy = (vy / speed) * maxSpeed;
    }
    return { vx, vy };
}
