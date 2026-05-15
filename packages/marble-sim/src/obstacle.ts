import type { Vec2 } from './types.js';

export interface ObstacleInit {
    pos: Vec2;
    r: number;
}

export class Obstacle {
    id: number;
    pos: Vec2;
    r: number;

    constructor(id: number, init: ObstacleInit) {
        this.id = id;
        this.pos = { x: init.pos.x, y: init.pos.y };
        this.r = init.r;
    }
}
