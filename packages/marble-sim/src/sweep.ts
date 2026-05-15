import type { Vec2 } from './types.js';

export interface SweepInit {
    pivot: Vec2;
    length: number;
    omega: number;
    angle?: number;
    thickness?: number;
}

export class Sweep {
    id: number;
    pivot: Vec2;
    length: number;
    omega: number;
    angle: number;
    thickness: number;

    constructor(id: number, init: SweepInit) {
        this.id = id;
        this.pivot = { x: init.pivot.x, y: init.pivot.y };
        this.length = init.length;
        this.omega = init.omega;
        this.angle = init.angle ?? 0;
        this.thickness = init.thickness ?? 4;
    }

    advance(dt: number): void {
        this.angle += this.omega * dt;
    }

    endpoint(): Vec2 {
        return {
            x: this.pivot.x + Math.cos(this.angle) * this.length,
            y: this.pivot.y + Math.sin(this.angle) * this.length
        };
    }
}
