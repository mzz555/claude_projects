export function clamp(v: number, min: number, max: number): number {
    if (v < min) return min;
    if (v > max) return max;
    return v;
}

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export function rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min + 1));
}

export class SeededRNG {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
    }

    next(): number {
        this.state = (this.state + 0x6d2b79f5) >>> 0;
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
}

export interface AABB {
    x: number;
    y: number;
    w: number;
    h: number;
}

export function hits(a: AABB, b: AABB): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
}
