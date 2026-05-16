import type { EnemyTypeKey } from '../data/enemyTypes.js';
import { MARBLE_ZONES } from '../data/marbleLayout.js';

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
