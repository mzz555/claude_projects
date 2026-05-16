import { DEFAULT_THEME, type Theme } from '@cp/core';

export const PLANE_THEME: Theme = {
    ...DEFAULT_THEME,
    primary: '#7df9ff',
    secondary: '#9d4edd',
    danger: '#ff5577',
    text: '#e6f1ff',
    bg: '#020617',
    fontFamily: 'monospace'
};

export const HUD_HEIGHT = 80;

/** 主战斗区，右侧 240 留给弹珠面板 */
export const PLAY_AREA = {
    x: 0,
    y: HUD_HEIGHT,
    w: 1040,
    h: 720 - HUD_HEIGHT * 2
};

// 弹珠面板尺寸常量见 ./marbleLayout.ts（MARBLE_PANEL / MARBLE_WORLD），
// 与 marble-sim 配置同文件方便维护，且让 MarbleSpawner 不依赖 theme barrel
