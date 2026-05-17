import { describe, it, expect, beforeEach } from 'vitest';
import { BehaviorRegistry } from '../src/behaviors/BehaviorRegistry.js';
import type { IEnemyBehavior } from '../src/behaviors/IEnemyBehavior.js';

class FakeBehavior implements IEnemyBehavior {
    readonly id = 'fake';
    readonly displayName = '假行为';
    init(): void {}
    update(): void {}
    getTunables(): never[] { return []; }
}

describe('BehaviorRegistry', () => {
    beforeEach(() => {
        BehaviorRegistry.instance.clear();
    });

    it('注册后能通过 id 拿到工厂', () => {
        BehaviorRegistry.instance.register('fake', () => new FakeBehavior());
        const b = BehaviorRegistry.instance.create('fake');
        expect(b?.id).toBe('fake');
    });

    it('listAll 返回所有已注册行为的元数据', () => {
        BehaviorRegistry.instance.register('fake', () => new FakeBehavior());
        const all = BehaviorRegistry.instance.listAll();
        expect(all).toHaveLength(1);
        expect(all[0]).toEqual({ id: 'fake', displayName: '假行为' });
    });

    it('未注册 id 返回 null', () => {
        expect(BehaviorRegistry.instance.create('nope')).toBeNull();
    });

    it('instance 是单例', () => {
        expect(BehaviorRegistry.instance).toBe(BehaviorRegistry.instance);
    });
});
