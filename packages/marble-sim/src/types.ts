export interface Vec2 {
    x: number;
    y: number;
}

export interface WorldConfig {
    bounds: { x: number; y: number; w: number; h: number };
    gravity: number;       // px/s^2
    bounce: number;        // 0..1 反弹系数
    drag?: number;         // 每秒线性阻尼，默认 0
}

export type CollisionEvent =
    | { kind: 'wall'; ballId: number }
    | { kind: 'obstacle'; ballId: number; obstacleId: number }
    | { kind: 'sweep'; ballId: number; sweepId: number }
    | { kind: 'pipe'; ballId: number; pipeId: number }
    | { kind: 'zone'; ballId: number; zoneId: number };

export interface BallSnapshot {
    id: number;
    pos: Vec2;
    vel: Vec2;
    r: number;
    alive: boolean;
}
