import { WEAPONS, type WeaponLevel } from '../data/weapons.js';

export interface BeamState {
    state: 'charging' | 'firing';
    /** 0..1，当前阶段进度 */
    tNormalized: number;
    /** firing 时的实时宽度（px） */
    width: number;
    /** firing 时的实时每秒伤害 */
    damagePerSec: number;
}

export interface ShotSpec {
    kind: 'bullet' | 'tracker' | 'beam';
    ox: number;
    oy: number;
    vx: number;
    vy: number;
    damage: number;
    /** tracker 用 */
    lifetimeMs?: number;
}

interface BurstState {
    bursting: boolean;
    fired: number;
    nextMs: number;
}

export class WeaponSystem {
    private level = 0;
    private cooldown = 0;
    private burst: BurstState = { bursting: false, fired: 0, nextMs: 0 };
    private beamElapsed = 0;
    private overdriveRemainingMs = 0;

    setLevel(level: number): void {
        this.level = Math.max(0, Math.min(WEAPONS.length - 1, level));
        this.cooldown = 0;
        this.burst = { bursting: false, fired: 0, nextMs: 0 };
        this.beamElapsed = 0;
    }

    tickBeam(dtMs: number): BeamState | null {
        if (this.overdriveRemainingMs > 0) {
            this.overdriveRemainingMs = Math.max(0, this.overdriveRemainingMs - dtMs);
        }
        const w = WEAPONS[this.level]!;
        if (w.mode !== 'beam') return null;
        const charge = w.chargeMs ?? 1000;
        const fire = w.fireMs ?? 4000;
        const cycle = charge + fire;
        this.beamElapsed = (this.beamElapsed + dtMs) % cycle;
        if (this.beamElapsed < charge) {
            return {
                state: 'charging',
                tNormalized: this.beamElapsed / charge,
                width: 0,
                damagePerSec: 0
            };
        }
        const tFire = this.beamElapsed - charge;
        const t = tFire / fire;
        const wsBase = w.widthStart ?? 6;
        const ws = this.isOverdrive() ? wsBase * 2 : wsBase;
        const we = w.widthEnd ?? 17;
        const ds = w.damageStartPerSec ?? 12;
        const de = w.damageEndPerSec ?? 90;
        return {
            state: 'firing',
            tNormalized: t,
            width: ws + (we - ws) * t,
            damagePerSec: ds + (de - ds) * t
        };
    }

    getLevel(): number {
        return this.level;
    }

    isOverdrive(): boolean {
        return this.overdriveRemainingMs > 0;
    }

    enterOverdrive(): void {
        const w6 = WEAPONS[6]!;
        this.overdriveRemainingMs = w6.durationMs ?? 5000;
    }

    private effectiveInterval(base: number): number {
        return this.isOverdrive() ? base * 0.5 : base;
    }

    tick(dtMs: number): ShotSpec[] {
        if (this.overdriveRemainingMs > 0) {
            this.overdriveRemainingMs = Math.max(0, this.overdriveRemainingMs - dtMs);
        }
        const w = WEAPONS[this.level]!;
        switch (w.mode) {
            case 'single':
                return this.tickSingle(dtMs, w);
            case 'spread':
                return this.tickSpread(dtMs, w);
            case 'burst':
                return this.tickBurst(dtMs, w);
            case 'tracker':
                return this.tickTracker(dtMs, w);
            default:
                return [];
        }
    }

    private tickSingle(dtMs: number, w: WeaponLevel): ShotSpec[] {
        this.cooldown -= dtMs;
        if (this.cooldown > 0) return [];
        this.cooldown = this.effectiveInterval(w.intervalMs);
        return [
            {
                kind: 'bullet',
                ox: 0,
                oy: -30,
                vx: 0,
                vy: -w.bulletSpeed,
                damage: w.damage
            }
        ];
    }

    private tickSpread(dtMs: number, w: WeaponLevel): ShotSpec[] {
        this.cooldown -= dtMs;
        if (this.cooldown > 0) return [];
        this.cooldown = this.effectiveInterval(w.intervalMs);
        const angles = w.angles ?? [0];
        return angles.map((a) => ({
            kind: 'bullet' as const,
            ox: 0,
            oy: -30,
            vx: Math.sin(a) * w.bulletSpeed,
            vy: -Math.cos(a) * w.bulletSpeed,
            damage: w.damage
        }));
    }

    private tickTracker(dtMs: number, w: WeaponLevel): ShotSpec[] {
        this.cooldown -= dtMs;
        if (this.cooldown > 0) return [];
        this.cooldown = this.effectiveInterval(w.intervalMs);
        const count = w.trackerCount ?? 1;
        const lifetime = w.lifetimeMs ?? 5000;
        const specs: ShotSpec[] = [];
        for (let i = 0; i < count; i++) {
            const offsetX = count === 1 ? 0 : i === 0 ? -16 : 16;
            specs.push({
                kind: 'tracker',
                ox: offsetX,
                oy: -30,
                vx: 0,
                vy: -w.bulletSpeed,
                damage: w.damage,
                lifetimeMs: lifetime
            });
        }
        return specs;
    }

    private tickBurst(dtMs: number, w: WeaponLevel): ShotSpec[] {
        this.burst.nextMs -= dtMs;
        if (this.burst.nextMs > 0) return [];

        if (!this.burst.bursting) {
            this.burst.bursting = true;
            this.burst.fired = 0;
        }
        const burstInt = this.isOverdrive() ? 0 : (w.burstIntervalMs ?? 100);
        const cycleInt = this.isOverdrive()
            ? Math.floor((w.cycleIntervalMs ?? 300) * 0.5)
            : (w.cycleIntervalMs ?? 300);
        const size = w.burstSize ?? 6;
        this.burst.fired += 1;
        if (this.burst.fired >= size) {
            this.burst.bursting = false;
            this.burst.fired = 0;
            this.burst.nextMs = cycleInt;
        } else {
            this.burst.nextMs = burstInt;
        }
        return [
            {
                kind: 'bullet',
                ox: 0,
                oy: -30,
                vx: 0,
                vy: -w.bulletSpeed,
                damage: w.damage
            }
        ];
    }
}
