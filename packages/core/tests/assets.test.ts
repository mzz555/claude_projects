import { describe, it, expect, vi } from 'vitest';
import { applyManifest, type AssetManifest } from '../src/assets/index.js';

describe('assets/applyManifest', () => {
    it('按 manifest 调用 Phaser loader 对应方法', () => {
        const loader = {
            image: vi.fn(),
            spritesheet: vi.fn(),
            audio: vi.fn()
        };
        const manifest: AssetManifest = {
            images: [{ key: 'hero', url: 'a.png' }],
            spritesheets: [{ key: 'enemy', url: 'b.png', frameW: 32, frameH: 32 }],
            audio: [{ key: 'sfx-fire', urls: ['c.mp3'] }]
        };

        applyManifest(loader as never, manifest);

        expect(loader.image).toHaveBeenCalledWith('hero', 'a.png');
        expect(loader.spritesheet).toHaveBeenCalledWith('enemy', 'b.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        expect(loader.audio).toHaveBeenCalledWith('sfx-fire', ['c.mp3']);
    });

    it('空 manifest 不抛错', () => {
        const loader = { image: vi.fn(), spritesheet: vi.fn(), audio: vi.fn() };
        expect(() => applyManifest(loader as never, {})).not.toThrow();
    });
});
