import { Ball, type BallInit } from './ball.js';
import type { BallSnapshot, CollisionEvent, WorldConfig } from './types.js';

export interface WorldSnapshot {
    balls: BallSnapshot[];
}

export class World {
    private balls: Ball[] = [];
    private nextId = 1;
    private cfg: Required<WorldConfig>;

    constructor(cfg: WorldConfig) {
        this.cfg = {
            drag: 0,
            maxSteps: 4,
            ...cfg
        };
    }

    addBall(init: BallInit): number {
        const b = new Ball(this.nextId++, init);
        this.balls.push(b);
        return b.id;
    }

    step(dt: number): CollisionEvent[] {
        const events: CollisionEvent[] = [];
        const { gravity, bounce, drag, bounds } = this.cfg;
        const dragK = Math.exp(-drag * dt);

        for (const b of this.balls) {
            if (!b.alive) continue;
            b.vel.y += gravity * dt;
            b.vel.x *= dragK;
            b.vel.y *= dragK;
            b.pos.x += b.vel.x * dt;
            b.pos.y += b.vel.y * dt;

            const minX = bounds.x + b.r;
            const maxX = bounds.x + bounds.w - b.r;
            const minY = bounds.y + b.r;
            const maxY = bounds.y + bounds.h - b.r;

            if (b.pos.x < minX) {
                b.pos.x = minX;
                b.vel.x = -b.vel.x * bounce;
                events.push({ kind: 'wall', ballId: b.id });
            } else if (b.pos.x > maxX) {
                b.pos.x = maxX;
                b.vel.x = -b.vel.x * bounce;
                events.push({ kind: 'wall', ballId: b.id });
            }
            if (b.pos.y < minY) {
                b.pos.y = minY;
                b.vel.y = -b.vel.y * bounce;
                events.push({ kind: 'wall', ballId: b.id });
            } else if (b.pos.y > maxY) {
                b.pos.y = maxY;
                b.vel.y = -b.vel.y * bounce;
                events.push({ kind: 'wall', ballId: b.id });
            }
        }
        return events;
    }

    snapshot(): WorldSnapshot {
        return {
            balls: this.balls.map((b) => ({
                id: b.id,
                pos: { x: b.pos.x, y: b.pos.y },
                vel: { x: b.vel.x, y: b.vel.y },
                r: b.r,
                alive: b.alive
            }))
        };
    }
}
