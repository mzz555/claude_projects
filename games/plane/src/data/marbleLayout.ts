/** 弹珠面板外框（含边距）。屏幕坐标，原点屏幕左上角 */
export const MARBLE_PANEL = {
    x: 1040,
    y: 80,
    w: 240,
    h: 560
};

/** 弹珠 World 逻辑尺寸（去掉 padding） */
export const MARBLE_WORLD = {
    paddingX: 10,
    paddingY: 10,
    w: 220,
    h: 540
};

export interface ObstacleSpec {
    x: number;
    y: number;
    r: number;
}

export interface ZoneSpec {
    x: number;
    y: number;
    w: number;
    h: number;
    tier: 1 | 2 | 3 | 4;
    cost: number;
    label: string;
}

export interface LauncherSpec {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    intervalSec: number;
}

export const MARBLE_LAUNCHER: LauncherSpec = {
    x: 30,
    y: 20,
    vx: 0,
    vy: 80,
    r: 6,
    intervalSec: 1.8
};

export const MARBLE_OBSTACLES: ObstacleSpec[] = [
    { x: 60, y: 130, r: 12 },
    { x: 160, y: 130, r: 12 },
    { x: 110, y: 200, r: 12 },
    { x: 40, y: 280, r: 10 },
    { x: 180, y: 280, r: 10 },
    { x: 110, y: 360, r: 14 }
];

export const MARBLE_ZONES: ZoneSpec[] = [
    { x: 5, y: 460, w: 50, h: 70, tier: 1, cost: 2, label: 'Lv1' },
    { x: 60, y: 460, w: 50, h: 70, tier: 2, cost: 4, label: 'Lv2' },
    { x: 115, y: 460, w: 50, h: 70, tier: 3, cost: 8, label: 'Lv3' },
    { x: 170, y: 460, w: 50, h: 70, tier: 4, cost: 16, label: 'Lv4' }
];
