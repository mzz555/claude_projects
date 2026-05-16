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
    private externalQueue: EnemyTypeKey[] = [];

    constructor(opts: WaveDirectorOpts) {
        this.opts = opts;
    }

    enqueueExternal(typeKey: EnemyTypeKey): void {
        this.externalQueue.push(typeKey);
    }

    private buildSpawnRequest(typeKey: EnemyTypeKey): SpawnRequest {
        const meta = ENEMY_TYPES[typeKey];
        const x = this.opts.minX + this.opts.randSource() * (this.opts.maxX - this.opts.minX);
        const vy = meta.vyMin + this.opts.randSource() * (meta.vyMax - meta.vyMin);
        return { typeKey, x, vy };
    }

    tick(dtMs: number): SpawnRequest[] {
        const out: SpawnRequest[] = [];
        while (this.externalQueue.length > 0) {
            const typeKey = this.externalQueue.shift()!;
            out.push(this.buildSpawnRequest(typeKey));
        }
        this.elapsedMs += dtMs;
        this.cooldownMs -= dtMs;
        if (this.cooldownMs <= 0) {
            const sec = this.elapsedMs / 1000;
            this.cooldownMs = getSpawnIntervalMs(sec);
            const key = pickEnemy(sec, this.opts.randSource());
            out.push(this.buildSpawnRequest(key));
        }
        return out;
    }
}
