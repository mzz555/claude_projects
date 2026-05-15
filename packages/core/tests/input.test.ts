import { describe, it, expect, beforeEach } from 'vitest';
import { InputMap } from '../src/input/index.js';

type A = 'fire' | 'left' | 'right';

function fakeKb(): {
    isDown(code: string): boolean;
    press(code: string): void;
    release(code: string): void;
} {
    const down = new Set<string>();
    return {
        isDown: (c) => down.has(c),
        press: (c) => down.add(c),
        release: (c) => down.delete(c)
    };
}

describe('input/InputMap 键盘', () => {
    let kb: ReturnType<typeof fakeKb>;
    let map: InputMap<A>;

    beforeEach(() => {
        kb = fakeKb();
        map = new InputMap<A>({ isKeyDown: kb.isDown });
        map.bindKey('fire', 'Space', 'KeyJ');
        map.bindKey('left', 'ArrowLeft', 'KeyA');
        map.bindKey('right', 'ArrowRight', 'KeyD');
    });

    it('未按键 isDown 为 false', () => {
        expect(map.isDown('fire')).toBe(false);
    });

    it('按下任一绑定键 isDown 为 true', () => {
        kb.press('KeyJ');
        expect(map.isDown('fire')).toBe(true);
    });

    it('justPressed 单帧边沿仅触发一次', () => {
        kb.press('Space');
        map.tick();
        expect(map.justPressed('fire')).toBe(true);
        map.tick();
        expect(map.justPressed('fire')).toBe(false);
    });

    it('松开后再按下又触发一次 justPressed', () => {
        kb.press('Space');
        map.tick();
        kb.release('Space');
        map.tick();
        kb.press('Space');
        map.tick();
        expect(map.justPressed('fire')).toBe(true);
    });
});
