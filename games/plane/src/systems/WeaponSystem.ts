import { WEAPONS, type WeaponLevel } from '../data/weapons.js';

export interface ShotSpec {
    kind: 'bullet' | 'tracker' | 'beam';
    ox: number;
    oy: number;
    vx: number;
    vy: number;
    damage: number;
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

    setLevel(level: number): void {
        this.level = Math.max(0, Math.min(WEAPONS.length - 1, level));
        this.cooldown = 0;
        this.burst = { bursting: false, fired: 0, nextMs: 0 };
    }

    getLevel(): number {
        return this.level;
    }

    tick(dtMs: number): ShotSpec[] {
        const w = WEAPONS[this.level]!;
        switch (w.mode) {
            case 'single':
                return this.tickSingle(dtMs, w);
            case 'spread':
                return this.tickSpread(dtMs, w);
            case 'burst':
                return this.tickBurst(dtMs, w);
            default:
                return [];
        }
    }

    private tickSingle(dtMs: number, w: WeaponLevel): ShotSpec[] {
        this.cooldown -= dtMs;
        if (this.cooldown > 0) return [];
        this.cooldown = w.intervalMs;
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
        this.cooldown = w.intervalMs;
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

    private tickBurst(dtMs: number, w: WeaponLevel): ShotSpec[] {
        this.burst.nextMs -= dtMs;
        if (this.burst.nextMs > 0) return [];

        if (!this.burst.bursting) {
            this.burst.bursting = true;
            this.burst.fired = 0;
        }
        const burstInt = w.burstIntervalMs ?? 100;
        const cycleInt = w.cycleIntervalMs ?? 300;
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
