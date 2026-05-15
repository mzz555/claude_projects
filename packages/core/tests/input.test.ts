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

describe('input/InputMap 手柄', () => {
    it('手柄按钮按下时 isDown 为 true', () => {
        const map = new InputMap<'fire'>({ isKeyDown: () => false });
        map.bindGamepad('fire', 0);
        const buttons = new Set<number>();
        map.setGamepadQuery((b) => buttons.has(b));

        expect(map.isDown('fire')).toBe(false);
        buttons.add(0);
        expect(map.isDown('fire')).toBe(true);
    });

    it('键盘或手柄任一触发都算 down', () => {
        const downKeys = new Set<string>();
        const map = new InputMap<'jump'>({ isKeyDown: (c) => downKeys.has(c) });
        map.bindKey('jump', 'Space');
        map.bindGamepad('jump', 1);
        const buttons = new Set<number>();
        map.setGamepadQuery((b) => buttons.has(b));

        expect(map.isDown('jump')).toBe(false);
        downKeys.add('Space');
        expect(map.isDown('jump')).toBe(true);
        downKeys.delete('Space');
        buttons.add(1);
        expect(map.isDown('jump')).toBe(true);
    });
});
