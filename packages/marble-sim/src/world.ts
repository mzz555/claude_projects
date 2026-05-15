import { Ball, type BallInit } from './ball.js';
import { Obstacle, type ObstacleInit } from './obstacle.js';
import { Sweep, type SweepInit } from './sweep.js';
import { resolveCircleVsCircle, resolveCircleVsSweep } from './collision.js';
import type { BallSnapshot, CollisionEvent, Vec2, WorldConfig } from './types.js';

export interface WorldSnapshot {
    balls: BallSnapshot[];
}

export class World {
    private balls: Ball[] = [];
    private obstacles: Obstacle[] = [];
    private sweeps: Sweep[] = [];
    private nextId = 1;
    private nextObsId = 1;
    private nextSweepId = 1;
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

    addObstacle(init: ObstacleInit): number {
        const o = new Obstacle(this.nextObsId++, init);
        this.obstacles.push(o);
        return o.id;
    }

    addSweep(init: SweepInit): number {
        const s = new Sweep(this.nextSweepId++, init);
        this.sweeps.push(s);
        return s.id;
    }

    snapshotSweeps(): Array<{ id: number; pivot: Vec2; length: number; angle: number; thickness: number }> {
        return this.sweeps.map((s) => ({
            id: s.id,
            pivot: { x: s.pivot.x, y: s.pivot.y },
            length: s.length,
            angle: s.angle,
            thickness: s.thickness
        }));
    }

    step(dt: number): CollisionEvent[] {
        const events: CollisionEvent[] = [];
        const { gravity, bounce, drag, bounds } = this.cfg;
        const dragK = Math.exp(-drag * dt);

        for (const s of this.sweeps) s.advance(dt);

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

            for (const o of this.obstacles) {
                if (resolveCircleVsCircle(b, o, bounce)) {
                    events.push({ kind: 'obstacle', ballId: b.id, obstacleId: o.id });
                }
            }

            for (const s of this.sweeps) {
                if (resolveCircleVsSweep(b, s, bounce)) {
                    events.push({ kind: 'sweep', ballId: b.id, sweepId: s.id });
                }
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
