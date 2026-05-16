export interface MeteorSpawnRequest {
    x: number;
}

export interface MeteorDirectorOpts {
    minX: number;
    maxX: number;
    randSource: () => number;
}

export const METEOR_DROP_RATE = 0.8;

const MIN_INTERVAL_MS = 10_000;
const MAX_INTERVAL_MS = 20_000;

export class MeteorDirector {
    private cooldownMs: number;
    private opts: MeteorDirectorOpts;

    constructor(opts: MeteorDirectorOpts) {
        this.opts = opts;
        this.cooldownMs = this.rollInterval();
    }

    private rollInterval(): number {
        return MIN_INTERVAL_MS + this.opts.randSource() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
    }

    tick(dtMs: number): MeteorSpawnRequest[] {
        this.cooldownMs -= dtMs;
        if (this.cooldownMs > 0) return [];
        this.cooldownMs = this.rollInterval();
        const x = this.opts.minX + this.opts.randSource() * (this.opts.maxX - this.opts.minX);
        return [{ x }];
    }
}
