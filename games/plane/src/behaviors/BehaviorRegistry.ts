import type { BehaviorFactory, IEnemyBehavior } from './IEnemyBehavior.js';

export interface BehaviorMeta {
    id: string;
    displayName: string;
}

/**
 * 行为注册中心（单例）。模块顶层加载时 import 'behaviors/index.js' 完成所有内置行为注册。
 */
export class BehaviorRegistry {
    private static _instance: BehaviorRegistry | null = null;
    static get instance(): BehaviorRegistry {
        if (!this._instance) this._instance = new BehaviorRegistry();
        return this._instance;
    }

    private factories = new Map<string, BehaviorFactory>();
    private metas = new Map<string, BehaviorMeta>();

    register(id: string, factory: BehaviorFactory): void {
        this.factories.set(id, factory);
        const probe = factory();
        this.metas.set(id, { id, displayName: probe.displayName });
    }

    create(id: string): IEnemyBehavior | null {
        const f = this.factories.get(id);
        return f ? f() : null;
    }

    listAll(): BehaviorMeta[] {
        return Array.from(this.metas.values());
    }

    /** 测试用：清空所有注册 */
    clear(): void {
        this.factories.clear();
        this.metas.clear();
    }
}
