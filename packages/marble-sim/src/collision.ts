import type { Ball } from './ball.js';
import type { Obstacle } from './obstacle.js';

export function resolveCircleVsCircle(b: Ball, o: Obstacle, bounce: number): boolean {
    const dx = b.pos.x - o.pos.x;
    const dy = b.pos.y - o.pos.y;
    const distSq = dx * dx + dy * dy;
    const rSum = b.r + o.r;
    if (distSq >= rSum * rSum) return false;

    const dist = Math.sqrt(distSq) || 1e-6;
    const nx = dx / dist;
    const ny = dy / dist;

    const penetration = rSum - dist;
    b.pos.x += nx * penetration;
    b.pos.y += ny * penetration;

    const vn = b.vel.x * nx + b.vel.y * ny;
    if (vn < 0) {
        b.vel.x -= (1 + bounce) * vn * nx;
        b.vel.y -= (1 + bounce) * vn * ny;
    }
    return true;
}
