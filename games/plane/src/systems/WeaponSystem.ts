import { WEAPONS, PRIMARY, OVERDRIVE, type WeaponLevelSpec } from '../data/weapons.js';

export type ShotLayer = 'primary' | 'spread' | 'swarm' | 'tracker';

export interface ShotSpec {
    layer: ShotLayer;
    kind: 'bullet' | 'tracker';
    ox: number;
    oy: number;
    vx: number;
    vy: number;
    damage: number;
    color?: number;
    lifetimeMs?: number;
}

export interface BeamState {
    state: 'idle' | 'charging' | 'firing';
    tNormalized: number;
    width: number;
    damagePerSec: number;
}

export class WeaponSystem {
    private level = 0;
    private primaryCooldown = 0;
    private overdriveRemainingMs = 0;

    setLevel(level: number): void {
        this.level = Math.max(0, Math.min(WEAPONS.length - 1, level));
        this.primaryCooldown = 0;
    }

    getLevel(): number {
        return this.level;
    }

    enterOverdrive(): void {
        // 可重复获得：Math.max 模式刷新（与原版一致：不叠加，取较大值）
        this.overdriveRemainingMs = Math.max(this.overdriveRemainingMs, OVERDRIVE.durationMs);
    }

    isOverdrive(): boolean {
        return this.overdriveRemainingMs > 0;
    }

    tickBeam(_dtMs: number): BeamState | null {
        return null; // M4f-6 任务实现
    }

    tick(dtMs: number): ShotSpec[] {
        if (this.overdriveRemainingMs > 0) {
            this.overdriveRemainingMs = Math.max(0, this.overdriveRemainingMs - dtMs);
        }
        const spec = WEAPONS[this.level]!;
        const shots: ShotSpec[] = [];
        this.tickPrimary(spec, dtMs, shots);
        return shots;
    }

    private tickPrimary(spec: WeaponLevelSpec, dtMs: number, out: ShotSpec[]): void {
        if (!spec.layers.primary) return;
        this.primaryCooldown -= dtMs;
        if (this.primaryCooldown > 0) return;
        const interval = this.isOverdrive() ? PRIMARY.overdriveIntervalMs : PRIMARY.intervalMs;
        this.primaryCooldown = interval;
        out.push({
            layer: 'primary',
            kind: 'bullet',
            ox: 0,
            oy: -30,
            vx: 0,
            vy: -PRIMARY.bulletSpeed,
            damage: PRIMARY.damage
        });
    }
}
