# M4e · plane MarbleSpawner 接 marble-sim 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 plane HUD 侧栏嵌入弹珠面板：用 `@cp/marble-sim` 跑物理仿真，4 个 Zone 命中后累积积分触发对应 tier 敌机生成。`WaveDirector` 的时间驱动改为「时间 + 弹珠 zone 命中」联合驱动——时间触发兜底刷新，弹珠命中带来额外节奏与"敌机配方"。

**Architecture:** plane 侧栏 220×560 区域用 Phaser Graphics 直接画 marble-sim 的 World 快照（不引第二个 Phaser.Game 实例，spec §4.1）。MarbleSpawner 是 PlayScene 持有的子系统：拥有自己的 `World` 实例（`PLANE_SPAWNER_PRESET`）、Launcher、4 个 Zone（对应敌机 tier 1-4）、obstacles。每帧 `step(dt)` 推进 + 渲染快照。Zone.onEnter 累积分数到 `typePoints[tier]`，达到阈值就发 `MarbleSpawn` 事件，PlayScene 据此 spawn 对应敌机。

**Tech Stack:** `@cp/marble-sim` World/Launcher/Obstacle/Zone + Phaser Graphics（不用 Sprite，逐帧画圆/线）+ TypeScript strict + 既有 events 总线。

**前置阅读：**
- 架构 spec：`docs/superpowers/specs/2026-05-15-architecture-design.md` §4.4（plane 侧栏复用）/ §6.4 dt
- marble-sim：`packages/marble-sim/src/index.ts`（已有 World/Launcher/Zone/Obstacle，63 测试）
- 旧版 MarbleEnemyPanel：`plane/game.js:202-330`（参考思路，不照搬数值）
- M3 review 留下的 I6 `Store<T>.write` 类型脆弱：M4e **不涉及**（plane 还没持久化），M5 marble 独立游戏 / M6 收尾再处理

**关键约束：**

- 中文回复 + 中文 commit message
- 不动旧 `plane/` `marble/`
- 侧栏占 PLAY_AREA 右边界外的 240×560（含 10px padding），逻辑分辨率 220×560 给 marble-sim
- 时间秒制（dt 给 step() 时用 `delta/1000`）
- 不实现旧版"上下两层 + 武器升级管道"复杂结构——简化为单层世界 + 4 Zone（tier 1/2/3/4）+ 几颗 Obstacle + 1 个 Launcher
- 每 task 完 commit 中文 message

---

## 文件结构（M4e 产出）

```
games/plane/
├── src/
│   ├── data/
│   │   ├── theme.ts                   # 改：把 PLAY_AREA 内缩，留出右侧栏
│   │   └── marbleLayout.ts            # 新：弹珠面板布局（obstacle/zone/launcher 配置）
│   ├── entities/
│   │   └── MarblePanel.ts             # 新：Phaser Graphics 渲染 World snapshot
│   ├── systems/
│   │   ├── MarbleSpawner.ts           # 新：World + 4 Zone tier 累积 + MarbleSpawn 事件
│   │   └── WaveDirector.ts            # 改：可接收外部 spawn 请求叠加时间触发
│   ├── events.ts                      # 改：MarbleSpawn payload 明确为 EnemyTypeKey
│   ├── scenes/PlayScene.ts            # 改：装配 MarbleSpawner + 接收事件 spawn 敌机
│   └── main.ts                        # 改：subtitle 改 M4e
└── tests/
    ├── marble-layout.test.ts          # 新：布局数据结构基本校验
    └── marble-spawner.test.ts         # 新：tier 累积逻辑（不依赖 Phaser）
```

未在 M4e 范围：marble 独立游戏（M5）、persistence（M6）、关卡编辑器（YAGNI）。

---

## 总任务清单（7 个）

| # | 任务 | 测试增量 |
|---|---|---|
| 1 | 收窄 PLAY_AREA + marbleLayout 数据 + 单测 | +4 |
| 2 | MarbleSpawner 系统骨架 + tier 累积 + 单测 | +5 |
| 3 | MarbleSpawner 接 marble-sim World + 时间步进 | — |
| 4 | MarblePanel 渲染（Graphics 画 obstacle/zone/ball） | — |
| 5 | events.ts 类型收紧 + WaveDirector 外部叠加 | +2 |
| 6 | PlayScene 装配 MarbleSpawner + 事件桥接 | — |
| 7 | main.ts 改 M4e + dev 验证 | — |

完工后预计 **168 + 11 = 179 测试**。

---

## Task 1: 收窄 PLAY_AREA + marbleLayout 数据 + 单测

**Files:**
- Modify: `games/plane/src/data/theme.ts`
- Create: `games/plane/src/data/marbleLayout.ts`
- Create: `games/plane/tests/marble-layout.test.ts`

> PLAY_AREA 当前是 1280×560（左 0 → 右 1280）。M4e 把 PLAY_AREA.w 从 1280 收窄到 1040，右侧腾出 240 给侧栏。MARBLE_PANEL 区域位置 = `(1040, HUD_HEIGHT)`，尺寸 240×560，逻辑内边距留 10 px → marble-sim 世界 220×540。

- [ ] **Step 1: 改 `theme.ts`**

```ts
// games/plane/src/data/theme.ts（追加 MARBLE_PANEL）
import { DEFAULT_THEME, type Theme } from '@cp/core';

export const PLANE_THEME: Theme = {
    ...DEFAULT_THEME,
    primary: '#7df9ff',
    secondary: '#9d4edd',
    danger: '#ff5577',
    text: '#e6f1ff',
    bg: '#020617',
    fontFamily: 'monospace'
};

export const HUD_HEIGHT = 80;

/** 主战斗区，右侧 240 留给弹珠面板 */
export const PLAY_AREA = {
    x: 0,
    y: HUD_HEIGHT,
    w: 1040,
    h: 720 - HUD_HEIGHT * 2 // 560
};

/** 弹珠面板外框（含边距） */
export const MARBLE_PANEL = {
    x: 1040,
    y: HUD_HEIGHT,
    w: 240,
    h: 720 - HUD_HEIGHT * 2 // 560
};

/** 弹珠 World 逻辑尺寸（去掉 padding） */
export const MARBLE_WORLD = {
    paddingX: 10,
    paddingY: 10,
    w: 220, // MARBLE_PANEL.w - 2 * paddingX
    h: 540 // MARBLE_PANEL.h - 2 * paddingY
};
```

- [ ] **Step 2: 写失败测试**

```ts
// games/plane/tests/marble-layout.test.ts
import { describe, it, expect } from 'vitest';
import {
    MARBLE_OBSTACLES,
    MARBLE_ZONES,
    MARBLE_LAUNCHER
} from '../src/data/marbleLayout.js';

describe('data/marbleLayout', () => {
    it('4 个 zone 对应 tier 1-4', () => {
        expect(MARBLE_ZONES.length).toBe(4);
        const tiers = MARBLE_ZONES.map((z) => z.tier).sort();
        expect(tiers).toEqual([1, 2, 3, 4]);
    });

    it('每个 zone 含 typePoints 阈值 (cost) > 0', () => {
        for (const z of MARBLE_ZONES) {
            expect(z.cost).toBeGreaterThan(0);
        }
    });

    it('obstacle 至少 3 个，全部在世界范围内', () => {
        expect(MARBLE_OBSTACLES.length).toBeGreaterThanOrEqual(3);
        for (const o of MARBLE_OBSTACLES) {
            expect(o.x).toBeGreaterThanOrEqual(0);
            expect(o.x).toBeLessThanOrEqual(220);
            expect(o.y).toBeGreaterThanOrEqual(0);
            expect(o.y).toBeLessThanOrEqual(540);
            expect(o.r).toBeGreaterThan(0);
        }
    });

    it('launcher 位于顶部、向下发射', () => {
        expect(MARBLE_LAUNCHER.y).toBeLessThan(50);
        expect(MARBLE_LAUNCHER.vy).toBeGreaterThan(0);
        expect(MARBLE_LAUNCHER.intervalSec).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 3: FAIL**

```powershell
pnpm test
```

- [ ] **Step 4: 实现 `marbleLayout.ts`**

```ts
// games/plane/src/data/marbleLayout.ts

/** 障碍配置（圆心坐标 + 半径，单位 px，原点在 MARBLE_WORLD 左上角） */
export interface ObstacleSpec {
    x: number;
    y: number;
    r: number;
}

/** Zone 配置：底部 4 个矩形区，对应敌机 tier */
export interface ZoneSpec {
    /** 矩形左上角 + 宽高 */
    x: number;
    y: number;
    w: number;
    h: number;
    /** 命中累积满 cost 后 spawn 一架 tier 等级的敌机 */
    tier: 1 | 2 | 3 | 4;
    /** 累积阈值（参考旧版 typePoints） */
    cost: number;
    /** 显示标签 */
    label: string;
}

export interface LauncherSpec {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    intervalSec: number;
}

/** 顶部 1 个发射器，每 1.8s 发射一颗 */
export const MARBLE_LAUNCHER: LauncherSpec = {
    x: 30,
    y: 20,
    vx: 0,
    vy: 80,
    r: 6,
    intervalSec: 1.8
};

/** 6 颗障碍均匀分布在中段 */
export const MARBLE_OBSTACLES: ObstacleSpec[] = [
    { x: 60, y: 130, r: 12 },
    { x: 160, y: 130, r: 12 },
    { x: 110, y: 200, r: 12 },
    { x: 40, y: 280, r: 10 },
    { x: 180, y: 280, r: 10 },
    { x: 110, y: 360, r: 14 }
];

/** 底部 4 Zone，对应 tier 1-4。Lv4 阈值最高（cost=16），Lv1 最低（cost=2） */
export const MARBLE_ZONES: ZoneSpec[] = [
    { x: 5, y: 460, w: 50, h: 70, tier: 1, cost: 2, label: 'Lv1' },
    { x: 60, y: 460, w: 50, h: 70, tier: 2, cost: 4, label: 'Lv2' },
    { x: 115, y: 460, w: 50, h: 70, tier: 3, cost: 8, label: 'Lv3' },
    { x: 170, y: 460, w: 50, h: 70, tier: 4, cost: 16, label: 'Lv4' }
];
```

- [ ] **Step 5: PASS**

```powershell
pnpm test
# 累计 ≥ 172（168 + 4）
```

- [ ] **Step 6: Commit**

```powershell
git add games/plane/src/data/theme.ts games/plane/src/data/marbleLayout.ts games/plane/tests/marble-layout.test.ts
git commit -m "M4e-1 plane 收窄 PLAY_AREA 给弹珠面板留位并定义布局数据"
```

---

## Task 2: MarbleSpawner 骨架 + tier 累积 + 单测

**Files:**
- Create: `games/plane/src/systems/MarbleSpawner.ts`
- Create: `games/plane/tests/marble-spawner.test.ts`

> 先做**纯逻辑**部分：`MarbleSpawner` 持有 `typePoints[tier]` 表，`addPoint(tier)` 累积；返回 `EnemyTypeKey | null`（达到阈值时回该 tier 的随机 typeKey 并清零，否则 null）。tier 内多类型随机选择参考旧版（tier=1→scout，tier=2→fighter/interceptor，tier=3→elite/cruiser，tier=4→bomber/carrier）。
>
> 不依赖 Phaser/marble-sim，便于单测。Task 3 把 marble-sim World 套上去。

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/marble-spawner.test.ts
import { describe, it, expect } from 'vitest';
import { MarbleScoreboard } from '../src/systems/MarbleSpawner.js';

describe('MarbleScoreboard tier 累积', () => {
    it('未达阈值返回 null', () => {
        const s = new MarbleScoreboard(() => 0);
        // tier 1 cost=2，加 1 次不够
        expect(s.addPoint(1)).toBeNull();
    });

    it('tier=1 满 2 次产出 scout', () => {
        const s = new MarbleScoreboard(() => 0);
        s.addPoint(1);
        const out = s.addPoint(1);
        expect(out).toBe('scout');
    });

    it('累积满后清零，再加要重新累', () => {
        const s = new MarbleScoreboard(() => 0);
        s.addPoint(1);
        s.addPoint(1); // 触发
        expect(s.addPoint(1)).toBeNull(); // 重新累
    });

    it('tier=2 用 rand=0.0 选 fighter / rand=0.9 选 interceptor', () => {
        const a = new MarbleScoreboard(() => 0);
        a.addPoint(2); a.addPoint(2); a.addPoint(2);
        expect(a.addPoint(2)).toBe('fighter');

        const b = new MarbleScoreboard(() => 0.9);
        b.addPoint(2); b.addPoint(2); b.addPoint(2);
        expect(b.addPoint(2)).toBe('interceptor');
    });

    it('tier=4 cost=16，加 15 次仍 null，第 16 次出 bomber/carrier', () => {
        const s = new MarbleScoreboard(() => 0);
        for (let i = 0; i < 15; i++) expect(s.addPoint(4)).toBeNull();
        const out = s.addPoint(4);
        expect(['bomber', 'carrier']).toContain(out);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现 `MarbleSpawner.ts` 的逻辑部分**

```ts
// games/plane/src/systems/MarbleSpawner.ts
import type { EnemyTypeKey } from '../data/enemyTypes.js';
import { MARBLE_ZONES } from '../data/marbleLayout.js';

const TIER_TYPES: Record<1 | 2 | 3 | 4, EnemyTypeKey[]> = {
    1: ['scout'],
    2: ['fighter', 'interceptor'],
    3: ['elite', 'cruiser'],
    4: ['bomber', 'carrier']
};

const TIER_COST: Record<1 | 2 | 3 | 4, number> = (() => {
    const m: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const z of MARBLE_ZONES) m[z.tier] = z.cost;
    return m;
})();

/** 纯逻辑：tier 命中累积 + 阈值触发选 EnemyTypeKey */
export class MarbleScoreboard {
    private points: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

    constructor(private rand: () => number) {}

    /** 累一次该 tier 的分。返回触发 spawn 的 typeKey，或 null */
    addPoint(tier: 1 | 2 | 3 | 4): EnemyTypeKey | null {
        this.points[tier] += 1;
        if (this.points[tier] < TIER_COST[tier]) return null;
        this.points[tier] = 0;
        const opts = TIER_TYPES[tier];
        const idx = Math.min(opts.length - 1, Math.floor(this.rand() * opts.length));
        return opts[idx]!;
    }

    getPoints(tier: 1 | 2 | 3 | 4): number {
        return this.points[tier];
    }
}
```

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 累计 +5
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/systems/MarbleSpawner.ts games/plane/tests/marble-spawner.test.ts
git commit -m "M4e-2 plane MarbleScoreboard tier 累积逻辑"
```

---

## Task 3: MarbleSpawner 接 marble-sim World

**Files:**
- Modify: `games/plane/src/systems/MarbleSpawner.ts`

> 给 MarbleSpawner 加 `world: World` 字段。构造时按 MARBLE_LAUNCHER / MARBLE_OBSTACLES / MARBLE_ZONES 配置 add 进去；Zone 的 onEnter 转发到 scoreboard.addPoint 并 emit 回调。每帧 `step(dtSec)` 推进 + `snapshot()` 返回供 MarblePanel 渲染。

- [ ] **Step 1: 扩展 `MarbleSpawner.ts`**

```ts
// 在 MarbleSpawner.ts 末尾追加
import { World, type WorldSnapshot } from '@cp/marble-sim';
import {
    MARBLE_LAUNCHER,
    MARBLE_OBSTACLES,
    MARBLE_ZONES
} from '../data/marbleLayout.js';
import { MARBLE_WORLD } from '../data/theme.js';

/** 完整 MarbleSpawner：内嵌 World，提供 tick + snapshot 给上层渲染 */
export class MarbleSpawner {
    readonly world: World;
    readonly scoreboard: MarbleScoreboard;
    private pendingSpawns: EnemyTypeKey[] = [];

    constructor() {
        this.scoreboard = new MarbleScoreboard(Math.random);
        this.world = new World({
            bounds: { x: 0, y: 0, w: MARBLE_WORLD.w, h: MARBLE_WORLD.h },
            gravity: 600,
            bounce: 0.6,
            drag: 0.05
        });
        // 障碍
        for (const o of MARBLE_OBSTACLES) {
            this.world.addObstacle({ pos: { x: o.x, y: o.y }, r: o.r });
        }
        // Zone
        for (const z of MARBLE_ZONES) {
            const tier = z.tier;
            this.world.addZone({
                x: z.x,
                y: z.y,
                w: z.w,
                h: z.h,
                onEnter: () => {
                    const out = this.scoreboard.addPoint(tier);
                    if (out) this.pendingSpawns.push(out);
                }
            });
        }
        // Launcher
        this.world.addLauncher({
            pos: { x: MARBLE_LAUNCHER.x, y: MARBLE_LAUNCHER.y },
            vel: { x: MARBLE_LAUNCHER.vx, y: MARBLE_LAUNCHER.vy },
            r: MARBLE_LAUNCHER.r,
            interval: MARBLE_LAUNCHER.intervalSec
        });
    }

    /** 推进 dt（秒）；返回本次推进后产生的待 spawn 敌机 */
    tick(dtSec: number): EnemyTypeKey[] {
        this.world.step(dtSec);
        if (this.pendingSpawns.length === 0) return [];
        const out = this.pendingSpawns;
        this.pendingSpawns = [];
        return out;
    }

    snapshot(): WorldSnapshot {
        return this.world.snapshot();
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
git add games/plane/src/systems/MarbleSpawner.ts
git commit -m "M4e-3 plane MarbleSpawner 接入 marble-sim World 与 Zone"
```

---

## Task 4: MarblePanel 渲染

**Files:**
- Create: `games/plane/src/entities/MarblePanel.ts`

> MarblePanel 是 Phaser 容器：构造时初始化静态背景 + 障碍圆 + Zone 矩形 + 文字标签；`draw(snapshot)` 每帧重画球（用 Phaser Graphics clear + drawCircle）。
>
> **关键设计：** Obstacle/Zone 是静态的，构造时画一次到独立 Graphics 子层（不每帧重画）；球是动态的，每帧 clear+draw。这样性能稳定。

- [ ] **Step 1: 写 `MarblePanel.ts`**

```ts
// games/plane/src/entities/MarblePanel.ts
import Phaser from 'phaser';
import type { WorldSnapshot } from '@cp/marble-sim';
import { MARBLE_PANEL, MARBLE_WORLD, PLANE_THEME } from '../data/theme.js';
import {
    MARBLE_OBSTACLES,
    MARBLE_ZONES,
    MARBLE_LAUNCHER
} from '../data/marbleLayout.js';

/** 把 marble-sim 世界坐标转换为屏幕坐标 */
function worldX(localX: number): number {
    return MARBLE_PANEL.x + MARBLE_WORLD.paddingX + localX;
}
function worldY(localY: number): number {
    return MARBLE_PANEL.y + MARBLE_WORLD.paddingY + localY;
}

export class MarblePanel {
    private dynamic: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene) {
        // 静态层：背景 + 边框 + 障碍 + zone + 文字
        const bg = scene.add.graphics();
        bg.fillStyle(0x0a1422, 1);
        bg.fillRect(MARBLE_PANEL.x, MARBLE_PANEL.y, MARBLE_PANEL.w, MARBLE_PANEL.h);
        bg.lineStyle(2, 0x00ff66, 0.6);
        bg.strokeRect(
            MARBLE_PANEL.x + 1,
            MARBLE_PANEL.y + 1,
            MARBLE_PANEL.w - 2,
            MARBLE_PANEL.h - 2
        );

        // 障碍（深绿圆）
        bg.fillStyle(0x103020, 1);
        bg.lineStyle(1.5, 0x00cc66, 0.8);
        for (const o of MARBLE_OBSTACLES) {
            bg.fillCircle(worldX(o.x), worldY(o.y), o.r);
            bg.strokeCircle(worldX(o.x), worldY(o.y), o.r);
        }

        // Zone（半透明矩形 + 标签）
        for (const z of MARBLE_ZONES) {
            const sx = worldX(z.x);
            const sy = worldY(z.y);
            bg.fillStyle(0x00ff66, 0.12);
            bg.fillRect(sx, sy, z.w, z.h);
            bg.lineStyle(1, 0x00ff66, 0.5);
            bg.strokeRect(sx, sy, z.w, z.h);
            scene.add
                .text(sx + z.w / 2, sy + z.h / 2, z.label, {
                    fontFamily: PLANE_THEME.fontFamily,
                    fontSize: '14px',
                    color: '#00ff66'
                })
                .setOrigin(0.5);
        }

        // Launcher 标记（小三角）
        bg.fillStyle(0x00ff66, 0.8);
        bg.fillTriangle(
            worldX(MARBLE_LAUNCHER.x) - 6,
            worldY(MARBLE_LAUNCHER.y) - 6,
            worldX(MARBLE_LAUNCHER.x) + 6,
            worldY(MARBLE_LAUNCHER.y) - 6,
            worldX(MARBLE_LAUNCHER.x),
            worldY(MARBLE_LAUNCHER.y) + 6
        );

        // 动态层：球
        this.dynamic = scene.add.graphics();
    }

    /** 每帧调用：清空动态层重画球 */
    draw(snap: WorldSnapshot): void {
        this.dynamic.clear();
        this.dynamic.fillStyle(0x7dffaa, 1);
        this.dynamic.lineStyle(1, 0x00ff66, 0.9);
        for (const b of snap.balls) {
            if (!b.alive) continue;
            this.dynamic.fillCircle(worldX(b.pos.x), worldY(b.pos.y), b.r);
            this.dynamic.strokeCircle(worldX(b.pos.x), worldY(b.pos.y), b.r);
        }
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
git add games/plane/src/entities/MarblePanel.ts
git commit -m "M4e-4 plane MarblePanel 用 Phaser Graphics 渲染弹珠世界"
```

---

## Task 5: events.ts 收紧 + WaveDirector 外部叠加 + 单测

**Files:**
- Modify: `games/plane/src/events.ts`
- Modify: `games/plane/src/systems/WaveDirector.ts`
- Modify: `games/plane/tests/wave-director.test.ts`

> 把 events.ts 的 `MarbleSpawn` payload 改为 `{ enemyType: EnemyTypeKey }` 强类型。
>
> WaveDirector 加 `enqueueExternal(typeKey: EnemyTypeKey, x?: number)`：把弹珠产生的 spawn 请求塞到下一轮 tick 返回。这样 PlayScene 不用感知"时间触发"vs"弹珠触发"的区别。

- [ ] **Step 1: 改 `events.ts`**

```ts
// games/plane/src/events.ts
import type { EnemyTypeKey } from './data/enemyTypes.js';

export const E = {
    EnemyKilled: 'enemy-killed',
    PlayerHit: 'player-hit',
    PlayerFire: 'player-fire',
    PowerupTaken: 'powerup-taken',
    WeaponChanged: 'weapon-changed',
    BossEntered: 'boss-entered',
    MarbleSpawn: 'marble-spawn'
} as const;

export type EventName = (typeof E)[keyof typeof E];

export interface EventPayloads {
    [E.EnemyKilled]: { enemyType: string; score: number; x: number; y: number };
    [E.PlayerHit]: { damage: number };
    [E.PlayerFire]: { weaponLevel: number };
    [E.PowerupTaken]: { kind: string };
    [E.WeaponChanged]: { level: number };
    [E.BossEntered]: { type: string };
    [E.MarbleSpawn]: { enemyType: EnemyTypeKey };
}
```

- [ ] **Step 2: 改 `WaveDirector.ts`**

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
    randSource: () => number;
}

export class WaveDirector {
    private elapsedMs = 0;
    private cooldownMs = 0;
    private opts: WaveDirectorOpts;
    private externalQueue: EnemyTypeKey[] = [];

    constructor(opts: WaveDirectorOpts) {
        this.opts = opts;
    }

    /** 外部（如 MarbleSpawner）注入一个 spawn 请求 */
    enqueueExternal(typeKey: EnemyTypeKey): void {
        this.externalQueue.push(typeKey);
    }

    private buildSpawnRequest(typeKey: EnemyTypeKey): SpawnRequest {
        const meta = ENEMY_TYPES[typeKey];
        const x = this.opts.minX + this.opts.randSource() * (this.opts.maxX - this.opts.minX);
        const vy = meta.vyMin + this.opts.randSource() * (meta.vyMax - meta.vyMin);
        return { typeKey, x, vy };
    }

    tick(dtMs: number): SpawnRequest[] {
        const out: SpawnRequest[] = [];
        // 1) 外部注入优先消费
        while (this.externalQueue.length > 0) {
            const typeKey = this.externalQueue.shift()!;
            out.push(this.buildSpawnRequest(typeKey));
        }
        // 2) 时间触发兜底
        this.elapsedMs += dtMs;
        this.cooldownMs -= dtMs;
        if (this.cooldownMs <= 0) {
            const sec = this.elapsedMs / 1000;
            this.cooldownMs = getSpawnIntervalMs(sec);
            const key = pickEnemy(sec, this.opts.randSource());
            out.push(this.buildSpawnRequest(key));
        }
        return out;
    }
}
```

- [ ] **Step 3: 在 `tests/wave-director.test.ts` 追加测试**

在文件末尾追加：

```ts
describe('WaveDirector/enqueueExternal', () => {
    it('外部注入立即返回该类型', () => {
        const d = new WaveDirector({ minX: 100, maxX: 900, randSource: fixedRand });
        d.enqueueExternal('elite');
        const reqs = d.tick(16);
        const typeKeys = reqs.map((r) => r.typeKey);
        expect(typeKeys).toContain('elite');
    });

    it('外部注入与时间触发可同帧并存', () => {
        const d = new WaveDirector({ minX: 100, maxX: 900, randSource: fixedRand });
        // 推到时间触发临界
        d.enqueueExternal('carrier');
        const reqs = d.tick(2000);
        // 至少 2 个：carrier + 时间触发的 scout
        expect(reqs.length).toBeGreaterThanOrEqual(2);
        expect(reqs.some((r) => r.typeKey === 'carrier')).toBe(true);
    });
});
```

- [ ] **Step 4: typecheck + test**

```powershell
pnpm typecheck
pnpm test
# 累计 +2
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/events.ts games/plane/src/systems/WaveDirector.ts games/plane/tests/wave-director.test.ts
git commit -m "M4e-5 plane events 类型收紧 + WaveDirector 外部注入接口"
```

---

## Task 6: PlayScene 装配 MarbleSpawner + 事件桥接

**Files:**
- Modify: `games/plane/src/scenes/PlayScene.ts`

> 装配步骤：
> 1. create 内实例化 `MarbleSpawner` 与 `MarblePanel`
> 2. update 内每帧 `marbleSpawner.tick(dtSec)` → 拿到 typeKey[] 推给 `director.enqueueExternal()` + emit `E.MarbleSpawn`
> 3. update 末尾 `marblePanel.draw(marbleSpawner.snapshot())`

- [ ] **Step 1: 改 `PlayScene.ts`**

import 顶部追加：

```ts
import { MarbleSpawner } from '../systems/MarbleSpawner.js';
import { MarblePanel } from '../entities/MarblePanel.js';
```

加私有字段：

```ts
private marbleSpawner!: MarbleSpawner;
private marblePanel!: MarblePanel;
```

create 内（在 director 之后、HUD 之前）：

```ts
this.marbleSpawner = new MarbleSpawner();
this.marblePanel = new MarblePanel(this);
```

update 内（在 director.tick 之前）：

```ts
const dtSec = delta / 1000;
const marbleSpawns = this.marbleSpawner.tick(dtSec);
for (const tk of marbleSpawns) {
    this.director.enqueueExternal(tk);
    this.events.emit(E.MarbleSpawn, { enemyType: tk });
}
```

> 注意：`dtSec` 在原代码里也算过一次给 EnemyBehavior 用。这里改前置一下，复用即可。把后续 `const dtSec = delta / 1000;` 删掉避免重复声明。

update 末尾（在 fields 清理之后）：

```ts
this.marblePanel.draw(this.marbleSpawner.snapshot());
```

- [ ] **Step 2: typecheck / lint / test / build**

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# 全 0 error
```

- [ ] **Step 3: Commit**

```powershell
git add games/plane/src/scenes/PlayScene.ts
git commit -m "M4e-6 plane PlayScene 装配 MarbleSpawner 与 MarblePanel"
```

---

## Task 7: main.ts 改 M4e + dev 验证

**Files:**
- Modify: `games/plane/src/main.ts`
- Modify: `README.md`

- [ ] **Step 1: 改 `main.ts` subtitle**

```ts
const title = new TitleScene({
    title: '雷霆战机',
    subtitle: 'Phaser 重写版 · M4e',
    theme: PLANE_THEME,
    onStart: () => game.scene.start('play')
});
```

- [ ] **Step 2: typecheck / build**

```powershell
pnpm typecheck
pnpm build
# 全 0 error
```

- [ ] **Step 3: 人工 dev 验证（必须做）**

```powershell
pnpm dev:plane
```

清单：
- Title 显示「Phaser 重写版 · M4e」
- 进 PlayScene 看到右侧 **240×560** 弹珠面板：深绿框 + 6 个绿圆障碍 + 底部 4 个 Lv1-Lv4 区
- 顶部小三角发射器每 1.8s 发射一颗浅绿球，落下时碰障碍反弹
- 球进入底部 Zone 累积积分（积分目前不显示，看敌机生成节奏即可）
- Lv1 区命中 2 次 → 屏幕主区生成 1 架 scout（侦察机）
- Lv2 区命中 4 次 → fighter 或 interceptor 随机
- Lv4 区命中 16 次 → bomber 或 carrier
- 时间触发的兜底敌机仍然在跑（30s 后能看到 fighter/interceptor）
- 主战斗区被压缩到 1040 宽，玩家移动范围也变窄
- console 无 error（SFX warn 仍预期）

按 Ctrl+C 关闭 dev。

- [ ] **Step 4: 更新根 `README.md` 当前进度**

```markdown
- ✅ M4e plane MarbleSpawner 接 marble-sim（M4 阶段完成）
- 🚧 M5 marble 独立游戏
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/main.ts README.md
git commit -m "M4e-7 plane main 改 M4e 标题 + README 进度更新"
```

---

# M4e 验收

跑完 7 个任务确认：

- [ ] `pnpm test` 179 测试全过（M4d 168 + M4e 11）
- [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 全 0 error
- [ ] `pnpm dev:plane` 跑出：左 1040 主战斗区 + 右 240 弹珠面板，弹珠 Zone 命中触发对应 tier 敌机生成
- [ ] 旧 plane/marble 未动
- [ ] 7 个 commit 独立可 revert

---

# M4e 退出 / M4 阶段总结

完成后整个 M4（plane 重写）结束。M4 共 4 段 plan、累计约 35 个 task：

- M4a：场景骨架 + Player + WeaponSystem Lv0（8 任务，66→75 测试）
- M4b：敌机生成 + 碰撞 + 计分（8 任务，75→95 测试）
- M4c：6 级武器 + 5 道具 + 对峙 + Boss + 僚机（11 任务，95→146 测试）
- M4d：陨石 + FX + 敌机弹幕 + SFX 骨架（10 任务，146→168 测试）
- M4e：MarbleSpawner 接 marble-sim（7 任务，168→179 测试）

下一步进 **M5 marble 独立游戏**：把 `@cp/marble-sim` 包成全屏 Phaser 玩法，复用 `@cp/core/ui` 的频率滑块。预计 8-10 任务。

或者跳到 **M6 收尾**：旧 plane/marble 目录移到 legacy/、性能基线对比报告、README 更新「加新游戏」段落。

M6 也可 review 时一并清理 M3 留下的 I6（Store.write 类型脆弱）—— marble 独立游戏需要持久化最高分，正好用上。
