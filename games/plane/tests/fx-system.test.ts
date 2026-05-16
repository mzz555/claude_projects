import { describe, it, expect, vi } from 'vitest';
import { FxSystem } from '../src/systems/FxSystem.js';
import { E } from '../src/events.js';

function makeFakeScene() {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const cam = {
        shake: vi.fn()
    };
    const emitter = { emitParticleAt: vi.fn() };
    const scene = {
        events: {
            on: vi.fn(
                (
                    evt: string,
                    fn: (...args: unknown[]) => void,
                    ctx?: object
                ) => {
                    const bound = ctx ? fn.bind(ctx) : fn;
                    if (!listeners.has(evt)) listeners.set(evt, []);
                    listeners.get(evt)!.push(bound);
                }
            ),
            off: vi.fn(),
            once: vi.fn()
        },
        textures: { exists: vi.fn(() => true) },
        add: {
            particles: vi.fn(() => emitter),
            graphics: vi.fn()
        },
        cameras: { main: cam }
    };
    return { scene, listeners, cam, emitter };
}

describe('FxSystem 事件订阅', () => {
    it('订阅 EnemyKilled', () => {
        const fk = makeFakeScene();
        new FxSystem(fk.scene as never);
        expect(fk.listeners.has(E.EnemyKilled)).toBe(true);
    });

    it('收到 EnemyKilled 时触发屏震', () => {
        const fk = makeFakeScene();
        new FxSystem(fk.scene as never);
        const fns = fk.listeners.get(E.EnemyKilled);
        fns![0]!({ score: 100, x: 500, y: 300, enemyType: 'scout' });
        expect(fk.cam.shake).toHaveBeenCalled();
    });

    it('收到 PlayerHit 触发更强屏震', () => {
        const fk = makeFakeScene();
        new FxSystem(fk.scene as never);
        const fns = fk.listeners.get(E.PlayerHit);
        fns![0]!({ damage: 5 });
        expect(fk.cam.shake).toHaveBeenCalled();
    });

    it('订阅 meteor-broken 自定义事件', () => {
        const fk = makeFakeScene();
        new FxSystem(fk.scene as never);
        expect(fk.listeners.has('meteor-broken')).toBe(true);
    });
});
