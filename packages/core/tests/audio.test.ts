import { describe, it, expect, vi } from 'vitest';
import { AudioBank } from '../src/audio/index.js';

function makeFakeScene() {
    const sounds = new Map<string, { stop: ReturnType<typeof vi.fn>; setRate?: ReturnType<typeof vi.fn>; setVolume?: ReturnType<typeof vi.fn> }>();
    return {
        sounds,
        sound: {
            add: vi.fn((key: string) => {
                const obj = {
                    play: vi.fn(),
                    stop: vi.fn(),
                    setRate: vi.fn(),
                    setVolume: vi.fn()
                };
                sounds.set(key, obj);
                return obj;
            }),
            removeByKey: vi.fn()
        }
    };
}

describe('audio/AudioBank', () => {
    it('play 不存在的 key 会先 add 再 play', () => {
        const scene = makeFakeScene();
        const bank = new AudioBank(scene as never);
        bank.play('sfx-fire');
        expect(scene.sound.add).toHaveBeenCalledWith('sfx-fire');
    });

    it('mute=true 时 play 被静音（音量 0）', () => {
        const scene = makeFakeScene();
        const bank = new AudioBank(scene as never, { volume: 0.8 });
        bank.setMuted(true);
        bank.play('sfx-fire');
        const obj = scene.sounds.get('sfx-fire')!;
        expect(obj.setVolume).toHaveBeenCalledWith(0);
    });

    it('setMasterVolume 改写后续 play 音量', () => {
        const scene = makeFakeScene();
        const bank = new AudioBank(scene as never);
        bank.setMasterVolume(0.3);
        bank.play('sfx-fire');
        const obj = scene.sounds.get('sfx-fire')!;
        expect(obj.setVolume).toHaveBeenCalledWith(0.3);
    });
});
