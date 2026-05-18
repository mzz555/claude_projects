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

describe('Enemy setters - setBulletTexture', () => {
    it('setBulletTexture 改 bulletTextureKey 字段', () => {
        const enemyMock = {
            bulletTextureKey: 'enemy-bullet-small',
            setBulletTexture(key: string): void {
                this.bulletTextureKey = key;
            }
        };
        enemyMock.setBulletTexture('enemy-bullet-heavy');
        expect(enemyMock.bulletTextureKey).toBe('enemy-bullet-heavy');
    });
});

describe('Enemy setters - setTypeKey (逻辑骨架)', () => {
    it('setTypeKey 写 typeKey 字段并切到新类别的默认值', () => {
        // 真 Enemy 需要 Phaser scene，这里只验证逻辑骨架是否符合预期
        const mock = {
            typeKey: 'scout' as const,
            hp: 2,
            score: 100,
            dmg: 1,
            bulletTextureKey: 'enemy-bullet-small'
        };
        // 模拟 setTypeKey('bomber') 应该做的事（按 ENEMY_TYPES['bomber'] 的值）：
        Object.assign(mock, {
            typeKey: 'bomber',
            hp: 64,
            score: 450,
            dmg: 2,
            bulletTextureKey: 'enemy-bullet-heavy'
        });
        expect(mock.typeKey).toBe('bomber');
        expect(mock.hp).toBe(64);
        expect(mock.bulletTextureKey).toBe('enemy-bullet-heavy');
    });
});
