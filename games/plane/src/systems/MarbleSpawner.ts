import { World, type WorldSnapshot } from '@cp/marble-sim';
import type { EnemyTypeKey } from '../data/enemyTypes.js';
import {
    MARBLE_LAUNCHER,
    MARBLE_OBSTACLES,
    MARBLE_ZONES,
    MARBLE_WORLD
} from '../data/marbleLayout.js';

const TIER_TYPES: Record<1 | 2 | 3 | 4, EnemyTypeKey[]> = {
    1: ['scout'],
    2: ['fighter', 'interceptor'],
    3: ['elite', 'cruiser'],
    4: ['bomber', 'carrier']
};

const TIER_COST: Record<1 | 2 | 3 | 4, number> = (() => {
    const m: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const z of MARBLE_ZONES) m[z.tier] = z.cost;
    return m;
})();

export class MarbleScoreboard {
    private points: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

    constructor(private rand: () => number) {}

    addPoint(tier: 1 | 2 | 3 | 4): EnemyTypeKey | null {
        this.points[tier] += 1;
        if (this.points[tier] < TIER_COST[tier]) return null;
        this.points[tier] = 0;
        const opts = TIER_TYPES[tier];
        const idx = Math.min(opts.length - 1, Math.floor(this.rand() * opts.length));
        return opts[idx]!;
    }

    getPoints(tier: 1 | 2 | 3 | 4): number {
        return this.points[tier];
    }
}

export class MarbleSpawner {
    readonly world: World;
    readonly scoreboard: MarbleScoreboard;
    private pendingSpawns: EnemyTypeKey[] = [];

    constructor() {
        this.scoreboard = new MarbleScoreboard(Math.random);
        this.world = new World({
            bounds: { x: 0, y: 0, w: MARBLE_WORLD.w, h: MARBLE_WORLD.h },
            gravity: 600,
            bounce: 0.6,
            drag: 0.05
        });
        for (const o of MARBLE_OBSTACLES) {
            this.world.addObstacle({ pos: { x: o.x, y: o.y }, r: o.r });
        }
        for (const z of MARBLE_ZONES) {
            const tier = z.tier;
            this.world.addZone({
                x: z.x,
                y: z.y,
                w: z.w,
                h: z.h,
                onEnter: () => {
                    const out = this.scoreboard.addPoint(tier);
                    if (out) this.pendingSpawns.push(out);
                }
            });
        }
        this.world.addLauncher({
            pos: { x: MARBLE_LAUNCHER.x, y: MARBLE_LAUNCHER.y },
            vel: { x: MARBLE_LAUNCHER.vx, y: MARBLE_LAUNCHER.vy },
            r: MARBLE_LAUNCHER.r,
            interval: MARBLE_LAUNCHER.intervalSec
        });
    }

    tick(dtSec: number): EnemyTypeKey[] {
        this.world.step(dtSec);
        if (this.pendingSpawns.length === 0) return [];
        const out = this.pendingSpawns;
        this.pendingSpawns = [];
        return out;
    }

    snapshot(): WorldSnapshot {
        return this.world.snapshot();
    }
}
