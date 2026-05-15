import { WEAPONS } from '../data/weapons.js';

export class WeaponSystem {
    private level = 0;
    private cooldown = 0;

    setLevel(level: number): void {
        this.level = level;
    }

    getLevel(): number {
        return this.level;
    }

    tick(dtMs: number): number {
        this.cooldown -= dtMs;
        if (this.cooldown > 0) return 0;
        const interval = WEAPONS[this.level]!.intervalMs;
        this.cooldown = interval;
        return 1;
    }
}
