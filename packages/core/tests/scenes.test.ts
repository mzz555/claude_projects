import { describe, it, expect, vi } from 'vitest';

// Phaser 在 happy-dom 环境无法初始化，提供最小 mock
vi.mock('phaser', () => {
    class Scene {
        scale = { width: 800, height: 600 };
        add = {
            rectangle: (_x: number, _y: number, _w: number, _h: number, _c?: number) => ({
                setOrigin: () => ({ setOrigin: () => ({}) }),
                setDepth: () => ({})
            }),
            text: () => ({ setOrigin: () => ({}), setInteractive: () => ({ on: () => ({}) }), on: () => ({}) }),
            container: () => ({ add: () => ({}), setDepth: () => ({}) })
        };
        load = { on: vi.fn(), image: vi.fn(), spritesheet: vi.fn(), audio: vi.fn() };
        cameras = { main: { setBackgroundColor: vi.fn() } };
        scene = { start: vi.fn() };
        constructor(_key: unknown) {}
    }
    return { default: { Scene } };
});

import { BootScene } from '../src/scenes/BootScene.js';
import { TitleScene } from '../src/scenes/TitleScene.js';
import { PauseOverlay } from '../src/scenes/PauseOverlay.js';
import { GameOverScene } from '../src/scenes/GameOverScene.js';

describe('scenes/BootScene', () => {
    it('是 class，构造不抛错', () => {
        expect(typeof BootScene).toBe('function');
        expect(() => new BootScene({ manifest: {}, next: 'title' })).not.toThrow();
    });
});

describe('scenes/其他模板导出', () => {
    it('TitleScene 是 class', () => expect(typeof TitleScene).toBe('function'));
    it('GameOverScene 是 class', () => expect(typeof GameOverScene).toBe('function'));
    it('PauseOverlay 有 show 静态方法', () => expect(typeof PauseOverlay.show).toBe('function'));
});
