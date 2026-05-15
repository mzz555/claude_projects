import type { Vec2 } from './types.js';

export interface BallInit {
    pos: Vec2;
    vel: Vec2;
    r: number;
}

export class Ball {
    id: number;
    pos: Vec2;
    vel: Vec2;
    r: number;
    alive = true;

    constructor(id: number, init: BallInit) {
        this.id = id;
        this.pos = { x: init.pos.x, y: init.pos.y };
        this.vel = { x: init.vel.x, y: init.vel.y };
        this.r = init.r;
    }
}
