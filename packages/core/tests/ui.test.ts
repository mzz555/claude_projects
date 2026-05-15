import { describe, it, expect, vi } from 'vitest';

// Phaser 在 happy-dom 环境无法初始化（Canvas 不可用），提供最小 mock
vi.mock('phaser', () => {
    class Container {
        list: unknown[] = [];
        constructor(_scene: unknown, _x: number, _y: number) {}
        add(children: unknown) {
            const arr = Array.isArray(children) ? children : [children];
            this.list.push(...arr);
            return this;
        }
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

describe('ui/HudPanel relayout', () => {
    type Child = { x: number; y: number; width: number; height: number };
    const fakeScene = { add: { existing: () => undefined } } as never;
    const makeChild = (w: number, h: number): Child => ({ x: 0, y: 0, width: w, height: h });

    it('行布局：cursor 按 child.width + gap 累加', () => {
        const p = new HudPanel(fakeScene, { x: 0, y: 0, direction: 'row', gap: 10 });
        const a = makeChild(80, 20);
        const b = makeChild(40, 20);
        const c = makeChild(60, 20);
        p.addChild(a as never);
        p.addChild(b as never);
        p.addChild(c as never);
        expect(a.x).toBe(0);
        expect(b.x).toBe(80 + 10);
        expect(c.x).toBe(80 + 10 + 40 + 10);
    });

    it('列布局：cursor 按 child.height + gap 累加', () => {
        const p = new HudPanel(fakeScene, { x: 0, y: 0, direction: 'column', gap: 8 });
        const a = makeChild(20, 30);
        const b = makeChild(20, 50);
        p.addChild(a as never);
        p.addChild(b as never);
        expect(a.y).toBe(0);
        expect(b.y).toBe(30 + 8);
    });

    it('child 缺 width/height 时按 0 计入', () => {
        const p = new HudPanel(fakeScene, { x: 0, y: 0, gap: 12 });
        const a = { x: 0, y: 0 };
        const b = { x: 0, y: 0 };
        p.addChild(a as never);
        p.addChild(b as never);
        expect(b.x).toBe(0 + 12);
    });
});
