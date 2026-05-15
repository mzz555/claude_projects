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
export const PLAY_AREA = {
    x: 0,
    y: HUD_HEIGHT,
    w: 1280,
    h: 720 - HUD_HEIGHT * 2
};
