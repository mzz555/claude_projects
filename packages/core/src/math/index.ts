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
