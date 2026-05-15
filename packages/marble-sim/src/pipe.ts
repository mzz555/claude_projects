import type { Vec2 } from './types.js';

export interface PipeInit {
    a: Vec2;
    b: Vec2;
    halfWidth: number;
}

export class Pipe {
    id: number;
    a: Vec2;
    b: Vec2;
    halfWidth: number;

    constructor(id: number, init: PipeInit) {
        this.id = id;
        this.a = { x: init.a.x, y: init.a.y };
        this.b = { x: init.b.x, y: init.b.y };
        this.halfWidth = init.halfWidth;
    }
}
