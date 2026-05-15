import { describe, it, expect, vi } from 'vitest';

// Phaser 在 happy-dom 环境无法初始化（Canvas 不可用），提供最小 mock
vi.mock('phaser', () => {
    class Container {
        list: unknown[] = [];
        constructor(_scene: unknown, _x: number, _y: number) {}
        add(_children: unknown) { return this; }
        setSize(_w: number, _h: number) { return this; }
        setInteractive(_opts?: unknown) { return this; }
        setDepth(_d: number) { return this; }
        on(_event: string, _fn: unknown) { return this; }
    }
    class Scene {
        scale = { width: 800, height: 600 };
        constructor(_key: unknown) {}
    }
    return {
        default: {
            GameObjects: { Container },
            Scene,
            Display: {
                Color: {
                    HexStringToColor: (_s: string) => ({ color: 0x000000 })
                }
            }
        }
    };
});

import { Button } from '../src/ui/Button.js';
import { DEFAULT_THEME } from '../src/ui/theme.js';
import { Bar } from '../src/ui/Bar.js';
import { Dialog } from '../src/ui/Dialog.js';
import { HudPanel } from '../src/ui/HudPanel.js';

describe('ui/Button 导出与默认主题', () => {
    it('Button 是 class', () => {
        expect(typeof Button).toBe('function');
    });
    it('默认主题含主色/次色/危险色', () => {
        expect(DEFAULT_THEME.primary).toMatch(/^0x|^#/);
        expect(DEFAULT_THEME.secondary).toBeDefined();
        expect(DEFAULT_THEME.danger).toBeDefined();
    });
});

describe('ui/导出', () => {
    it('Bar / Dialog / HudPanel 都是 class', () => {
        expect(typeof Bar).toBe('function');
        expect(typeof Dialog).toBe('function');
        expect(typeof HudPanel).toBe('function');
    });
});
