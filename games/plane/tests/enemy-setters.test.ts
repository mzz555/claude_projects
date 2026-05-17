import { describe, it, expect, beforeEach } from 'vitest';
import { BehaviorRegistry } from '../src/behaviors/BehaviorRegistry.js';
import { SinusoidalBehavior } from '../src/behaviors/SinusoidalBehavior.js';
import { HoverBehavior } from '../src/behaviors/HoverBehavior.js';
import { HorizontalSweepBehavior } from '../src/behaviors/HorizontalSweepBehavior.js';

describe('Enemy setters - setBehavior', () => {
    beforeEach(() => {
        BehaviorRegistry.instance.clear();
        // 手动注册，避免 registerAllBehaviors() 的 short-circuit
        BehaviorRegistry.instance.register('sinusoidal', () => new SinusoidalBehavior());
        BehaviorRegistry.instance.register('hover', () => new HoverBehavior());
        BehaviorRegistry.instance.register('horizontal-sweep', () => new HorizontalSweepBehavior({ speed: 240 }));
    });

    it('setBehavior 通过 BehaviorRegistry 拿新行为并执行 init', () => {
        const enemyMock = {
            behavior: null as any,
            setBehavior(id: string): void {
                this.behavior = BehaviorRegistry.instance.create(id);
                this.behavior?.init({} as never);
            }
        };
        enemyMock.setBehavior('hover');
        expect(enemyMock.behavior).not.toBeNull();
        expect(enemyMock.behavior.id).toBe('hover');
    });

    it('setBehavior 切到不同 behavior id', () => {
        const enemyMock = {
            behavior: null as any,
            setBehavior(id: string): void {
                this.behavior = BehaviorRegistry.instance.create(id);
                this.behavior?.init({} as never);
            }
        };
        enemyMock.setBehavior('sinusoidal');
        expect(enemyMock.behavior.id).toBe('sinusoidal');
        enemyMock.setBehavior('horizontal-sweep');
        expect(enemyMock.behavior.id).toBe('horizontal-sweep');
    });
});
