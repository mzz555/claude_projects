import type { WorldConfig } from './types.js';

export const PLANE_SPAWNER_PRESET: WorldConfig = {
    bounds: { x: 0, y: 0, w: 220, h: 560 },
    gravity: 600,
    bounce: 0.6,
    drag: 0.05
};

export const STANDALONE_PRESET: WorldConfig = {
    bounds: { x: 0, y: 0, w: 1280, h: 720 },
    gravity: 1200,
    bounce: 0.7,
    drag: 0.02
};
