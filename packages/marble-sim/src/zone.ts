import type { Ball } from './ball.js';

export interface ZoneInit {
    x: number;
    y: number;
    w: number;
    h: number;
    onEnter: (ball: Ball) => void;
}

export class Zone {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    onEnter: (ball: Ball) => void;
    contained = new Set<number>();

    constructor(id: number, init: ZoneInit) {
        this.id = id;
        this.x = init.x;
        this.y = init.y;
        this.w = init.w;
        this.h = init.h;
        this.onEnter = init.onEnter;
    }

    contains(ball: Ball): boolean {
        return (
            ball.pos.x >= this.x &&
            ball.pos.x <= this.x + this.w &&
            ball.pos.y >= this.y &&
            ball.pos.y <= this.y + this.h
        );
    }
}
