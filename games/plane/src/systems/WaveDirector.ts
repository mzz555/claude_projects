import { ENEMY_TYPES, type EnemyTypeKey } from '../data/enemyTypes.js';
import { pickEnemy, getSpawnIntervalMs } from '../data/wavePresets.js';

export interface SpawnRequest {
    typeKey: EnemyTypeKey;
    x: number;
    vy: number;
}

export interface WaveDirectorOpts {
    minX: number;
    maxX: number;
    randSource: () => number;
}

export class WaveDirector {
    private elapsedMs = 0;
    private cooldownMs = 0;
    private opts: WaveDirectorOpts;

    constructor(opts: WaveDirectorOpts) {
        this.opts = opts;
    }

    tick(dtMs: number): SpawnRequest[] {
        this.elapsedMs += dtMs;
        this.cooldownMs -= dtMs;
        if (this.cooldownMs > 0) return [];

        const sec = this.elapsedMs / 1000;
        this.cooldownMs = getSpawnIntervalMs(sec);

        const key = pickEnemy(sec, this.opts.randSource());
        const meta = ENEMY_TYPES[key];
        const x = this.opts.minX + this.opts.randSource() * (this.opts.maxX - this.opts.minX);
        const vy = meta.vyMin + this.opts.randSource() * (meta.vyMax - meta.vyMin);
        return [{ typeKey: key, x, vy }];
    }
}
