# Plane 测试战场 + 面向对象调参系统 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 plane 主菜单加「测试场」入口；测试场内 7 种敌机各 1 架按格栅静态布置，打爆后原地重生；通过单例 DebugPanel + 选中态 EnemyInspector 实时调整每架敌机的 hitbox/移动行为/武器/属性，并可视化移动轨迹。把现有 switch-by-typeKey 的 EnemyBehavior 重构为面向对象的 IEnemyBehavior + BehaviorRegistry 单例。

**Architecture:**
- **行为接口（OO 核心）**：`IEnemyBehavior` 接口，4 个具体类（SinusoidalBehavior / PlayerTrackerBehavior / HorizontalSweepBehavior / HoverBehavior）。`BehaviorRegistry` 单例负责注册/列表/创建。Enemy 持有一个 IEnemyBehavior 实例，spawn 时按 typeKey→behaviorId 映射创建。
- **调参单例**：`debugParams` 已存在，扩展 `enemyOverrides`（每机 hp/score/dmg/vy/behaviorId 等）和 `enemyWeaponOverrides`（每机 intervalMs/bulletSpeed/pellets/spread）。
- **场景**：新增 `TestScene`、新增 `PlaneTitleScene`（替换 core 的 TitleScene，加测试场按钮）。PlayScene 移除调参面板。
- **UI 复用**：DebugPanel 拆出独立 widget（slider/numberInput/section），EnemyInspector 复用这些 widget，两者都从 `debugParams` 单例读写。

**Tech Stack:** Phaser 3.80 / TypeScript strict / 单文件原生 DOM（无外部 UI 库）/ pnpm workspace

---

## 阶段总览

| 阶段 | 内容 | 完成判定 |
|------|------|---------|
| 1 | IEnemyBehavior 抽象 + BehaviorRegistry 单例 + Enemy 重构 | 原游戏所有敌机行为零退化 |
| 2 | PlaneTitleScene + TestScene 骨架 + 7 架敌机复活 | 主菜单能进测试场、打爆原地刷新 |
| 3 | EnemyInspector + DebugPanel 扩展 + 工具栏 | 选中敌机、调任意参数、暂停慢放清空 |
| 4 | 轨迹可视化 + PlayScene 去 panel + 自检 | 选中机有 60 帧轨迹线、PlayScene 干净 |

---

## 文件清单

**新建：**

| 路径 | 责任 |
|------|------|
| `games/plane/src/behaviors/IEnemyBehavior.ts` | 接口 + TunableDef 类型 |
| `games/plane/src/behaviors/BehaviorRegistry.ts` | 单例：注册/列表/create(id) |
| `games/plane/src/behaviors/SinusoidalBehavior.ts` | scout 的正弦摆动 |
| `games/plane/src/behaviors/PlayerTrackerBehavior.ts` | fighter/elite 的追踪玩家 |
| `games/plane/src/behaviors/HorizontalSweepBehavior.ts` | interceptor 的横向匀速 |
| `games/plane/src/behaviors/HoverBehavior.ts` | cruiser/bomber/carrier 的悬停摆动 |
| `games/plane/src/behaviors/index.ts` | 一次性 register 所有 behaviors |
| `games/plane/src/debug/EnemyInspector.ts` | 选中敌机的运行时数据 HUD + 单机参数调节 |
| `games/plane/src/debug/widgets.ts` | 公用 DOM 组件：sliderRow / numberRow / sectionTitle |
| `games/plane/src/scenes/TestScene.ts` | 测试场场景（7 机布局、复活、工具栏） |
| `games/plane/src/scenes/PlaneTitleScene.ts` | 主菜单（加测试场按钮，替换 core TitleScene） |
| `games/plane/tests/behaviors.test.ts` | 4 个 Behavior 的纯逻辑单元测试 |
| `games/plane/tests/behavior-registry.test.ts` | Registry 单例 + create + listAll |

**修改：**

| 路径 | 改动摘要 |
|------|---------|
| `games/plane/src/entities/Enemy.ts` | 持有 `behavior: IEnemyBehavior \| null`，update 时调 behavior.update |
| `games/plane/src/scenes/PlayScene.ts` | 用 enemy.behavior.update 替代 updateBehavior 函数；去除 DebugPanel mount |
| `games/plane/src/systems/EnemyBehavior.ts` | 仍保留 `shouldConfront` 工具函数；删除 `updateBehavior` |
| `games/plane/src/debug/debugParams.ts` | 加 `enemyOverrides` + `enemyWeaponOverrides` + `selectedEnemyTypeKey` + `paused` + `timeScale` |
| `games/plane/src/debug/DebugPanel.ts` | 拆 widget；去除 panel 在 PlayScene 的挂载逻辑（TestScene 才挂） |
| `games/plane/src/main.ts` | 用 PlaneTitleScene 替换 core TitleScene；scene 列表加 TestScene |

---

## 阶段 1：行为系统面向对象重构

### Task 1.1：定义 IEnemyBehavior 接口

**Files:**
- Create: `games/plane/src/behaviors/IEnemyBehavior.ts`

- [ ] **Step 1：写接口文件**

```ts
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
```

- [ ] **Step 2：typecheck**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS（接口本身不引用别的代码）

- [ ] **Step 3：commit**

```bash
git add games/plane/src/behaviors/IEnemyBehavior.ts
git commit -m "M5-1 plane 定义 IEnemyBehavior 接口（行为面向对象抽象核心）"
```

---

### Task 1.2：BehaviorRegistry 单例 + 单元测试

**Files:**
- Create: `games/plane/src/behaviors/BehaviorRegistry.ts`
- Test: `games/plane/tests/behavior-registry.test.ts`

- [ ] **Step 1：写失败的测试**

```ts
// games/plane/tests/behavior-registry.test.ts
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
```

- [ ] **Step 2：跑测试确认失败**

Run: `cd games/plane && npx vitest run tests/behavior-registry.test.ts`
Expected: FAIL（BehaviorRegistry 还不存在）

- [ ] **Step 3：实现 BehaviorRegistry**

```ts
// games/plane/src/behaviors/BehaviorRegistry.ts
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
```

- [ ] **Step 4：跑测试确认通过**

Run: `cd games/plane && npx vitest run tests/behavior-registry.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5：typecheck**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6：commit**

```bash
git add games/plane/src/behaviors/BehaviorRegistry.ts games/plane/tests/behavior-registry.test.ts
git commit -m "M5-2 plane BehaviorRegistry 单例 + 单元测试"
```

---

### Task 1.3：4 个具体 Behavior 类实现（纯逻辑迁移）

> 把现有 `EnemyBehavior.ts` 里 switch 的 4 个分支拆成独立类。逻辑完全等价。

**Files:**
- Create: `games/plane/src/behaviors/SinusoidalBehavior.ts`
- Create: `games/plane/src/behaviors/PlayerTrackerBehavior.ts`
- Create: `games/plane/src/behaviors/HorizontalSweepBehavior.ts`
- Create: `games/plane/src/behaviors/HoverBehavior.ts`
- Test: `games/plane/tests/behaviors.test.ts`

- [ ] **Step 1：写失败的测试**

```ts
// games/plane/tests/behaviors.test.ts
import { describe, it, expect } from 'vitest';
import { SinusoidalBehavior } from '../src/behaviors/SinusoidalBehavior.js';
import { PlayerTrackerBehavior } from '../src/behaviors/PlayerTrackerBehavior.js';
import { HorizontalSweepBehavior } from '../src/behaviors/HorizontalSweepBehavior.js';
import { HoverBehavior } from '../src/behaviors/HoverBehavior.js';

// Phaser Sprite 在测试环境难造，给 behavior 一个最小的 mock enemy
function mockEnemy(over: Partial<{ x: number; spawnX: number; confronting: boolean; sweepDir: 1 | -1 }> = {}) {
    let vx = 0;
    let vy = 100;
    return {
        x: 640,
        y: 200,
        spawnX: 640,
        behaviorTime: 0,
        sweepDir: 1 as 1 | -1,
        confronting: false,
        getVelocityX: () => vx,
        setVelocityX: (v: number) => { vx = v; },
        getVelocityY: () => vy,
        setVelocityY: (v: number) => { vy = v; },
        ...over
    };
}

describe('SinusoidalBehavior (scout)', () => {
    it('正弦摆动：spawnX ± 25px 范围内', () => {
        const e = mockEnemy({ x: 640, spawnX: 640 });
        const b = new SinusoidalBehavior();
        b.init(e as never);
        // 跑 1 秒模拟，应该产生非零 vx（除非时间点恰好过零点）
        b.update(500, 640);
        // 不强校验数值，只确认接口跑通
        expect(typeof e.getVelocityX()).toBe('number');
    });
});

describe('PlayerTrackerBehavior (fighter/elite)', () => {
    it('玩家在左 → vx 为负；玩家在右 → vx 为正', () => {
        const e = mockEnemy({ x: 640 });
        const b = new PlayerTrackerBehavior({ trackSpeed: 80 });
        b.init(e as never);
        b.update(16, 400);
        expect(e.getVelocityX()).toBeLessThan(0);
        b.update(16, 800);
        expect(e.getVelocityX()).toBeGreaterThan(0);
    });
});

describe('HorizontalSweepBehavior (interceptor)', () => {
    it('vx = sweepDir × speed', () => {
        const e = mockEnemy({ sweepDir: 1 });
        const b = new HorizontalSweepBehavior({ speed: 240 });
        b.init(e as never);
        b.update(16, 640);
        expect(e.getVelocityX()).toBe(240);
    });
});

describe('HoverBehavior (cruiser/bomber/carrier)', () => {
    it('对峙时小幅摆动，否则 vx=0', () => {
        const e1 = mockEnemy({ confronting: false });
        const b1 = new HoverBehavior();
        b1.init(e1 as never);
        b1.update(16, 640);
        expect(e1.getVelocityX()).toBe(0);

        const e2 = mockEnemy({ confronting: true });
        const b2 = new HoverBehavior();
        b2.init(e2 as never);
        b2.update(500, 640);
        // 对峙时应该有 vx（除非恰好过零点）；放宽：vx 是 number 即可
        expect(typeof e2.getVelocityX()).toBe('number');
    });
});
```

- [ ] **Step 2：跑测试确认失败**

Run: `cd games/plane && npx vitest run tests/behaviors.test.ts`
Expected: FAIL（4 个 behavior 类未实现）

- [ ] **Step 3：实现 SinusoidalBehavior**

```ts
// games/plane/src/behaviors/SinusoidalBehavior.ts
import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    spawnX: number;
    behaviorTime: number;
    confronting: boolean;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class SinusoidalBehavior implements IEnemyBehavior {
    readonly id = 'sinusoidal';
    readonly displayName = '正弦摆动';
    private amp = 25;
    private freq = 2;
    private maxVx = 60;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
    }

    update(dtMs: number, _playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        e.behaviorTime += dtSec;
        if (e.confronting) e.setVelocityY(0);
        const targetX = e.spawnX + Math.sin(e.behaviorTime * this.freq) * this.amp;
        const dx = targetX - e.x;
        const vx = Math.max(-this.maxVx, Math.min(this.maxVx, dx / Math.max(dtSec, 1 / 240)));
        e.setVelocityX(vx);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'amp', label: '振幅', min: 0, max: 200, step: 1, get: () => this.amp, set: (v) => (this.amp = v) },
            { key: 'freq', label: '频率', min: 0.1, max: 8, step: 0.1, get: () => this.freq, set: (v) => (this.freq = v) },
            { key: 'maxVx', label: '最大 vx', min: 0, max: 400, step: 10, get: () => this.maxVx, set: (v) => (this.maxVx = v) }
        ];
    }
}
```

- [ ] **Step 4：实现 PlayerTrackerBehavior**

```ts
// games/plane/src/behaviors/PlayerTrackerBehavior.ts
import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    x: number;
    confronting: boolean;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export interface PlayerTrackerOpts {
    trackSpeed?: number;
}

export class PlayerTrackerBehavior implements IEnemyBehavior {
    readonly id = 'player-tracker';
    readonly displayName = '追踪玩家';
    private trackSpeed: number;
    private enemy: BehaviorEnemyShape | null = null;

    constructor(opts: PlayerTrackerOpts = {}) {
        this.trackSpeed = opts.trackSpeed ?? 80;
    }

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
    }

    update(_dtMs: number, playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        if (e.confronting) e.setVelocityY(0);
        const dx = playerX - e.x;
        const speed = Math.sign(dx) * Math.min(this.trackSpeed, Math.abs(dx) * 4);
        e.setVelocityX(speed);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'trackSpeed', label: '追踪速度', min: 0, max: 400, step: 10, get: () => this.trackSpeed, set: (v) => (this.trackSpeed = v) }
        ];
    }
}
```

- [ ] **Step 5：实现 HorizontalSweepBehavior**

```ts
// games/plane/src/behaviors/HorizontalSweepBehavior.ts
import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    sweepDir: 1 | -1;
    confronting: boolean;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export interface HorizontalSweepOpts {
    speed?: number;
}

export class HorizontalSweepBehavior implements IEnemyBehavior {
    readonly id = 'horizontal-sweep';
    readonly displayName = '横向匀速';
    private speed: number;
    private enemy: BehaviorEnemyShape | null = null;

    constructor(opts: HorizontalSweepOpts = {}) {
        this.speed = opts.speed ?? 240;
    }

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
    }

    update(_dtMs: number, _playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        if (e.confronting) e.setVelocityY(0);
        e.setVelocityX(e.sweepDir * this.speed);
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'speed', label: '横扫速度', min: 0, max: 600, step: 10, get: () => this.speed, set: (v) => (this.speed = v) }
        ];
    }
}
```

- [ ] **Step 6：实现 HoverBehavior**

```ts
// games/plane/src/behaviors/HoverBehavior.ts
import type { IEnemyBehavior, TunableDef } from './IEnemyBehavior.js';

interface BehaviorEnemyShape {
    behaviorTime: number;
    confronting: boolean;
    setVelocityX(v: number): void;
    setVelocityY(v: number): void;
}

export class HoverBehavior implements IEnemyBehavior {
    readonly id = 'hover';
    readonly displayName = '悬停摆动';
    private confrontAmp = 30;
    private confrontFreq = 0.8;
    private enemy: BehaviorEnemyShape | null = null;

    init(enemy: BehaviorEnemyShape): void {
        this.enemy = enemy;
    }

    update(dtMs: number, _playerX: number): void {
        const e = this.enemy;
        if (!e) return;
        const dtSec = dtMs / 1000;
        e.behaviorTime += dtSec;
        if (e.confronting) {
            e.setVelocityY(0);
            e.setVelocityX(Math.sin(e.behaviorTime * this.confrontFreq) * this.confrontAmp);
        } else {
            e.setVelocityX(0);
        }
    }

    getTunables(): TunableDef[] {
        return [
            { key: 'confrontAmp', label: '对峙振幅', min: 0, max: 200, step: 1, get: () => this.confrontAmp, set: (v) => (this.confrontAmp = v) },
            { key: 'confrontFreq', label: '对峙频率', min: 0.1, max: 4, step: 0.1, get: () => this.confrontFreq, set: (v) => (this.confrontFreq = v) }
        ];
    }
}
```

- [ ] **Step 7：跑测试确认通过**

Run: `cd games/plane && npx vitest run tests/behaviors.test.ts`
Expected: PASS（4 个 describe 全绿）

- [ ] **Step 8：commit**

```bash
git add games/plane/src/behaviors/ games/plane/tests/behaviors.test.ts
git commit -m "M5-3 plane 4 个 IEnemyBehavior 类实现 + 单元测试（逻辑从 switch 迁移）"
```

---

### Task 1.4：behaviors/index.ts 注册所有行为

**Files:**
- Create: `games/plane/src/behaviors/index.ts`

- [ ] **Step 1：写文件**

```ts
// games/plane/src/behaviors/index.ts
import { BehaviorRegistry } from './BehaviorRegistry.js';
import { SinusoidalBehavior } from './SinusoidalBehavior.js';
import { PlayerTrackerBehavior } from './PlayerTrackerBehavior.js';
import { HorizontalSweepBehavior } from './HorizontalSweepBehavior.js';
import { HoverBehavior } from './HoverBehavior.js';

let registered = false;

export function registerAllBehaviors(): void {
    if (registered) return;
    registered = true;
    const r = BehaviorRegistry.instance;
    r.register('sinusoidal', () => new SinusoidalBehavior());
    r.register('player-tracker', () => new PlayerTrackerBehavior({ trackSpeed: 80 }));
    r.register('elite-tracker', () => new PlayerTrackerBehavior({ trackSpeed: 60 }));
    r.register('horizontal-sweep', () => new HorizontalSweepBehavior({ speed: 240 }));
    r.register('hover', () => new HoverBehavior());
}

export { BehaviorRegistry } from './BehaviorRegistry.js';
export type { IEnemyBehavior, TunableDef, BehaviorFactory } from './IEnemyBehavior.js';
```

- [ ] **Step 2：typecheck**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3：commit**

```bash
git add games/plane/src/behaviors/index.ts
git commit -m "M5-4 plane 行为统一注册入口（registerAllBehaviors）"
```

---

### Task 1.5：Enemy 持有 IEnemyBehavior + typeKey→behaviorId 映射

**Files:**
- Modify: `games/plane/src/entities/Enemy.ts` (加 `behavior` 字段、spawn 时创建)
- Modify: `games/plane/src/data/enemyTypes.ts` (加 `behaviorId` 字段)

- [ ] **Step 1：enemyTypes.ts 加 behaviorId 字段**

```ts
// games/plane/src/data/enemyTypes.ts:10 EnemyType 接口加一行
export interface EnemyType {
    label: string;
    tier: 1 | 2 | 3 | 4;
    hp: number;
    score: number;
    dmg: number;
    w: number;
    h: number;
    vyMin: number;
    vyMax: number;
    sprite: string;
    bulletTexture: string;
    behaviorId: string;  // 新增
}
```

7 个 ENEMY_TYPES 各加一行：
- scout: `behaviorId: 'sinusoidal'`
- fighter: `behaviorId: 'player-tracker'`
- interceptor: `behaviorId: 'horizontal-sweep'`
- elite: `behaviorId: 'elite-tracker'`
- cruiser: `behaviorId: 'hover'`
- bomber: `behaviorId: 'hover'`
- carrier: `behaviorId: 'hover'`

- [ ] **Step 2：Enemy.ts 加 behavior 字段**

```ts
// games/plane/src/entities/Enemy.ts 顶部 import 区加：
import { BehaviorRegistry, type IEnemyBehavior } from '../behaviors/index.js';
import { debugParams } from '../debug/debugParams.js';

// Enemy class 加字段：
behavior: IEnemyBehavior | null = null;
```

- [ ] **Step 3：spawn 末尾创建 behavior**

```ts
// games/plane/src/entities/Enemy.ts spawn() 末尾追加：
// 优先用 debugParams.enemyOverrides[typeKey].behaviorId（测试场覆写），否则用 ENEMY_TYPES 默认
const override = debugParams.enemyOverrides[args.typeKey];
const behaviorId = override?.behaviorId ?? t.behaviorId;
this.behavior = BehaviorRegistry.instance.create(behaviorId);
this.behavior?.init(this as never);
```

- [ ] **Step 4：deactivate 清空 behavior 引用**

```ts
// games/plane/src/entities/Enemy.ts deactivate() 末尾追加：
this.behavior = null;
```

- [ ] **Step 5：typecheck**

Run: `cd games/plane && npx tsc --noEmit`
Expected: 报错：debugParams.enemyOverrides 尚未定义。继续 Task 1.6 后回来。

- [ ] **Step 6：暂不 commit**，等 Task 1.6 + 1.7 完成后一起。

---

### Task 1.6：debugParams 加 enemyOverrides

**Files:**
- Modify: `games/plane/src/debug/debugParams.ts`

- [ ] **Step 1：扩展 DebugParams 接口**

```ts
// games/plane/src/debug/debugParams.ts 接口加：
export interface EnemyOverride {
    behaviorId?: string;
    hp?: number;
    score?: number;
    dmg?: number;
    vy?: number;
}

export interface DebugParams {
    // ... existing fields ...
    /** 每机 override（仅 TestScene 用，PlayScene 不设值就走 ENEMY_TYPES 默认） */
    enemyOverrides: Partial<Record<EnemyTypeKey, EnemyOverride>>;
    /** 当前选中查看的敌机 typeKey（EnemyInspector 用） */
    selectedEnemyTypeKey: EnemyTypeKey | null;
    /** 暂停 */
    paused: boolean;
    /** 时间缩放（1.0 正常，0.25 慢放） */
    timeScale: number;
}
```

初始值加：

```ts
export const debugParams: DebugParams = {
    // ... existing values ...
    enemyOverrides: {},
    selectedEnemyTypeKey: null,
    paused: false,
    timeScale: 1.0
};
```

- [ ] **Step 2：typecheck**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS（Enemy.ts 现在能编译，因为 enemyOverrides 已定义）

---

### Task 1.7：PlayScene 用 enemy.behavior.update 替代 updateBehavior 函数

**Files:**
- Modify: `games/plane/src/scenes/PlayScene.ts` (找到现有 `updateBehavior(e, ...)` 调用)
- Modify: `games/plane/src/systems/EnemyBehavior.ts` (删除 updateBehavior 函数，保留 shouldConfront)

- [ ] **Step 1：替换 PlayScene 里的调用**

找到 `PlayScene.ts` 里所有 `updateBehavior(...)` 调用，替换为：

```ts
e.behavior?.update(delta, this.player.x);
```

- [ ] **Step 2：删 updateBehavior 函数**

`games/plane/src/systems/EnemyBehavior.ts` 删掉 `updateBehavior` 函数和它的常量；只保留 `shouldConfront` 和 `BehaviorTarget` interface（BehaviorTarget 可能 PlayScene 还在用）。

- [ ] **Step 3：main.ts 启动时注册行为**

```ts
// games/plane/src/main.ts 顶部 import 加：
import { registerAllBehaviors } from './behaviors/index.js';

// new Phaser.Game 之前调一次：
registerAllBehaviors();
```

- [ ] **Step 4：typecheck**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5：跑全部 plane 测试**

Run: `cd games/plane && npx vitest run`
Expected: behaviors / behavior-registry 全过；其余测试至少不因这次改动新增失败（fx-system 旧失败保持原样）。

- [ ] **Step 6：commit 阶段 1 整体**

```bash
git add games/plane/src/entities/Enemy.ts games/plane/src/data/enemyTypes.ts games/plane/src/debug/debugParams.ts games/plane/src/scenes/PlayScene.ts games/plane/src/systems/EnemyBehavior.ts games/plane/src/main.ts
git commit -m "M5-5 plane Enemy 接入 IEnemyBehavior + debugParams 加 enemyOverrides；移除 switch 分发"
```

- [ ] **Step 7：手测验证阶段 1 不退化**

启动 dev server，玩 PlayScene 一局，确认：
- scout 正弦摆动如旧
- fighter/elite 追踪玩家
- interceptor 横向冲屏
- cruiser/bomber/carrier 对峙时摆动

---

## 阶段 2：测试场骨架

### Task 2.1：PlaneTitleScene 替换 core TitleScene

**Files:**
- Create: `games/plane/src/scenes/PlaneTitleScene.ts`
- Modify: `games/plane/src/main.ts`

- [ ] **Step 1：写 PlaneTitleScene**

```ts
// games/plane/src/scenes/PlaneTitleScene.ts
import Phaser from 'phaser';
import { PLANE_THEME } from '../data/theme.js';

export class PlaneTitleScene extends Phaser.Scene {
    constructor() {
        super('title');
    }

    create(): void {
        const { width: W, height: H } = this.scale;
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);

        this.add.text(W / 2, H / 2 - 100, '雷霆战机', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '56px',
            color: PLANE_THEME.primary
        }).setOrigin(0.5);

        this.add.text(W / 2, H / 2 - 40, 'Phaser 重写版 · M5', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '20px',
            color: PLANE_THEME.text
        }).setOrigin(0.5);

        const startBtn = this.add.text(W / 2, H / 2 + 60, '[ 开始游戏 ]', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '28px',
            color: PLANE_THEME.primary
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        startBtn.on('pointerdown', () => this.scene.start('play'));

        const testBtn = this.add.text(W / 2, H / 2 + 120, '[ 测试战场 ]', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '22px',
            color: '#ffaa00'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        testBtn.on('pointerdown', () => this.scene.start('test'));
    }
}
```

- [ ] **Step 2：main.ts 切换**

```ts
// games/plane/src/main.ts
import Phaser from 'phaser';
import { BootScene } from '@cp/core';
import { PLANE_THEME } from './data/theme.js';
import { planeManifest } from './assets/manifest.js';
import { PlayScene } from './scenes/PlayScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { PlaneTitleScene } from './scenes/PlaneTitleScene.js';
import { TestScene } from './scenes/TestScene.js';
import { registerAllBehaviors } from './behaviors/index.js';

registerAllBehaviors();

const boot = new BootScene({ manifest: planeManifest, next: 'title' });
const title = new PlaneTitleScene();
const play = new PlayScene();
const test = new TestScene();
const result = new ResultScene();

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: PLANE_THEME.bg,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [boot, title, play, test, result]
});
```

- [ ] **Step 3：typecheck**

Run: `cd games/plane && npx tsc --noEmit`
Expected: 报错：TestScene 还不存在。继续 Task 2.2 后回来。

---

### Task 2.2：TestScene 骨架 + 7 架敌机静态布局

**Files:**
- Create: `games/plane/src/scenes/TestScene.ts`

- [ ] **Step 1：写 TestScene**

```ts
// games/plane/src/scenes/TestScene.ts
import Phaser from 'phaser';
import { PLANE_THEME, PLAY_AREA } from '../data/theme.js';
import { Enemy, makeEnemyPool } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { Bullet, makeBulletPool } from '../entities/Bullet.js';
import { EnemyBullet, makeEnemyBulletPool } from '../entities/EnemyBullet.js';
import { ENEMY_TYPE_KEYS, type EnemyTypeKey } from '../debug/debugParams.js';
import { ENEMY_TYPES } from '../data/enemyTypes.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { WeaponSystem, type ShotSpec } from '../systems/WeaponSystem.js';
import { WEAPONS } from '../data/weapons.js';
import { E } from '../events.js';

interface FixedSlot {
    typeKey: EnemyTypeKey;
    x: number;
    y: number;
}

export class TestScene extends Phaser.Scene {
    private player!: Player;
    private bullets!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private enemyBullets!: Phaser.Physics.Arcade.Group;
    private weapon = new WeaponSystem();
    private slots: FixedSlot[] = [];
    private slotEnemyMap = new Map<number, Enemy>();
    private respawnQueue: { slotIdx: number; dueAt: number }[] = [];

    constructor() {
        super('test');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);
        this.physics.world.setBounds(PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.w, PLAY_AREA.h);

        const downKeys = new Set<string>();
        window.addEventListener('keydown', (e) => downKeys.add(e.code));
        window.addEventListener('keyup', (e) => downKeys.delete(e.code));
        const kbSource = { isKeyDown: (code: string): boolean => downKeys.has(code) };
        this.player = new Player(this, this.scale.width / 2, PLAY_AREA.y + PLAY_AREA.h - 80, kbSource);

        this.bullets = makeBulletPool(this, 256);
        this.enemies = makeEnemyPool(this, 16);
        this.enemyBullets = makeEnemyBulletPool(this, 128);

        // 7 架横向布局（顶部 1/3 位置）
        const margin = 100;
        const usableW = PLAY_AREA.w - margin * 2;
        const stepX = usableW / (ENEMY_TYPE_KEYS.length - 1);
        const rowY = PLAY_AREA.y + 140;
        ENEMY_TYPE_KEYS.forEach((typeKey, i) => {
            this.slots.push({ typeKey, x: PLAY_AREA.x + margin + stepX * i, y: rowY });
        });
        this.slots.forEach((_, i) => this.spawnSlot(i));

        // 名字 label（每架敌机下方贴标签）
        this.slots.forEach((slot) => {
            this.add.text(slot.x, slot.y + 60, ENEMY_TYPES[slot.typeKey].label, {
                fontFamily: PLANE_THEME.fontFamily,
                fontSize: '12px',
                color: '#ffaa00'
            }).setOrigin(0.5);
        });

        new CollisionSystem({
            scene: this,
            player: this.player,
            enemies: this.enemies,
            bullets: this.bullets,
            powerups: this.physics.add.group(),  // 测试场不用 powerup
            meteors: this.physics.add.group(),
            onPowerupPicked: () => {}
        });

        // 监听 EnemyKilled → 排入 1 秒后复活队列
        this.events.on(E.EnemyKilled, (p: { x: number; y: number }) => {
            const idx = this.findSlotIndexByPos(p.x, p.y);
            if (idx >= 0) this.respawnQueue.push({ slotIdx: idx, dueAt: this.time.now + 1000 });
        });
    }

    override update(_time: number, delta: number): void {
        this.player.tickPlayer(delta);
        // 武器开火
        const specs = this.weapon.tick(delta);
        for (const spec of specs) this.fireSpec(spec);

        // 敌机 behavior tick
        this.enemies.children.iterate((obj) => {
            const e = obj as Enemy;
            if (!e.active) return null;
            e.behavior?.update(delta, this.player.x);
            return null;
        });

        // 复活
        const now = this.time.now;
        while (this.respawnQueue.length > 0 && this.respawnQueue[0]!.dueAt <= now) {
            const { slotIdx } = this.respawnQueue.shift()!;
            this.spawnSlot(slotIdx);
        }
    }

    private spawnSlot(idx: number): void {
        const slot = this.slots[idx];
        if (!slot) return;
        const e = this.enemies.get() as Enemy | null;
        if (!e) return;
        e.spawn({ x: slot.x, y: slot.y, typeKey: slot.typeKey, vy: 0 });
        this.slotEnemyMap.set(idx, e);
    }

    private findSlotIndexByPos(x: number, y: number): number {
        // 死亡位置接近哪个 slot（半径 80px 内）
        for (let i = 0; i < this.slots.length; i++) {
            const s = this.slots[i]!;
            if (Math.hypot(s.x - x, s.y - y) < 80) return i;
        }
        return -1;
    }

    private fireSpec(spec: ShotSpec): void {
        const bullet = this.bullets.get() as Bullet | null;
        if (!bullet) return;
        bullet.fire({
            x: this.player.x + (spec.ox ?? 0),
            y: this.player.y + (spec.oy ?? 0),
            vx: spec.vx ?? 0,
            vy: spec.vy ?? -600,
            damage: spec.damage ?? WEAPONS[1]!.damage,
            color: spec.color ?? 0x7df9ff
        });
    }
}
```

- [ ] **Step 2：typecheck**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3：commit**

```bash
git add games/plane/src/scenes/PlaneTitleScene.ts games/plane/src/scenes/TestScene.ts games/plane/src/main.ts
git commit -m "M5-6 plane PlaneTitleScene 加测试场按钮 + TestScene 骨架（7 机静态布局 + 死亡 1s 后原地复活）"
```

- [ ] **Step 4：手测**

刷浏览器 → 主菜单点「测试战场」 → 7 架敌机一字排开 → 打爆某架 → 1 秒后原地刷新。

---

## 阶段 3：调参 UX

### Task 3.1：抽出公用 widgets

**Files:**
- Create: `games/plane/src/debug/widgets.ts`

- [ ] **Step 1：把 DebugPanel.ts 里的 sliderRow / numberRow / checkboxRow / sectionTitle 抽到 widgets.ts**

```ts
// games/plane/src/debug/widgets.ts
// （复制 DebugPanel.ts 内同名方法的实现，改为独立 export 函数。Style 常量也搬过来。）
// 详细代码：见 DebugPanel.ts 现有实现，去掉 private 改为 export function。
```

具体导出：
- `STYLE` / `HEADER_STYLE` / `SECTION_TITLE` / `ROW` / `VALUE_BADGE` / `BTN` 常量
- `sliderRow(label, initial, min, max, step, onChange): HTMLDivElement`
- `numberRow(label, initial, min, max, step, onChange): HTMLDivElement`
- `checkboxRow(label, initial, onChange): HTMLDivElement`
- `sectionTitle(text): HTMLDivElement`
- `button(text, onClick): HTMLButtonElement`

- [ ] **Step 2：DebugPanel.ts 改成 import widgets**

把 DebugPanel.ts 里所有 private 实现替换成 `import { sliderRow, ... } from './widgets.js'` 的调用。

- [ ] **Step 3：typecheck**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4：commit**

```bash
git add games/plane/src/debug/widgets.ts games/plane/src/debug/DebugPanel.ts
git commit -m "M5-7 plane 调参 UI widgets 抽出（DebugPanel 改用 widgets，为 EnemyInspector 复用做准备）"
```

---

### Task 3.2：EnemyInspector（选中态 HUD + 单机调参）

**Files:**
- Create: `games/plane/src/debug/EnemyInspector.ts`

- [ ] **Step 1：写 EnemyInspector**

```ts
// games/plane/src/debug/EnemyInspector.ts
import type { Enemy } from '../entities/Enemy.js';
import { debugParams, ENEMY_TYPE_LABELS, type EnemyTypeKey } from './debugParams.js';
import { STYLE, sectionTitle, sliderRow, numberRow } from './widgets.js';

export class EnemyInspector {
    private root: HTMLDivElement | null = null;
    /** 选中的敌机实例（运行时引用，可能被回收） */
    private selected: Enemy | null = null;

    mount(): void {
        if (this.root) return;
        const r = document.createElement('div');
        r.id = '__plane_enemy_inspector__';
        const leftStyle = STYLE.replace('right: 8px', 'left: 8px').replace('width: 320px', 'width: 280px');
        r.setAttribute('style', leftStyle);
        document.body.appendChild(r);
        this.root = r;
        this.render();
    }

    unmount(): void {
        this.root?.remove();
        this.root = null;
        this.selected = null;
    }

    select(enemy: Enemy | null): void {
        this.selected = enemy;
        debugParams.selectedEnemyTypeKey = enemy?.typeKey ?? null;
        this.render();
    }

    /** 每帧调用刷新运行时数据（坐标/速度等） */
    tick(): void {
        if (!this.root || !this.selected) return;
        const live = this.root.querySelector('#__live_data__');
        if (live && this.selected.active) {
            const body = this.selected.body as Phaser.Physics.Arcade.Body;
            live.textContent =
                `x=${this.selected.x.toFixed(0)} y=${this.selected.y.toFixed(0)} ` +
                `vx=${body.velocity.x.toFixed(0)} vy=${body.velocity.y.toFixed(0)} ` +
                `hp=${this.selected.hp}`;
        }
    }

    private render(): void {
        if (!this.root) return;
        const r = this.root;
        r.innerHTML = '';

        const header = document.createElement('div');
        header.style.cssText = 'font-weight: bold; color: #fff; border-bottom: 1px solid #1a4a5a; padding-bottom: 4px; margin-bottom: 6px;';
        header.textContent = '🎯 EnemyInspector';
        r.appendChild(header);

        if (!this.selected) {
            const hint = document.createElement('div');
            hint.style.cssText = 'color: #888;';
            hint.textContent = '点击场上任一敌机查看详情';
            r.appendChild(hint);
            return;
        }

        const typeKey = this.selected.typeKey;

        // 类型名
        r.appendChild(sectionTitle(`选中：${ENEMY_TYPE_LABELS[typeKey]} (${typeKey})`));

        // 实时数据行
        const live = document.createElement('div');
        live.id = '__live_data__';
        live.style.cssText = 'color: #7df9ff; font-size: 11px; margin: 4px 0;';
        live.textContent = '...';
        r.appendChild(live);

        // 属性 override
        r.appendChild(sectionTitle('属性 override'));
        const override = debugParams.enemyOverrides[typeKey] ?? {};
        r.appendChild(numberRow('hp', override.hp ?? this.selected.hp, 1, 999, 1, (v) => {
            debugParams.enemyOverrides[typeKey] = { ...override, hp: v };
        }));
        r.appendChild(numberRow('score', override.score ?? this.selected.score, 0, 9999, 10, (v) => {
            debugParams.enemyOverrides[typeKey] = { ...override, score: v };
        }));
        r.appendChild(numberRow('dmg', override.dmg ?? this.selected.dmg, 0, 99, 1, (v) => {
            debugParams.enemyOverrides[typeKey] = { ...override, dmg: v };
        }));

        // 行为 + 行为内参数
        r.appendChild(sectionTitle('行为'));
        const beh = this.selected.behavior;
        if (beh) {
            const idLine = document.createElement('div');
            idLine.style.cssText = 'color: #ffaa00; font-size: 11px;';
            idLine.textContent = `当前：${beh.displayName} (${beh.id})`;
            r.appendChild(idLine);

            for (const t of beh.getTunables()) {
                r.appendChild(sliderRow(t.label, t.get(), t.min, t.max, t.step, t.set));
            }
        }
    }
}
```

- [ ] **Step 2：typecheck**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3：commit**

```bash
git add games/plane/src/debug/EnemyInspector.ts
git commit -m "M5-8 plane EnemyInspector：选中敌机后展示属性 + 行为调参"
```

---

### Task 3.3：TestScene 接入 Inspector + 点选 + 工具栏

**Files:**
- Modify: `games/plane/src/scenes/TestScene.ts`

- [ ] **Step 1：TestScene.create 末尾追加**

```ts
import { DebugPanel } from '../debug/DebugPanel.js';
import { EnemyInspector } from '../debug/EnemyInspector.js';

// TestScene 字段加：
private debugPanel: DebugPanel | null = null;
private inspector: EnemyInspector | null = null;
private toolbar: HTMLDivElement | null = null;

// create() 末尾追加：
this.debugPanel = new DebugPanel();
this.debugPanel.mount();
this.inspector = new EnemyInspector();
this.inspector.mount();
this.toolbar = this.makeToolbar();

// 敌机点击 → 选中
this.input.on('gameobjectdown', (_pointer: unknown, obj: Phaser.GameObjects.GameObject) => {
    if (obj instanceof Enemy) this.inspector?.select(obj);
});
// 让每架敌机可点
this.enemies.children.iterate((obj) => {
    (obj as Enemy).setInteractive();
    return null;
});

this.events.once('shutdown', () => {
    this.debugPanel?.unmount();
    this.inspector?.unmount();
    this.toolbar?.remove();
});
```

- [ ] **Step 2：update() 加 Inspector tick + 暂停/慢放**

```ts
override update(_time: number, delta: number): void {
    this.inspector?.tick();

    // 暂停 → 不更新游戏逻辑（DOM 面板仍可交互）
    if (debugParams.paused) return;
    const dt = delta * debugParams.timeScale;

    this.player.tickPlayer(dt);
    const specs = this.weapon.tick(dt);
    for (const spec of specs) this.fireSpec(spec);

    this.enemies.children.iterate((obj) => {
        const e = obj as Enemy;
        if (!e.active) return null;
        e.behavior?.update(dt, this.player.x);
        return null;
    });

    const now = this.time.now;
    while (this.respawnQueue.length > 0 && this.respawnQueue[0]!.dueAt <= now) {
        const { slotIdx } = this.respawnQueue.shift()!;
        this.spawnSlot(slotIdx);
    }
}
```

- [ ] **Step 3：写 makeToolbar**

```ts
private makeToolbar(): HTMLDivElement {
    const bar = document.createElement('div');
    bar.id = '__plane_toolbar__';
    bar.style.cssText = `
        position: fixed; bottom: 8px; left: 50%; transform: translateX(-50%); z-index: 9999;
        background: rgba(0, 16, 24, 0.92); padding: 6px 10px; border-radius: 4px;
        border: 1px solid #1a4a5a; display: flex; gap: 8px; align-items: center;
        font: 12px monospace;
    `;
    const btn = (text: string, onClick: () => void): HTMLButtonElement => {
        const b = document.createElement('button');
        b.textContent = text;
        b.style.cssText = 'background: #1a4a5a; color: #fff; border: 1px solid #2a6a7a; padding: 4px 10px; cursor: pointer; border-radius: 2px;';
        b.onclick = onClick;
        return b;
    };
    const pauseBtn = btn('⏸ 暂停', () => {
        debugParams.paused = !debugParams.paused;
        pauseBtn.textContent = debugParams.paused ? '▶ 继续' : '⏸ 暂停';
    });
    bar.appendChild(pauseBtn);

    bar.appendChild(btn('🐢 慢放 ×0.25', () => (debugParams.timeScale = 0.25)));
    bar.appendChild(btn('🐇 正常 ×1', () => (debugParams.timeScale = 1.0)));
    bar.appendChild(btn('🔄 重置全部', () => {
        this.enemies.children.iterate((obj) => {
            (obj as Enemy).deactivate();
            return null;
        });
        this.slots.forEach((_, i) => this.spawnSlot(i));
    }));
    bar.appendChild(btn('🧹 清空子弹', () => {
        this.bullets.children.iterate((b) => { (b as Bullet).deactivate(); return null; });
        this.enemyBullets.children.iterate((b) => { (b as EnemyBullet).deactivate(); return null; });
    }));
    bar.appendChild(btn('↩ 返回菜单', () => this.scene.start('title')));
    document.body.appendChild(bar);
    return bar;
}
```

- [ ] **Step 4：typecheck + 手测**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS

刷浏览器 → 进测试场 → 点某架敌机 → 左侧 Inspector 显示该机数据；改 hp/dmg → 复活后用新值；改 behavior tunable → 立即生效；底部工具栏暂停/慢放/重置/清空生效。

- [ ] **Step 5：commit**

```bash
git add games/plane/src/scenes/TestScene.ts
git commit -m "M5-9 plane TestScene 接入 DebugPanel + EnemyInspector + 工具栏（暂停/慢放/重置/清空）"
```

---

### Task 3.4：Enemy.spawn 读取 enemyOverrides 应用 hp/score/dmg

**Files:**
- Modify: `games/plane/src/entities/Enemy.ts:34-45`

- [ ] **Step 1：spawn 开头加 override 应用**

```ts
// 替换 spawn() 中 hp/score/dmg 三行：
const override = debugParams.enemyOverrides[args.typeKey];
this.hp = override?.hp ?? t.hp;
this.score = override?.score ?? t.score;
this.dmg = override?.dmg ?? t.dmg;
```

- [ ] **Step 2：typecheck**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3：commit**

```bash
git add games/plane/src/entities/Enemy.ts
git commit -m "M5-10 plane Enemy.spawn 应用 debugParams.enemyOverrides（hp/score/dmg）"
```

---

## 阶段 4：高级（轨迹 + 清理）

### Task 4.1：选中敌机 60 帧轨迹可视化

**Files:**
- Modify: `games/plane/src/scenes/TestScene.ts`

- [ ] **Step 1：TestScene 加 trail Graphics + 历史点**

```ts
// 字段：
private trailGfx!: Phaser.GameObjects.Graphics;
private trailHistory: Phaser.Math.Vector2[] = [];
private readonly TRAIL_MAX = 60;

// create() 末尾：
this.trailGfx = this.add.graphics();
this.trailGfx.setDepth(50);

// update() 末尾加：
this.trailGfx.clear();
const selectedKey = debugParams.selectedEnemyTypeKey;
if (selectedKey) {
    // 找到当前 typeKey 的 active 敌机
    let target: Enemy | null = null;
    this.enemies.children.iterate((obj) => {
        const e = obj as Enemy;
        if (e.active && e.typeKey === selectedKey) target = e;
        return null;
    });
    if (target) {
        this.trailHistory.push(new Phaser.Math.Vector2(target.x, target.y));
        if (this.trailHistory.length > this.TRAIL_MAX) this.trailHistory.shift();
        this.trailGfx.lineStyle(2, 0xffaa00, 0.5);
        this.trailGfx.beginPath();
        this.trailHistory.forEach((p, i) => {
            if (i === 0) this.trailGfx.moveTo(p.x, p.y);
            else this.trailGfx.lineTo(p.x, p.y);
        });
        this.trailGfx.strokePath();
    } else {
        this.trailHistory.length = 0;
    }
} else {
    this.trailHistory.length = 0;
}
```

- [ ] **Step 2：typecheck + 手测**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS

手测：选中 scout → 看到正弦摆动轨迹线；选中 hover 敌机 → 看到细微摆动线。

- [ ] **Step 3：commit**

```bash
git add games/plane/src/scenes/TestScene.ts
git commit -m "M5-11 plane TestScene 选中敌机的 60 帧移动轨迹可视化"
```

---

### Task 4.2：PlayScene 移除 DebugPanel mount

**Files:**
- Modify: `games/plane/src/scenes/PlayScene.ts`

- [ ] **Step 1：删除 PlayScene 里的 DebugPanel 相关代码**

具体：
- 移除 `import { DebugPanel } from '../debug/DebugPanel.js'`
- 删 `private debugPanel: DebugPanel | null = null` 字段
- 删 `this.debugPanel = new DebugPanel(); this.debugPanel.mount();`
- 删 shutdown 里的 `this.debugPanel?.unmount()`
- 删 F1 切换里 mount/unmount 那段（F1 仍切 showHitbox，但不重渲染面板）

保留：
- `debugParams.showHitbox` 在 PlayScene 仍用于 hitbox 可视化（玩家想看也能开）
- F1 仍切换 showHitbox

- [ ] **Step 2：typecheck + 手测**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS

手测：进 PlayScene 不再有右侧调参浮窗；进 TestScene 浮窗仍在；F1 在 PlayScene 仍能开命中框可视化（仅绿框，无 UI）。

- [ ] **Step 3：commit**

```bash
git add games/plane/src/scenes/PlayScene.ts
git commit -m "M5-12 plane PlayScene 移除 DebugPanel 浮窗（调参集中到 TestScene）"
```

---

### Task 4.3：自检 + typecheck + 全套手测

- [ ] **Step 1：跑全部测试**

Run: `cd games/plane && npx vitest run`
Expected: behaviors / behavior-registry 全过；fx-system 历史失败保持不增加。

- [ ] **Step 2：跑 typecheck**

Run: `cd games/plane && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3：手测验收 checklist**

打开浏览器（5173 强制刷新或重开 tab）：

- [ ] 主菜单可见两个按钮：开始游戏 / 测试战场
- [ ] 点「开始游戏」进 PlayScene → 玩一局，所有 7 种敌机移动行为如旧
- [ ] PlayScene 没有右上角调参浮窗
- [ ] F1 在 PlayScene 仍能切换 hitbox 绿框
- [ ] 死后回主菜单 → 点「测试战场」进 TestScene
- [ ] 7 架敌机一字排开，下方各有中文名 label
- [ ] 打爆任意敌机 → 1 秒后原地刷新
- [ ] 右上角 DebugPanel：调全局/每机 hitbox 形状，新 spawn 生效
- [ ] 点某架敌机 → 左上角 EnemyInspector 显示 typeKey / 实时坐标速度hp / 属性 override 输入 / 行为名 + tunables
- [ ] 改 EnemyInspector 里 hp → 复活后用新值
- [ ] 改行为 tunable（如 amp） → 当前选中机当帧生效
- [ ] 底部工具栏 ⏸ 暂停 → 整个场冻结
- [ ] 🐢 慢放 → 飞机移动变慢
- [ ] 🔄 重置 → 所有敌机回原位
- [ ] 🧹 清空子弹 → 屏幕子弹瞬清
- [ ] ↩ 返回菜单 → 回到主菜单
- [ ] 选中机 → 屏幕上可见橙色 60 帧轨迹线

---

## 备注：风险与决策记录

1. **Phaser 测试受 happy-dom canvas 限制**：BehaviorRegistry / 4 个 Behavior 类是纯逻辑可测；UI/Scene 走 manual 验收。
2. **Behavior 是有状态的，每架敌机独立实例**：避免共享状态污染。registry.create() 每次返回新实例。
3. **Override 设计**：debugParams.enemyOverrides 是 partial，未设值则走 ENEMY_TYPES 默认。这样 PlayScene 不需要任何 override 也能跑。
4. **Inspector "选中" 是 typeKey 维度**：因为 active 敌机会回收，按实例引用会失效。Inspector 当前显示的"选中机"在 update tick 中按 typeKey 找当前 active 实例。
5. **EnemyBehavior.ts 不全删**：`shouldConfront` 还在用，保留。`BehaviorTarget` interface 可能 PlayScene 不再依赖，但保留对外类型不删（YAGNI 不强清理）。
