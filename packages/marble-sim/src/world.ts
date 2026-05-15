import { Ball, type BallInit } from './ball.js';
import { Obstacle, type ObstacleInit } from './obstacle.js';
import { Sweep, type SweepInit } from './sweep.js';
import { Pipe, type PipeInit } from './pipe.js';
import { Zone, type ZoneInit } from './zone.js';
import { Launcher, type LauncherInit } from './launcher.js';
import { resolveCircleVsCircle, resolveCircleVsSweep, resolveCircleVsPipe } from './collision.js';
import type { BallSnapshot, CollisionEvent, Vec2, WorldConfig } from './types.js';

export interface WorldSnapshot {
    balls: BallSnapshot[];
}

export class World {
    private balls: Ball[] = [];
    private obstacles: Obstacle[] = [];
    private sweeps: Sweep[] = [];
    private pipes: Pipe[] = [];
    private zones: Zone[] = [];
    private launchers: Launcher[] = [];
    private nextId = 1;
    private nextObsId = 1;
    private nextSweepId = 1;
    private nextPipeId = 1;
    private nextZoneId = 1;
    private nextLauncherId = 1;
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

    addPipe(init: PipeInit): number {
        const p = new Pipe(this.nextPipeId++, init);
        this.pipes.push(p);
        return p.id;
    }

    addZone(init: ZoneInit): number {
        const z = new Zone(this.nextZoneId++, init);
        this.zones.push(z);
        return z.id;
    }

    addLauncher(init: LauncherInit): number {
        const l = new Launcher(this.nextLauncherId++, init);
        this.launchers.push(l);
        return l.id;
    }

    launchBall(init: BallInit): number {
        return this.addBall(init);
    }

    teleportBall(id: number, pos: Vec2): void {
        const b = this.balls.find((x) => x.id === id);
        if (b) {
            b.pos.x = pos.x;
            b.pos.y = pos.y;
        }
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

        for (const l of this.launchers) {
            l.sinceLast += dt;
            while (l.sinceLast >= l.interval) {
                l.sinceLast -= l.interval;
                this.addBall({ pos: { ...l.pos }, vel: { ...l.vel }, r: l.r });
            }
        }

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

            for (const p of this.pipes) {
                if (resolveCircleVsPipe(b, p, bounce)) {
                    events.push({ kind: 'pipe', ballId: b.id, pipeId: p.id });
                }
            }

            for (const z of this.zones) {
                const inside = z.contains(b);
                const was = z.contained.has(b.id);
                if (inside && !was) {
                    z.contained.add(b.id);
                    z.onEnter(b);
                    events.push({ kind: 'zone', ballId: b.id, zoneId: z.id });
                } else if (!inside && was) {
                    z.contained.delete(b.id);
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
