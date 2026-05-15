import type { Vec2 } from './types.js';

export interface LauncherInit {
    pos: Vec2;
    vel: Vec2;
    r: number;
    interval: number;
}

export class Launcher {
    id: number;
    pos: Vec2;
    vel: Vec2;
    r: number;
    interval: number;
    sinceLast: number;

    constructor(id: number, init: LauncherInit) {
        this.id = id;
        this.pos = { x: init.pos.x, y: init.pos.y };
        this.vel = { x: init.vel.x, y: init.vel.y };
        this.r = init.r;
        this.interval = init.interval;
        this.sinceLast = init.interval;
    }
}
