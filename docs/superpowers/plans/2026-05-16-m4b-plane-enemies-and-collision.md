# M4b · plane 敌机与碰撞实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 M4a 玩家骨架基础上加入 **7 类敌机** 的生成、移动行为、与玩家子弹/玩家本体的碰撞。完工后能从上方持续生成敌机，玩家子弹击杀敌机扣分加分，撞到玩家时玩家扣血归零后切到结算占位场景。

**Architecture:** 数据驱动 + 系统协调。`data/enemyTypes.ts` 描述 7 类敌机静态属性；`data/wavePresets.ts` 描述 5 分钟内时间→等级权重；`systems/WaveDirector` 按 dt 累计时间触发 spawn 请求；`systems/EnemyBehavior` 按 type 字段做移动策略（避免 if-else 散落各 entity）；`systems/CollisionSystem` 把 Phaser Arcade `physics.add.overlap` 包成事件，发 `E.EnemyKilled` / `E.PlayerHit`。Enemy 实例用 Group 池化（同 Bullet 模式），死亡 = `setActive(false)` 回池而非 destroy。

**Tech Stack:** Phaser 3 Arcade Physics（overlap-based collision，AABB body）+ TypeScript strict + `@cp/core` + 既有 events 总线。Phaser Matter 不使用（spec §7.1）。

**前置阅读：**
- 架构 spec：`docs/superpowers/specs/2026-05-15-architecture-design.md` §3.2 / §3.3 / §3.4 / §6.6
- M4a plan：`docs/superpowers/plans/2026-05-16-m4a-plane-scene-and-player.md`（已完成 9 commit，75 测试通过）
- 旧版数值表：`plane/README.md` 与 `plane/game.js:1247-1278`（敌机参数）、`:1294-1322`（移动策略）
- M3 review 留下的 I3 碰撞 sequential：不影响本 plan（Arcade 物理由 Phaser 内部处理 overlap，无单 pass 抖动问题）

**关键约束：**

- 中文回复 + 中文 commit message
- 不动旧 `plane/` `marble/`
- 所有速度 `px/s`：旧版 `vy=1.0 px/帧 @60fps` = **60 px/s**，统一 ×60 转换
- 敌机**伤害到玩家**：本 plan 实现（撞到掉血）；敌机**主动开火/弹幕**：**不实现**（M4d 再做）
- 轰炸机电场 / 母舰生成 scout / 拦截机横扫修正 / 对峙模式（Lv2+）：本 plan 全部**不实现**（M4c 再做 — M4c 同时处理 Boss/Ally/Powerup/9 级武器/对峙）
- 本 plan 实现移动策略只到「直线+正弦+追踪」级别，让游戏先跑通整体闭环
- 每 task 完 commit 中文 message

---

## 文件结构（M4b 产出）

```
games/plane/
├── public/static/飞机png/enemy/
│   ├── enemy-1.png ~ enemy-5.png   # 拷贝自旧目录
├── src/
│   ├── data/
│   │   ├── enemyTypes.ts     # 新：7 类敌机参数表
│   │   └── wavePresets.ts    # 新：时间→等级权重表
│   ├── entities/
│   │   └── Enemy.ts          # 新：Physics.Arcade.Sprite + pool
│   ├── systems/
│   │   ├── EnemyBehavior.ts  # 新：按 type 走移动策略（pure logic + Phaser body）
│   │   ├── WaveDirector.ts   # 新：dt 累计 → spawn 请求（pure logic）
│   │   └── CollisionSystem.ts # 新：包 Phaser overlap，发事件
│   ├── scenes/
│   │   ├── PlayScene.ts      # 改：装配 enemies 池 + 3 个 system + 计分
│   │   └── ResultScene.ts    # 新：极简结算占位（玩家死亡或子弹打爆敌机统计）
│   └── assets/manifest.ts    # 改：加 enemy-1 ~ enemy-5
└── tests/
    ├── enemy-types.test.ts        # 新
    ├── wave-presets.test.ts       # 新
    ├── enemy-behavior.test.ts     # 新（用 fake body 验位移）
    └── wave-director.test.ts      # 新（dt 累计 spawn 节奏）
```

**未在 M4b 范围：** 9 级武器升级 / 道具系统 / 陨石 / 僚机 / Boss / FxSystem 粒子 / SFX。

---

## 总任务清单（8 个）

| # | 任务 | 关键产出 | 测试增量 |
|---|---|---|---|
| 1 | 敌机参数表 + 单测 | `enemyTypes.ts` | +5 |
| 2 | 波次配方表 + 单测 | `wavePresets.ts` | +4 |
| 3 | 拷贝敌机贴图 + manifest 扩展 | `public/static/...` + 改 manifest | — |
| 4 | Enemy 实体 + 池化 | `Enemy.ts` | — |
| 5 | EnemyBehavior 策略 + 单测 | `EnemyBehavior.ts` | +5 |
| 6 | WaveDirector + 单测 | `WaveDirector.ts` | +4 |
| 7 | CollisionSystem | `CollisionSystem.ts` | — |
| 8 | PlayScene 装配 + ResultScene + 计分 | 改 PlayScene、新 ResultScene | — |

完工后预计 **75 + 18 = 93 测试**。

---

## Task 1: 敌机参数表 + 单测

**Files:**
- Create: `games/plane/src/data/enemyTypes.ts`
- Create: `games/plane/tests/enemy-types.test.ts`

> **数据对照旧版（plane/game.js:1247-1278）：**
> - `vy` 旧版 px/帧 → 本 plan ×60 px/s
> - `hp`/`score`/`dmg`/`w`/`h` 与旧版完全一致
> - `tier` 来自 plane/game.js:464 `ENEMY_TIER`，决定道具爆率（M4c 用）
>
> 本 plan **不**收录 `fireRate`、`weaponType`、`color` 等旧字段（敌机开火放 M4d；颜色用 png）

- [ ] **Step 1: 写失败测试**

```ts
// games/plane/tests/enemy-types.test.ts
import { describe, it, expect } from 'vitest';
import { ENEMY_TYPES, type EnemyTypeKey } from '../src/data/enemyTypes.js';

describe('data/enemyTypes', () => {
    it('包含 7 类敌机', () => {
        const keys: EnemyTypeKey[] = ['scout', 'fighter', 'interceptor', 'elite', 'cruiser', 'bomber', 'carrier'];
        for (const k of keys) {
            expect(ENEMY_TYPES[k]).toBeDefined();
        }
    });

    it('scout 参数对齐旧版（hp=2、score=100、tier=1）', () => {
        const s = ENEMY_TYPES.scout;
        expect(s.hp).toBe(2);
        expect(s.score).toBe(100);
        expect(s.tier).toBe(1);
        expect(s.dmg).toBe(1);
    });

    it('carrier 是 Lv4 最强（hp=88、tier=4、score=900）', () => {
        const c = ENEMY_TYPES.carrier;
        expect(c.hp).toBe(88);
        expect(c.tier).toBe(4);
        expect(c.score).toBe(900);
        expect(c.dmg).toBe(2);
    });

    it('所有敌机 hp/score/w/h 都 > 0', () => {
        for (const k of Object.keys(ENEMY_TYPES) as EnemyTypeKey[]) {
            const e = ENEMY_TYPES[k];
            expect(e.hp).toBeGreaterThan(0);
            expect(e.score).toBeGreaterThan(0);
            expect(e.w).toBeGreaterThan(0);
            expect(e.h).toBeGreaterThan(0);
        }
    });

    it('vy 已经是 px/s（数值范围合理 15-150）', () => {
        for (const k of Object.keys(ENEMY_TYPES) as EnemyTypeKey[]) {
            const e = ENEMY_TYPES[k];
            expect(e.vyMin).toBeGreaterThan(10);
            expect(e.vyMax).toBeLessThan(200);
            expect(e.vyMin).toBeLessThanOrEqual(e.vyMax);
        }
    });
});
```

- [ ] **Step 2: 跑测试看 FAIL**

```powershell
pnpm test
# 期望：FAIL，找不到模块
```

- [ ] **Step 3: 实现 `enemyTypes.ts`**

```ts
// games/plane/src/data/enemyTypes.ts

/** 敌机类型 key（共 7 种） */
export type EnemyTypeKey =
    | 'scout'
    | 'fighter'
    | 'interceptor'
    | 'elite'
    | 'cruiser'
    | 'bomber'
    | 'carrier';

export interface EnemyType {
    /** 显示标签（中文） */
    label: string;
    /** 等级 1-4，决定道具爆率与刷新阶段 */
    tier: 1 | 2 | 3 | 4;
    /** 最大血量 */
    hp: number;
    /** 击杀分数 */
    score: number;
    /** 撞击玩家造成的伤害 */
    dmg: number;
    /** 显示尺寸（与旧版 w/h 完全一致；物理 body 略小） */
    w: number;
    h: number;
    /** 下落速度区间（px/s） */
    vyMin: number;
    vyMax: number;
    /** 贴图 key（assets manifest 里同步定义） */
    sprite: string;
}

/**
 * 7 类敌机参数。数值来自旧版 plane/game.js:1247-1278，vy 从 px/帧 转 px/s（×60）。
 */
export const ENEMY_TYPES: Record<EnemyTypeKey, EnemyType> = {
    scout: {
        label: '侦察机',
        tier: 1,
        hp: 2,
        score: 100,
        dmg: 1,
        w: 23,
        h: 21,
        vyMin: 60,    // 旧 1.0 px/帧
        vyMax: 120,   // 旧 2.0 px/帧
        sprite: 'enemy-1'
    },
    fighter: {
        label: '战斗机',
        tier: 2,
        hp: 8,
        score: 260,
        dmg: 1,
        w: 31,
        h: 30,
        vyMin: 36,
        vyMax: 60,
        sprite: 'enemy-2'
    },
    interceptor: {
        label: '拦截机',
        tier: 2,
        hp: 4,
        score: 150,
        dmg: 1,
        w: 20,
        h: 19,
        vyMin: 84,
        vyMax: 132,
        sprite: 'enemy-3'
    },
    elite: {
        label: '精英机',
        tier: 3,
        hp: 12,
        score: 380,
        dmg: 1,
        w: 36,
        h: 35,
        vyMin: 30,
        vyMax: 54,
        sprite: 'enemy-4'
    },
    cruiser: {
        label: '巡洋舰',
        tier: 3,
        hp: 20,
        score: 520,
        dmg: 2,
        w: 44,
        h: 42,
        vyMin: 21,
        vyMax: 39,
        sprite: 'enemy-5'
    },
    bomber: {
        label: '轰炸机',
        tier: 4,
        hp: 64,
        score: 450,
        dmg: 2,
        w: 68,
        h: 56,
        vyMin: 15,
        vyMax: 30,
        sprite: 'enemy-4' // M4b 暂复用 elite 贴图，M4c/d 替换
    },
    carrier: {
        label: '母舰',
        tier: 4,
        hp: 88,
        score: 900,
        dmg: 2,
        w: 84,
        h: 70,
        vyMin: 11,
        vyMax: 21,
        sprite: 'enemy-5' // 同上
    }
};
```

- [ ] **Step 4: 跑测试看 PASS**

```powershell
pnpm test
# 期望：累计 80 通过
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/data/enemyTypes.ts games/plane/tests/enemy-types.test.ts
git commit -m "M4b-1 plane 添加 7 类敌机参数表"
```

---

## Task 2: 波次配方表 + 单测

**Files:**
- Create: `games/plane/src/data/wavePresets.ts`
- Create: `games/plane/tests/wave-presets.test.ts`

> **设计：** 波次随时间推进，按段落决定敌机等级权重。简化版（不完全照搬旧版的 typePoints 系统，那个放 M4c 真正做平衡时再补）：
>
> | 时间段 (s) | 可出现敌机 | 平均刷新间隔 (s) |
> |---|---|---|
> | 0-30 | scout | 1.5 |
> | 30-90 | scout / fighter / interceptor | 1.2 |
> | 90-180 | + elite / cruiser | 1.0 |
> | 180+ | + bomber / carrier | 1.0 |
>
> `pickEnemy(seconds, rand01)`：纯函数，给定时间 + 0..1 随机数 → 选一类 EnemyTypeKey。决定性、可单测。

- [ ] **Step 1: 写失败测试**

```ts
// games/plane/tests/wave-presets.test.ts
import { describe, it, expect } from 'vitest';
import { pickEnemy, getSpawnIntervalMs } from '../src/data/wavePresets.js';

describe('wavePresets/pickEnemy', () => {
    it('0-30s 段只出 scout', () => {
        for (let i = 0; i < 50; i++) {
            const r = i / 50;
            expect(pickEnemy(15, r)).toBe('scout');
        }
    });

    it('30-90s 段在 scout/fighter/interceptor 三选一', () => {
        const seen = new Set<string>();
        for (let i = 0; i < 200; i++) seen.add(pickEnemy(60, i / 200));
        expect(seen.has('scout')).toBe(true);
        expect(seen.has('fighter') || seen.has('interceptor')).toBe(true);
        for (const v of seen) {
            expect(['scout', 'fighter', 'interceptor']).toContain(v);
        }
    });

    it('180s+ 段能出 carrier 或 bomber', () => {
        const seen = new Set<string>();
        for (let i = 0; i < 500; i++) seen.add(pickEnemy(200, i / 500));
        expect(seen.has('carrier') || seen.has('bomber')).toBe(true);
    });
});

describe('wavePresets/getSpawnIntervalMs', () => {
    it('早期段间隔较长（1500ms）', () => {
        expect(getSpawnIntervalMs(10)).toBe(1500);
    });

    it('30s 后变短', () => {
        expect(getSpawnIntervalMs(60)).toBeLessThan(1500);
    });

    it('返回值始终是正数', () => {
        for (let t = 0; t < 600; t += 5) {
            expect(getSpawnIntervalMs(t)).toBeGreaterThan(0);
        }
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现**

```ts
// games/plane/src/data/wavePresets.ts
import type { EnemyTypeKey } from './enemyTypes.js';

interface WaveSegment {
    /** 段起始秒 */
    fromSec: number;
    /** 段刷新间隔（ms） */
    intervalMs: number;
    /** 可选敌机及权重（rand01 < 累计权重 即选中） */
    pool: Array<{ key: EnemyTypeKey; weight: number }>;
}

/** 时间→段落，从最早的段开始声明 */
const SEGMENTS: WaveSegment[] = [
    {
        fromSec: 0,
        intervalMs: 1500,
        pool: [{ key: 'scout', weight: 1 }]
    },
    {
        fromSec: 30,
        intervalMs: 1200,
        pool: [
            { key: 'scout', weight: 0.5 },
            { key: 'fighter', weight: 0.25 },
            { key: 'interceptor', weight: 0.25 }
        ]
    },
    {
        fromSec: 90,
        intervalMs: 1000,
        pool: [
            { key: 'scout', weight: 0.25 },
            { key: 'fighter', weight: 0.2 },
            { key: 'interceptor', weight: 0.2 },
            { key: 'elite', weight: 0.2 },
            { key: 'cruiser', weight: 0.15 }
        ]
    },
    {
        fromSec: 180,
        intervalMs: 1000,
        pool: [
            { key: 'scout', weight: 0.15 },
            { key: 'fighter', weight: 0.15 },
            { key: 'interceptor', weight: 0.15 },
            { key: 'elite', weight: 0.18 },
            { key: 'cruiser', weight: 0.17 },
            { key: 'bomber', weight: 0.1 },
            { key: 'carrier', weight: 0.1 }
        ]
    }
];

function findSegment(seconds: number): WaveSegment {
    let chosen = SEGMENTS[0]!;
    for (const s of SEGMENTS) {
        if (seconds >= s.fromSec) chosen = s;
    }
    return chosen;
}

export function pickEnemy(seconds: number, rand01: number): EnemyTypeKey {
    const seg = findSegment(seconds);
    let acc = 0;
    for (const item of seg.pool) {
        acc += item.weight;
        if (rand01 < acc) return item.key;
    }
    return seg.pool[seg.pool.length - 1]!.key;
}

export function getSpawnIntervalMs(seconds: number): number {
    return findSegment(seconds).intervalMs;
}
```

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 累计 84 通过
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/data/wavePresets.ts games/plane/tests/wave-presets.test.ts
git commit -m "M4b-2 plane 添加 4 段波次配方表"
```

---

## Task 3: 拷贝敌机贴图 + manifest 扩展

**Files:**
- Create: `games/plane/public/static/飞机png/enemy/enemy-{1..5}.png`
- Modify: `games/plane/src/assets/manifest.ts`

- [ ] **Step 1: 拷贝 5 张 enemy png**

```powershell
$srcDir = 'plane\static\飞机png\enemy'
$dstDir = 'games\plane\public\static\飞机png\enemy'
New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
Get-ChildItem "$srcDir\enemy-*.png" | ForEach-Object {
    Copy-Item $_.FullName "$dstDir\$($_.Name)"
}
Get-ChildItem $dstDir
# 期望：enemy-1.png ~ enemy-5.png 共 5 个文件
```

- [ ] **Step 2: 改 `manifest.ts`**

```ts
// games/plane/src/assets/manifest.ts
import type { AssetManifest } from '@cp/core';

export const planeManifest: AssetManifest = {
    images: [
        { key: 'hero', url: 'static/飞机png/hero/plane_01_blue_striker_hires.png' },
        { key: 'enemy-1', url: 'static/飞机png/enemy/enemy-1.png' },
        { key: 'enemy-2', url: 'static/飞机png/enemy/enemy-2.png' },
        { key: 'enemy-3', url: 'static/飞机png/enemy/enemy-3.png' },
        { key: 'enemy-4', url: 'static/飞机png/enemy/enemy-4.png' },
        { key: 'enemy-5', url: 'static/飞机png/enemy/enemy-5.png' }
    ]
};
```

- [ ] **Step 3: typecheck + build**

```powershell
pnpm --filter @cp/game-plane typecheck
pnpm build
# 期望：均 0 error
```

- [ ] **Step 4: Commit**

```powershell
git add games/plane/public games/plane/src/assets/manifest.ts
git commit -m "M4b-3 plane 拷贝 5 张敌机贴图并扩展 manifest"
```

---

## Task 4: Enemy 实体 + 池化

**Files:**
- Create: `games/plane/src/entities/Enemy.ts`

> 仿 `Bullet.ts` 模式：Physics.Arcade.Sprite 子类 + Group 池化。死亡 = `deactivate()` 回池。`fire(spawnArgs)` 重置位置/速度/HP/贴图。`hp` / `score` / `dmg` / `typeKey` 是 runtime 状态。

- [ ] **Step 1: 写 `Enemy.ts`**

```ts
// games/plane/src/entities/Enemy.ts
import Phaser from 'phaser';
import { ENEMY_TYPES, type EnemyTypeKey } from '../data/enemyTypes.js';

export interface EnemySpawnArgs {
    x: number;
    y: number;
    typeKey: EnemyTypeKey;
    vy: number; // 从 [vyMin, vyMax] 抽样后传入
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    typeKey: EnemyTypeKey = 'scout';
    hp = 0;
    score = 0;
    dmg = 0;
    /** 内部时钟，秒，由 EnemyBehavior 推进 */
    behaviorTime = 0;
    /** scout 等正弦/横扫策略用的基线 x */
    spawnX = 0;
    /** 拦截机横扫方向 */
    sweepDir: 1 | -1 = 1;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy-1');
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    spawn(args: EnemySpawnArgs): void {
        const t = ENEMY_TYPES[args.typeKey];
        this.typeKey = args.typeKey;
        this.hp = t.hp;
        this.score = t.score;
        this.dmg = t.dmg;
        this.behaviorTime = 0;
        this.spawnX = args.x;
        this.sweepDir = Math.random() < 0.5 ? 1 : -1;

        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setTexture(t.sprite);
        this.setDisplaySize(t.w, t.h);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(t.w * 0.8, t.h * 0.8, true);
        this.setPosition(args.x, args.y);
        this.setVelocity(0, args.vy);
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
    }

    /** 受击：返回是否被打死 */
    takeDamage(amount: number): boolean {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.deactivate();
            return true;
        }
        return false;
    }

    /** 出屏回池（y > 屏幕底部 + 余量） */
    recycleIfOffscreen(playAreaBottom: number): void {
        if (!this.active) return;
        if (this.y > playAreaBottom + 100) {
            this.deactivate();
        }
    }
}

export function makeEnemyPool(scene: Phaser.Scene, size: number): Phaser.Physics.Arcade.Group {
    const group = scene.physics.add.group({
        classType: Enemy,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: 'enemy-1', quantity: size, active: false, visible: false });
    return group;
}
```

- [ ] **Step 2: typecheck**

```powershell
pnpm --filter @cp/game-plane typecheck
# 期望：0 error
```

- [ ] **Step 3: 此 task 无单测**（同 Bullet：纯 Phaser，下个 task 间接覆盖）

- [ ] **Step 4: Commit**

```powershell
git add games/plane/src/entities/Enemy.ts
git commit -m "M4b-4 plane 添加 Enemy 实体与池化"
```

---

## Task 5: EnemyBehavior 策略 + 单测

**Files:**
- Create: `games/plane/src/systems/EnemyBehavior.ts`
- Create: `games/plane/tests/enemy-behavior.test.ts`

> **简化策略（不实现对峙/电场，那是 M4c）：**
> - `scout`：在 spawnX 基础上做正弦摆动（幅度 25px，频率 2rad/s）
> - `fighter`：朝玩家 X 横向漂移（速度上限 80 px/s）
> - `interceptor`：横扫，撞屏幕边换方向（速度 240 px/s）
> - `elite`：朝玩家追踪（速度上限 60 px/s，比 fighter 慢但更稳）
> - 其他（cruiser/bomber/carrier）：直线下落，不横移
>
> 接口：`updateBehavior(enemy, dtSec, playerX)`。enemy 是有 typeKey/x/y/spawnX/behaviorTime/sweepDir 与 Phaser Body 的对象——测试用 fake 即可（不依赖真 Phaser）。

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/enemy-behavior.test.ts
import { describe, it, expect } from 'vitest';
import { updateBehavior, type BehaviorTarget } from '../src/systems/EnemyBehavior.js';

function fake(typeKey: BehaviorTarget['typeKey'], opts: Partial<BehaviorTarget> = {}): BehaviorTarget {
    let vx = 0;
    return {
        typeKey,
        x: opts.x ?? 640,
        y: opts.y ?? 100,
        spawnX: opts.spawnX ?? 640,
        behaviorTime: 0,
        sweepDir: opts.sweepDir ?? 1,
        getVelocityX: () => vx,
        setVelocityX: (v: number) => {
            vx = v;
        }
    };
}

describe('EnemyBehavior/scout 正弦摆动', () => {
    it('behaviorTime 累加', () => {
        const e = fake('scout');
        updateBehavior(e, 0.1, 640);
        expect(e.behaviorTime).toBeCloseTo(0.1);
    });

    it('vx 在合理范围（|vx| <= 60）', () => {
        const e = fake('scout');
        for (let i = 0; i < 50; i++) updateBehavior(e, 0.05, 640);
        expect(Math.abs(e.getVelocityX())).toBeLessThanOrEqual(60);
    });
});

describe('EnemyBehavior/fighter 朝玩家漂移', () => {
    it('玩家在右边 -> vx > 0', () => {
        const e = fake('fighter', { x: 400 });
        updateBehavior(e, 0.1, 900);
        expect(e.getVelocityX()).toBeGreaterThan(0);
    });

    it('玩家在左边 -> vx < 0', () => {
        const e = fake('fighter', { x: 800 });
        updateBehavior(e, 0.1, 200);
        expect(e.getVelocityX()).toBeLessThan(0);
    });
});

describe('EnemyBehavior/interceptor 横扫', () => {
    it('|vx| 接近 240 px/s', () => {
        const e = fake('interceptor');
        updateBehavior(e, 0.016, 640);
        expect(Math.abs(e.getVelocityX())).toBeCloseTo(240, 0);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现**

```ts
// games/plane/src/systems/EnemyBehavior.ts
import type { EnemyTypeKey } from '../data/enemyTypes.js';

/** EnemyBehavior 所需的最小接口：Enemy 实例与测试 fake 都能满足 */
export interface BehaviorTarget {
    typeKey: EnemyTypeKey;
    x: number;
    y: number;
    spawnX: number;
    behaviorTime: number;
    sweepDir: 1 | -1;
    getVelocityX(): number;
    setVelocityX(v: number): void;
}

const SCOUT_AMP = 25;      // px
const SCOUT_FREQ = 2;      // rad/s

const FIGHTER_TRACK_SPEED = 80;  // px/s
const ELITE_TRACK_SPEED = 60;    // px/s
const INTERCEPTOR_SPEED = 240;   // px/s

export function updateBehavior(e: BehaviorTarget, dtSec: number, playerX: number): void {
    e.behaviorTime += dtSec;
    switch (e.typeKey) {
        case 'scout': {
            // 用 spawnX + 正弦决定目标 x；vx 用差分即可
            const targetX = e.spawnX + Math.sin(e.behaviorTime * SCOUT_FREQ) * SCOUT_AMP;
            const dx = targetX - e.x;
            // 简化：直接把 dx/dt 作为速度，clamp 在 [-60, 60]
            const vx = Math.max(-60, Math.min(60, dx / Math.max(dtSec, 1 / 240)));
            e.setVelocityX(vx);
            break;
        }
        case 'fighter': {
            const dx = playerX - e.x;
            const speed = Math.sign(dx) * Math.min(FIGHTER_TRACK_SPEED, Math.abs(dx) * 4);
            e.setVelocityX(speed);
            break;
        }
        case 'elite': {
            const dx = playerX - e.x;
            const speed = Math.sign(dx) * Math.min(ELITE_TRACK_SPEED, Math.abs(dx) * 3);
            e.setVelocityX(speed);
            break;
        }
        case 'interceptor': {
            e.setVelocityX(e.sweepDir * INTERCEPTOR_SPEED);
            // 边界换向交给 CollisionSystem / PlayScene（监测屏幕外缘）
            break;
        }
        case 'cruiser':
        case 'bomber':
        case 'carrier':
            // 直线下落，vx=0
            e.setVelocityX(0);
            break;
    }
}
```

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 累计 89 通过
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/systems/EnemyBehavior.ts games/plane/tests/enemy-behavior.test.ts
git commit -m "M4b-5 plane 添加 EnemyBehavior 类型移动策略"
```

---

## Task 6: WaveDirector + 单测

**Files:**
- Create: `games/plane/src/systems/WaveDirector.ts`
- Create: `games/plane/tests/wave-director.test.ts`

> WaveDirector 是纯逻辑：吃 dt + 一个 random 源 + spawnX 区间，吐出 spawn 请求列表。PlayScene 拿到请求后从池里取 Enemy 并 `spawn()`。
>
> `request = { typeKey, x, vy }`。x 在 [PLAY_AREA.x + 60, PLAY_AREA.x + PLAY_AREA.w - 60] 区间随机；y 固定屏幕顶上方一点（PlayScene 决定）；vy 从 enemyTypes 的 [vyMin, vyMax] 抽样。

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/wave-director.test.ts
import { describe, it, expect } from 'vitest';
import { WaveDirector } from '../src/systems/WaveDirector.js';

const fixedRand = () => 0.5; // 决定性，方便断言

describe('WaveDirector', () => {
    it('首次 tick 立刻发出第一个 spawn 请求', () => {
        const d = new WaveDirector({
            minX: 100,
            maxX: 900,
            randSource: fixedRand
        });
        const reqs = d.tick(16);
        expect(reqs.length).toBe(1);
    });

    it('冷却期内不再发', () => {
        const d = new WaveDirector({ minX: 100, maxX: 900, randSource: fixedRand });
        d.tick(16);
        const reqs = d.tick(100);
        expect(reqs.length).toBe(0);
    });

    it('累积时间超过间隔仍只发 1 次（防尖峰）', () => {
        const d = new WaveDirector({ minX: 100, maxX: 900, randSource: fixedRand });
        d.tick(16);
        const reqs = d.tick(5000); // 远超 1500ms
        expect(reqs.length).toBe(1);
    });

    it('多帧 1 秒累计在合理刷新频率（早期约 1500ms/次）', () => {
        const d = new WaveDirector({ minX: 100, maxX: 900, randSource: fixedRand });
        let total = 0;
        for (let i = 0; i < 60 * 5; i++) total += d.tick(1000 / 60).length;
        // 5 秒早期段，每 1500ms 一次，理论 ~3-4 次（含首发立发）
        expect(total).toBeGreaterThanOrEqual(3);
        expect(total).toBeLessThanOrEqual(5);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现**

```ts
// games/plane/src/systems/WaveDirector.ts
import { ENEMY_TYPES, type EnemyTypeKey } from '../data/enemyTypes.js';
import { pickEnemy, getSpawnIntervalMs } from '../data/wavePresets.js';

export interface SpawnRequest {
    typeKey: EnemyTypeKey;
    x: number;
    vy: number;
}

export interface WaveDirectorOpts {
    minX: number;
    maxX: number;
    /** 0..1 随机源，便于测试注入决定性源 */
    randSource: () => number;
}

export class WaveDirector {
    private elapsedMs = 0;
    private cooldownMs = 0;
    private opts: WaveDirectorOpts;

    constructor(opts: WaveDirectorOpts) {
        this.opts = opts;
    }

    /** 推进 dt（ms），返回本帧应触发的 spawn 请求 */
    tick(dtMs: number): SpawnRequest[] {
        this.elapsedMs += dtMs;
        this.cooldownMs -= dtMs;
        if (this.cooldownMs > 0) return [];

        const sec = this.elapsedMs / 1000;
        this.cooldownMs = getSpawnIntervalMs(sec);

        const key = pickEnemy(sec, this.opts.randSource());
        const meta = ENEMY_TYPES[key];
        const x = this.opts.minX + this.opts.randSource() * (this.opts.maxX - this.opts.minX);
        const vy = meta.vyMin + this.opts.randSource() * (meta.vyMax - meta.vyMin);
        return [{ typeKey: key, x, vy }];
    }
}
```

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 累计 93 通过
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/systems/WaveDirector.ts games/plane/tests/wave-director.test.ts
git commit -m "M4b-6 plane 添加 WaveDirector 时间驱动生成"
```

---

## Task 7: CollisionSystem

**Files:**
- Create: `games/plane/src/systems/CollisionSystem.ts`

> 包 Phaser `physics.add.overlap`，转成事件总线。**不**直接改 HP / score——那是 PlayScene 监听事件后做。这样 CollisionSystem 与具体游戏规则解耦（spec §3.3 关键设计）。
>
> 本 plan 不写 CollisionSystem 单测：它是 Phaser overlap 的薄壳，单测价值低，人工 dev 验证就够。

- [ ] **Step 1: 实现**

```ts
// games/plane/src/systems/CollisionSystem.ts
import Phaser from 'phaser';
import { Bullet } from '../entities/Bullet.js';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { E } from '../events.js';

export interface CollisionSystemOpts {
    scene: Phaser.Scene;
    player: Player;
    enemies: Phaser.Physics.Arcade.Group;
    bullets: Phaser.Physics.Arcade.Group;
}

export class CollisionSystem {
    constructor(private opts: CollisionSystemOpts) {
        const { scene, player, enemies, bullets } = opts;

        // 玩家子弹 ↔ 敌机
        scene.physics.add.overlap(bullets, enemies, (a, b) => {
            const bullet = a as Bullet;
            const enemy = b as Enemy;
            if (!bullet.active || !enemy.active) return;
            const killed = enemy.takeDamage(bullet.damage);
            bullet.deactivate();
            if (killed) {
                scene.events.emit(E.EnemyKilled, {
                    enemyType: enemy.typeKey,
                    score: enemy.score,
                    x: enemy.x,
                    y: enemy.y
                });
            }
        });

        // 敌机 ↔ 玩家本体
        scene.physics.add.overlap(player, enemies, (_p, b) => {
            const enemy = b as Enemy;
            if (!enemy.active) return;
            scene.events.emit(E.PlayerHit, { damage: enemy.dmg });
            enemy.deactivate(); // 撞玩家自爆
        });
    }
}
```

- [ ] **Step 2: typecheck**

```powershell
pnpm --filter @cp/game-plane typecheck
# 期望：0 error
```

- [ ] **Step 3: Commit**

```powershell
git add games/plane/src/systems/CollisionSystem.ts
git commit -m "M4b-7 plane 添加 CollisionSystem 子弹/玩家碰撞"
```

---

## Task 8: PlayScene 装配 + ResultScene 占位 + 计分

**Files:**
- Modify: `games/plane/src/scenes/PlayScene.ts`
- Create: `games/plane/src/scenes/ResultScene.ts`
- Modify: `games/plane/src/main.ts`

> PlayScene 整合：enemies 池 64 容量、WaveDirector、EnemyBehavior 每帧 update、CollisionSystem 启动、事件监听更新 score / hp / 玩家死亡。ResultScene 暂时极简：显示分数和击杀数，点屏幕返回 Title。
>
> 拦截机横扫边界检测：在 PlayScene.update() 内做，触屏左右边换向。

- [ ] **Step 1: 写 `ResultScene.ts`**

```ts
// games/plane/src/scenes/ResultScene.ts
import Phaser from 'phaser';
import { PLANE_THEME } from '../data/theme.js';

export interface ResultData {
    score: number;
    kills: number;
}

export class ResultScene extends Phaser.Scene {
    constructor() {
        super('result');
    }

    create(data: ResultData): void {
        const { width: W, height: H } = this.scale;
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);
        this.add
            .text(W / 2, H / 2 - 120, '本局结算', {
                fontFamily: PLANE_THEME.fontFamily,
                fontSize: '48px',
                color: PLANE_THEME.primary
            })
            .setOrigin(0.5);
        this.add
            .text(W / 2, H / 2 - 20, `分数：${data.score}`, {
                fontFamily: PLANE_THEME.fontFamily,
                fontSize: '28px',
                color: PLANE_THEME.text
            })
            .setOrigin(0.5);
        this.add
            .text(W / 2, H / 2 + 30, `击杀：${data.kills}`, {
                fontFamily: PLANE_THEME.fontFamily,
                fontSize: '28px',
                color: PLANE_THEME.text
            })
            .setOrigin(0.5);
        const back = this.add
            .text(W / 2, H / 2 + 140, '[ 返回标题 ]', {
                fontFamily: PLANE_THEME.fontFamily,
                fontSize: '24px',
                color: PLANE_THEME.primary
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => this.scene.start('title'));
    }
}
```

- [ ] **Step 2: 改 `main.ts` 注册 ResultScene**

```ts
// games/plane/src/main.ts
import Phaser from 'phaser';
import { BootScene, TitleScene } from '@cp/core';
import { PLANE_THEME } from './data/theme.js';
import { planeManifest } from './assets/manifest.js';
import { PlayScene } from './scenes/PlayScene.js';
import { ResultScene } from './scenes/ResultScene.js';

const boot = new BootScene({ manifest: planeManifest, next: 'title' });
const title = new TitleScene({
    title: '雷霆战机',
    subtitle: 'Phaser 重写版 · M4b',
    theme: PLANE_THEME,
    onStart: () => game.scene.start('play')
});
const play = new PlayScene();
const result = new ResultScene();

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: PLANE_THEME.bg,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    scene: [boot, title, play, result]
});
```

- [ ] **Step 3: 改写 `PlayScene.ts`（关键文件，仔细对照）**

```ts
// games/plane/src/scenes/PlayScene.ts
import Phaser from 'phaser';
import { PLANE_THEME, PLAY_AREA } from '../data/theme.js';
import { Player } from '../entities/Player.js';
import { Bullet, makeBulletPool } from '../entities/Bullet.js';
import { Enemy, makeEnemyPool } from '../entities/Enemy.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { WaveDirector } from '../systems/WaveDirector.js';
import { updateBehavior, type BehaviorTarget } from '../systems/EnemyBehavior.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { WEAPONS } from '../data/weapons.js';
import { E } from '../events.js';

export class PlayScene extends Phaser.Scene {
    private player!: Player;
    private bullets!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private weapon = new WeaponSystem();
    private director!: WaveDirector;

    private score = 0;
    private kills = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private hpText!: Phaser.GameObjects.Text;

    constructor() {
        super('play');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);
        this.physics.world.setBounds(PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.w, PLAY_AREA.h);

        // 重置每局状态（场景切换会复用 instance）
        this.score = 0;
        this.kills = 0;

        const downKeys = new Set<string>();
        const onDown = (e: KeyboardEvent): void => {
            downKeys.add(e.code);
        };
        const onUp = (e: KeyboardEvent): void => {
            downKeys.delete(e.code);
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        this.events.once('shutdown', () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
        });
        const kbSource = { isKeyDown: (code: string): boolean => downKeys.has(code) };

        this.player = new Player(this, this.scale.width / 2, PLAY_AREA.y + PLAY_AREA.h - 80, kbSource);
        this.bullets = makeBulletPool(this, 256);
        this.enemies = makeEnemyPool(this, 64);

        this.director = new WaveDirector({
            minX: PLAY_AREA.x + 60,
            maxX: PLAY_AREA.x + PLAY_AREA.w - 60,
            randSource: Math.random
        });

        new CollisionSystem({
            scene: this,
            player: this.player,
            enemies: this.enemies,
            bullets: this.bullets
        });

        this.scoreText = this.add.text(20, 20, '', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '22px',
            color: PLANE_THEME.primary
        });
        this.hpText = this.add.text(20, 50, '', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '20px',
            color: PLANE_THEME.text
        });
        this.refreshHud();

        this.events.on(E.EnemyKilled, (p: { score: number }) => {
            this.score += p.score;
            this.kills += 1;
            this.refreshHud();
        });

        this.events.on(E.PlayerHit, (p: { damage: number }) => {
            this.player.hp = Math.max(0, this.player.hp - p.damage);
            this.refreshHud();
            if (this.player.hp <= 0) {
                this.scene.start('result', { score: this.score, kills: this.kills });
            }
        });
    }

    override update(_time: number, delta: number): void {
        this.player.tick();

        // 武器自动开火
        const shots = this.weapon.tick(delta);
        for (let i = 0; i < shots; i++) this.fireOnce();

        // 波次驱动 enemy spawn
        const reqs = this.director.tick(delta);
        for (const r of reqs) {
            const enemy = this.enemies.get() as Enemy | null;
            if (enemy) {
                enemy.spawn({
                    x: r.x,
                    y: PLAY_AREA.y - 40,
                    typeKey: r.typeKey,
                    vy: r.vy
                });
            }
        }

        // 敌机行为 + 出屏回池
        const dtSec = delta / 1000;
        const pX = this.player.x;
        this.enemies.children.iterate((obj) => {
            const e = obj as Enemy;
            if (!e.active) return null;
            const target: BehaviorTarget = {
                typeKey: e.typeKey,
                x: e.x,
                y: e.y,
                spawnX: e.spawnX,
                behaviorTime: e.behaviorTime,
                sweepDir: e.sweepDir,
                getVelocityX: () => (e.body as Phaser.Physics.Arcade.Body).velocity.x,
                setVelocityX: (v: number) => (e.body as Phaser.Physics.Arcade.Body).setVelocityX(v)
            };
            updateBehavior(target, dtSec, pX);
            e.behaviorTime = target.behaviorTime;
            // 拦截机撞屏幕边界换向
            if (e.typeKey === 'interceptor') {
                if (e.x < PLAY_AREA.x + 20) e.sweepDir = 1;
                else if (e.x > PLAY_AREA.x + PLAY_AREA.w - 20) e.sweepDir = -1;
            }
            e.recycleIfOffscreen(PLAY_AREA.y + PLAY_AREA.h);
            return null;
        });

        // 子弹回池
        this.bullets.children.iterate((b) => {
            (b as Bullet).recycleIfOffscreen(PLAY_AREA.y);
            return null;
        });
    }

    private fireOnce(): void {
        const bullet = this.bullets.get() as Bullet | null;
        if (!bullet) return;
        const weapon = WEAPONS[this.weapon.getLevel()]!;
        bullet.fire({
            x: this.player.x,
            y: this.player.y - 30,
            vx: 0,
            vy: -weapon.bulletSpeed,
            damage: weapon.damage,
            color: 0x7df9ff
        });
        this.events.emit(E.PlayerFire, { weaponLevel: this.weapon.getLevel() });
    }

    private refreshHud(): void {
        this.scoreText.setText(`分数 ${this.score}    击杀 ${this.kills}`);
        this.hpText.setText(`HP ${this.player.hp} / ${this.player.maxHp}`);
    }
}
```

- [ ] **Step 4: typecheck + lint + test + build**

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# 期望：全 0 error，测试 93 通过
```

- [ ] **Step 5: 人工 dev 验证（必须做）**

```powershell
pnpm dev:plane
```

浏览器：
- Title 显示「Phaser 重写版 · M4b」
- 点开始进 PlayScene
- 左上角 HUD：`分数 0    击杀 0` / `HP 100 / 100`
- 敌机从屏幕上方间隔 1.5s 落下（早期段是 scout）
- 玩家子弹打中敌机会击杀，分数 +100 击杀 +1
- 玩家撞敌机 HP 扣 1（侦察机 dmg=1）
- HP 归 0 切到 ResultScene，显示分数 / 击杀
- 点「返回标题」回 Title
- 跑 ≥ 2 分钟看不同段落敌机类型变化（30s 后能看到 fighter/interceptor，90s 后 elite/cruiser）
- console 无 error

按 Ctrl+C 关闭 dev server。

- [ ] **Step 6: 更新根 `README.md` 当前进度（可选）**

```markdown
- ✅ M4b plane 敌机生成 + 碰撞 + 计分 + 结算占位
- 🚧 M4c plane 强化系统（9 级武器 + 5 种道具 + Boss + 对峙模式）
```

- [ ] **Step 7: Commit**

```powershell
git add games/plane/src/scenes/PlayScene.ts games/plane/src/scenes/ResultScene.ts games/plane/src/main.ts README.md
git commit -m "M4b-8 plane 装配 enemies/WaveDirector/CollisionSystem 完成核心战斗循环

敌机池 64，WaveDirector 时间累计驱动 spawn，4 段配方 0-30s/30-90s/90-180s/180+ 自动升级敌机类型。EnemyBehavior 实现 scout 正弦、fighter/elite 追踪、interceptor 横扫 4 种策略，其他类型直线下落。CollisionSystem 包 Phaser overlap 转事件，玩家受击切到 ResultScene 结算。HUD 显示实时分数、击杀、HP。"
```

---

# M4b 验收

跑完 8 个任务确认：

- [ ] `pnpm test` 93 测试全过（M4a 75 + M4b 18）
- [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 全 0 error
- [ ] `pnpm dev:plane` 能玩出敌机生成 + 子弹击杀 + 计分 + 玩家死亡到结算的完整循环
- [ ] 旧 `plane/` `marble/` 未动
- [ ] 8 个新 commit 独立可 revert

---

# M4b 退出 / 进 M4c 准备

完成后进 M4c。M4c 预期范围：
- 9 级武器升级（副炮 / 蜂群散射 / 追踪导弹 / 双导弹 / 激光炮 / 超频 MAX）
- 5 种道具（火力升级 / 护盾 / 支援+1 / 血包 / 加速）+ PowerupSystem
- 对峙模式（Lv2+ 敌机进入区域后停降只横走）
- Boss 行为（轰炸机电场 / 母舰生成 scout / 拦截机的 sweepAmp 调优）
- 僚机 Ally（按 B 召唤）

预计 10-12 任务。M3 review 留下的 I3 碰撞 iteration、I4 AudioBank API 不一致、I6 Store.write 类型脆弱将在 M4c/M4d 适当节点处理。
