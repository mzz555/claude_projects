import type { Ball } from './ball.js';
import type { Obstacle } from './obstacle.js';
import type { Sweep } from './sweep.js';
import type { Pipe } from './pipe.js';

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

export function resolveCircleVsSweep(b: Ball, s: Sweep, bounce: number): boolean {
    const ax = s.pivot.x;
    const ay = s.pivot.y;
    const ep = s.endpoint();
    const dx = ep.x - ax;
    const dy = ep.y - ay;
    const lenSq = dx * dx + dy * dy || 1e-6;
    let t = ((b.pos.x - ax) * dx + (b.pos.y - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    const ox = b.pos.x - cx;
    const oy = b.pos.y - cy;
    const distSq = ox * ox + oy * oy;
    const rSum = b.r + s.thickness;
    if (distSq >= rSum * rSum) return false;

    const dist = Math.sqrt(distSq) || 1e-6;
    const nx = ox / dist;
    const ny = oy / dist;
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

export function resolveCircleVsPipe(ball: Ball, p: Pipe, bounce: number): boolean {
    const dx = p.b.x - p.a.x;
    const dy = p.b.y - p.a.y;
    const lenSq = dx * dx + dy * dy || 1e-6;
    const t = ((ball.pos.x - p.a.x) * dx + (ball.pos.y - p.a.y) * dy) / lenSq;
    if (t < 0 || t > 1) return false;

    const cx = p.a.x + dx * t;
    const cy = p.a.y + dy * t;
    const ox = ball.pos.x - cx;
    const oy = ball.pos.y - cy;
    const distSq = ox * ox + oy * oy;
    const limit = p.halfWidth - ball.r;
    if (limit <= 0 || distSq <= limit * limit) return false;

    const dist = Math.sqrt(distSq) || 1e-6;
    const nx = ox / dist;
    const ny = oy / dist;
    const overshoot = dist - limit;
    ball.pos.x -= nx * overshoot;
    ball.pos.y -= ny * overshoot;

    const vn = ball.vel.x * nx + ball.vel.y * ny;
    if (vn > 0) {
        ball.vel.x -= (1 + bounce) * vn * nx;
        ball.vel.y -= (1 + bounce) * vn * ny;
    }
    return true;
}
