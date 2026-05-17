import type { Enemy } from '../entities/Enemy.js';

/** 单个可调参数定义，给 EnemyInspector 渲染 UI */
export interface TunableDef {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    get(): number;
    set(v: number): void;
}

/** 移动行为接口。每架敌机 spawn 时拿一个独立实例（有状态） */
export interface IEnemyBehavior {
    /** 行为 ID，全局唯一 */
    readonly id: string;
    /** 中文显示名 */
    readonly displayName: string;

    /** spawn 后立即调用一次，给 behavior 抓取 enemy 引用 */
    init(enemy: Enemy): void;
    /** 每帧调用，dtMs 是毫秒 */
    update(dtMs: number, playerX: number): void;
    /** 给 EnemyInspector 渲染调参 UI（默认空数组） */
    getTunables(): TunableDef[];
}

/** 行为工厂签名 */
export type BehaviorFactory = () => IEnemyBehavior;
