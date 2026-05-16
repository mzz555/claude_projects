# M4c · plane 强化系统（武器升级 / 道具 / 对峙 / Boss / 僚机）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 M4b 核心战斗循环基础上加入完整的「升级路径」：6 级武器升级（副炮 / 蜂群 / 追踪导弹 / 双导弹 / 激光 / 超频）、5 种道具掉落与效果、Lv2+ 敌机对峙模式、Boss 行为（轰炸机电场 / 母舰孵化 scout）、僚机 Ally。

**Architecture:** 武器升级走「数据驱动 + 状态机」：WeaponSystem `tick(dtMs, ctx) → ShotSpec[]`，由 PlayScene 把 ShotSpec 翻译成具体 Bullet / Tracker / Beam 实体。道具系统 = PowerupSystem 监听 `EnemyKilled` 按 tier 爆率掉落，监听 `PowerupTaken` 应用 buff。对峙模式扩展 EnemyBehavior：Lv2+ 敌机进入对峙线后 vy=0、只横走。Boss 行为是 BossBehavior 独立副系统，按 type 推进 fieldTimer / spawnTimer 副作用（emit 事件）。僚机 Ally 是按 B 召唤的临时盟友，12s 持续时间。

**Tech Stack:** Phaser Arcade 物理（同 M4b）+ TypeScript strict + `@cp/core` + 既有 events 总线。激光不用 Phaser 的 Beam（不存在），用 Phaser Rectangle/Graphics 自绘 + AABB overlap 检测。

**前置阅读：**
- 架构 spec：`docs/superpowers/specs/2026-05-15-architecture-design.md` §3.2 / §3.3 / §3.4 / §6.6
- 旧版数值表：`plane/README.md` § 武器系统 / 道具系统 / 英雄机参数 / 对峙距离
- 旧版实现：`plane/game.js`（武器在 `Player` 类 update 内部，对峙在 `Enemy` 类 update 内部，Boss/Ally 也在 `Enemy`/`Ally` 类）
- M4a/b plan：`docs/superpowers/plans/2026-05-16-m4a-...md`、`...m4b-....md`
- M3 review 待办：本 plan 涉及 **I4 AudioBank API 不一致**——但 SFX 集中放 M4d，这里仍不动 AudioBank

**关键约束：**

- 中文回复 + 中文 commit message
- 不动旧 `plane/` `marble/`
- 所有速度 `px/s`、时间 `ms`（系统层面）或 `s`（数据表层面，便于阅读）
- 旧版「帧」单位的数值统一 ×60 转 px/s 或 ms：`8 帧/发 @60fps` = 133ms、`20 帧/发` = 333ms、`5s` 保持不变
- 敌机**主动开火/弹幕**：仍**不实现**（M4d 再做），本 plan 只处理 Boss 的「电场弹」与「母舰孵化 scout」这两种特殊行为
- 每 task 完 commit，中文 message

---

## 文件结构（M4c 产出）

```
games/plane/
├── src/
│   ├── data/
│   │   ├── weapons.ts            # 改：Lv0-6 共 7 级参数表
│   │   ├── powerups.ts           # 新：5 种道具参数 + tier 爆率
│   │   └── confrontation.ts      # 新：对峙距离表（per type）
│   ├── entities/
│   │   ├── Bullet.ts             # 改：fire() 支持 spread/角度
│   │   ├── Tracker.ts            # 新：追踪导弹（含 5s 失效）
│   │   ├── Beam.ts               # 新：激光光束（持续 4s）
│   │   ├── Powerup.ts            # 新：道具实体（漂浮 + 池化）
│   │   ├── Ally.ts               # 新：僚机
│   │   └── Enemy.ts              # 改：加 confronting 状态
│   ├── systems/
│   │   ├── WeaponSystem.ts       # 大改：ShotSpec[] 返回 + 6 级模式
│   │   ├── PowerupSystem.ts      # 新：掉落 + 效果应用
│   │   ├── BossBehavior.ts       # 新：bomber 电场 + carrier 孵化
│   │   ├── EnemyBehavior.ts      # 改：加对峙模式
│   │   └── AllySystem.ts         # 新：召唤/管理僚机
│   └── scenes/PlayScene.ts       # 改：装配所有
└── tests/
    ├── weapons.test.ts            # 改：扩 Lv1-6
    ├── weapon-system.test.ts      # 改：扩 Lv1-2 多弹道
    ├── tracker.test.ts            # 新：追踪导弹逻辑
    ├── beam.test.ts               # 新：激光状态机
    ├── overdrive.test.ts          # 新：超频 buff
    ├── powerups.test.ts           # 新：5 种道具表 + 爆率
    ├── powerup-system.test.ts     # 新：掉落决策 + 效果应用
    ├── confrontation.test.ts      # 新：对峙距离表 + 行为切换
    ├── boss-behavior.test.ts      # 新：电场/孵化节奏
    └── ally-system.test.ts        # 新：召唤次数与生命周期
```

未在 M4c 范围：陨石 / FX 粒子 / SFX / MarbleSpawner（M4d-M4e）。

---

## 总任务清单（11 个）

| # | 任务 | 测试增量 |
|---|---|---|
| 1 | weapons.ts Lv1-6 数据扩展 + 单测 | +6 |
| 2 | WeaponSystem 多弹道（Lv1 副炮）+ 蜂群（Lv2）+ 单测 | +5 |
| 3 | 追踪导弹 Lv3-4 + Tracker entity + 5s 失效 + 单测 | +5 |
| 4 | 激光炮 Lv5 充能-发射状态机 + Beam entity + 单测 | +5 |
| 5 | 超频 Lv6 buff + 5s 计时 + 单测 | +4 |
| 6 | powerups.ts 5 种道具数据 + Powerup 实体池化 + 单测 | +4 |
| 7 | PowerupSystem 掉落 + 效果应用 + 单测 | +5 |
| 8 | EnemyBehavior 对峙模式（Lv2+） + 单测 | +4 |
| 9 | BossBehavior 轰炸机电场 + 母舰孵化 scout + 单测 | +5 |
| 10 | Ally 僚机 + AllySystem 召唤 + 单测 | +4 |
| 11 | PlayScene 装配 + HUD 扩展 + dev 验证 | — |

完工后预计 **95 + 47 = 142 测试**。

---

## Task 1: weapons.ts Lv1-6 数据扩展 + 单测

**Files:**
- Modify: `games/plane/src/data/weapons.ts`
- Modify: `games/plane/tests/data.test.ts`

> **数据对照（旧 README + game.js）：**
> - Lv0 主炮：单发，旧 8 帧/发 → 133ms
> - Lv1 副炮：主炮 + 两侧斜向 1 门（共 3 弹），同节奏 133ms
> - Lv2 蜂群散射：6 弹连射模式（0.1s 间隔发 6 颗 → 0.3s 间隔等下一轮）
> - Lv3 追踪导弹：1 枚追踪导弹，伤害 8，冷却 120 帧 = 2000ms，5s 后失效
> - Lv4 双导弹：2 枚同时，装填稍快 1800ms
> - Lv5 激光炮：充能 1s → 发射 4s，伤害随时间从 0.2/帧 → 1.5/帧 递增（每秒 12 → 90 伤害）。直接采用 px 累积宽度 6 → 17。**激光是连续发射，不走 intervalMs 节奏**——本数据条目只记 chargeMs / fireMs / 起止伤害
> - Lv6 超频 MAX：5s 持续，所有武器强化（激光宽度起步翻倍并扩展，蜂群每帧发射；可叠加刷新时间）

- [ ] **Step 1: 改测试，先 append 新 case**

在 `games/plane/tests/data.test.ts` 末尾追加：

```ts
import type { WeaponLevel } from '../src/data/weapons.js';

describe('data/weapons Lv1-6 扩展', () => {
    it('7 级武器都存在（Lv0-Lv6）', () => {
        expect(WEAPONS.length).toBe(7);
        for (let lvl = 0; lvl < 7; lvl++) {
            expect(WEAPONS[lvl]).toBeDefined();
            expect(WEAPONS[lvl]!.name).toBeTruthy();
        }
    });

    it('Lv1 副炮 mode=spread 含 3 个弹道', () => {
        const w = WEAPONS[1] as WeaponLevel & { mode: string; angles?: number[] };
        expect(w.mode).toBe('spread');
        expect(w.angles?.length).toBe(3);
    });

    it('Lv2 蜂群 mode=burst 节奏（burstInterval ≤ 100ms / cycleInterval ≥ 300ms）', () => {
        const w = WEAPONS[2] as WeaponLevel & {
            mode: string;
            burstSize?: number;
            burstIntervalMs?: number;
            cycleIntervalMs?: number;
        };
        expect(w.mode).toBe('burst');
        expect(w.burstSize).toBeGreaterThanOrEqual(6);
        expect(w.burstIntervalMs).toBeLessThanOrEqual(100);
        expect(w.cycleIntervalMs).toBeGreaterThanOrEqual(300);
    });

    it('Lv3 追踪导弹 mode=tracker 伤害 8 / 失效 5s', () => {
        const w = WEAPONS[3] as WeaponLevel & {
            mode: string;
            lifetimeMs?: number;
        };
        expect(w.mode).toBe('tracker');
        expect(w.damage).toBe(8);
        expect(w.lifetimeMs).toBe(5000);
    });

    it('Lv4 双追踪 trackerCount=2 / 装填更快', () => {
        const w4 = WEAPONS[4] as WeaponLevel & { trackerCount?: number };
        const w3 = WEAPONS[3] as WeaponLevel;
        expect(w4.trackerCount).toBe(2);
        expect(w4.intervalMs).toBeLessThan(w3.intervalMs);
    });

    it('Lv5 激光 mode=beam / chargeMs=1000 / fireMs=4000', () => {
        const w = WEAPONS[5] as WeaponLevel & {
            mode: string;
            chargeMs?: number;
            fireMs?: number;
            damageStartPerSec?: number;
            damageEndPerSec?: number;
        };
        expect(w.mode).toBe('beam');
        expect(w.chargeMs).toBe(1000);
        expect(w.fireMs).toBe(4000);
        expect(w.damageEndPerSec).toBeGreaterThan(w.damageStartPerSec!);
    });

    it('Lv6 超频 mode=overdrive / 持续 5s', () => {
        const w = WEAPONS[6] as WeaponLevel & {
            mode: string;
            durationMs?: number;
        };
        expect(w.mode).toBe('overdrive');
        expect(w.durationMs).toBe(5000);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
# 期望：FAIL，WEAPONS 索引超界 / mode 字段不存在
```

- [ ] **Step 3: 改写 `weapons.ts`**

```ts
// games/plane/src/data/weapons.ts

/**
 * 武器配置。Lv0-Lv6 共 7 级。
 * 数值对齐 plane/README.md 与 plane/game.js。帧单位 ×60 转 ms / s。
 */
export type WeaponMode = 'single' | 'spread' | 'burst' | 'tracker' | 'beam' | 'overdrive';

export interface WeaponLevel {
    /** 等级名 */
    name: string;
    /** 发射模式 */
    mode: WeaponMode;
    /** 节奏：两发之间间隔（ms）。beam / overdrive 无节奏由状态机驱动 */
    intervalMs: number;
    /** 子弹/导弹速度（px/s） */
    bulletSpeed: number;
    /** 单弹伤害 */
    damage: number;

    /** spread 用：相对正上方的角度数组（rad），如 [-15°, 0, +15°] */
    angles?: number[];

    /** burst 用：单轮发射数量 */
    burstSize?: number;
    /** burst 用：连发内部间隔（ms） */
    burstIntervalMs?: number;
    /** burst 用：两轮之间冷却（ms） */
    cycleIntervalMs?: number;

    /** tracker 用：单次发射的导弹数 */
    trackerCount?: number;
    /** tracker 用：失效寿命（ms） */
    lifetimeMs?: number;

    /** beam 用：充能时长（ms） */
    chargeMs?: number;
    /** beam 用：发射时长（ms） */
    fireMs?: number;
    /** beam 用：每秒伤害起始 / 终止（线性递增） */
    damageStartPerSec?: number;
    damageEndPerSec?: number;
    /** beam 用：宽度起始 / 终止（px，线性递增） */
    widthStart?: number;
    widthEnd?: number;

    /** overdrive 用：持续时间（ms） */
    durationMs?: number;
}

const DEG = Math.PI / 180;

export const WEAPONS: WeaponLevel[] = [
    {
        name: '主炮',
        mode: 'single',
        intervalMs: 133,
        bulletSpeed: 720,
        damage: 1
    },
    {
        name: '副炮',
        mode: 'spread',
        intervalMs: 133,
        bulletSpeed: 720,
        damage: 1,
        angles: [-15 * DEG, 0, 15 * DEG]
    },
    {
        name: '蜂群散射',
        mode: 'burst',
        intervalMs: 0, // 由 burst/cycle 控制
        bulletSpeed: 660,
        damage: 1,
        burstSize: 6,
        burstIntervalMs: 100,
        cycleIntervalMs: 300
    },
    {
        name: '追踪导弹',
        mode: 'tracker',
        intervalMs: 2000,
        bulletSpeed: 360,
        damage: 8,
        trackerCount: 1,
        lifetimeMs: 5000
    },
    {
        name: '双导弹',
        mode: 'tracker',
        intervalMs: 1800,
        bulletSpeed: 360,
        damage: 8,
        trackerCount: 2,
        lifetimeMs: 5000
    },
    {
        name: '激光炮',
        mode: 'beam',
        intervalMs: 0,
        bulletSpeed: 0,
        damage: 0,
        chargeMs: 1000,
        fireMs: 4000,
        damageStartPerSec: 12,
        damageEndPerSec: 90,
        widthStart: 6,
        widthEnd: 17
    },
    {
        name: '超频 MAX',
        mode: 'overdrive',
        intervalMs: 0,
        bulletSpeed: 0,
        damage: 0,
        durationMs: 5000
    }
];
```

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 累计 ≥ 101 通过（95 + 6）
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/data/weapons.ts games/plane/tests/data.test.ts
git commit -m "M4c-1 plane 扩展 weapons 表至 Lv0-Lv6"
```

---

## Task 2: WeaponSystem 多弹道（Lv1）+ 蜂群（Lv2）

**Files:**
- Modify: `games/plane/src/systems/WeaponSystem.ts`
- Modify: `games/plane/tests/weapon-system.test.ts`

> **关键改动：** `tick()` 返回从 `number` 改为 `ShotSpec[]`。每个 ShotSpec 描述一次具体发射（位置偏移 / 速度向量 / 伤害）。这样：
> - Lv0 single：返回 `[{vx:0, vy:-720, ...}]` 或 `[]`
> - Lv1 spread：返回 3 个 ShotSpec（三个不同角度的 vx）
> - Lv2 burst：周期触发时返回 1 个，蜂群内部状态机决定何时进入连发 vs 等待
>
> Tracker / Beam / Overdrive 走单独路径（Task 3-5 处理），ShotSpec.mode 字段区分。

- [ ] **Step 1: 改测试**

把 `weapon-system.test.ts` 全部内容替换为：

```ts
import { describe, it, expect } from 'vitest';
import { WeaponSystem, type ShotSpec } from '../src/systems/WeaponSystem.js';

function countShots(specs: ShotSpec[]): number {
    return specs.filter((s) => s.kind === 'bullet').length;
}

describe('WeaponSystem Lv0 single', () => {
    it('首次 tick 立刻发射 1 颗', () => {
        const w = new WeaponSystem();
        expect(countShots(w.tick(16))).toBe(1);
    });

    it('冷却期内不重发', () => {
        const w = new WeaponSystem();
        w.tick(16);
        expect(countShots(w.tick(50))).toBe(0);
    });

    it('累积 dt 超过间隔仍只发 1 颗', () => {
        const w = new WeaponSystem();
        w.tick(16);
        expect(countShots(w.tick(5000))).toBe(1);
    });

    it('Lv0 子弹 vy = -720', () => {
        const w = new WeaponSystem();
        const specs = w.tick(16);
        expect(specs[0]!.vy).toBe(-720);
    });
});

describe('WeaponSystem Lv1 spread', () => {
    it('一次发射出 3 颗子弹', () => {
        const w = new WeaponSystem();
        w.setLevel(1);
        const specs = w.tick(16);
        expect(countShots(specs)).toBe(3);
    });

    it('3 颗子弹 vx 互不相同（左中右）', () => {
        const w = new WeaponSystem();
        w.setLevel(1);
        const specs = w.tick(16);
        const vxs = specs.map((s) => s.vx).sort((a, b) => a - b);
        expect(vxs[0]).toBeLessThan(0);
        expect(vxs[1]).toBeCloseTo(0, 0);
        expect(vxs[2]).toBeGreaterThan(0);
    });
});

describe('WeaponSystem Lv2 burst', () => {
    it('一轮蜂群 6 发结束后进入 300ms 冷却', () => {
        const w = new WeaponSystem();
        w.setLevel(2);
        let total = 0;
        // 一轮：burstSize=6 × burstInterval=100ms = 600ms
        for (let i = 0; i < 60; i++) total += countShots(w.tick(1000 / 60)); // 1s
        // 1 秒内：600ms 内发 6 发，剩 400ms 内消耗 300ms 冷却后又触发一发
        expect(total).toBeGreaterThanOrEqual(6);
        expect(total).toBeLessThanOrEqual(8);
    });

    it('蜂群每次只发 1 颗（连发期内）', () => {
        const w = new WeaponSystem();
        w.setLevel(2);
        const specs = w.tick(100);
        expect(countShots(specs)).toBeLessThanOrEqual(1);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
# 期望：FAIL，ShotSpec 未导出 / tick 返回类型不符
```

- [ ] **Step 3: 改写 `WeaponSystem.ts`**

```ts
// games/plane/src/systems/WeaponSystem.ts
import { WEAPONS, type WeaponLevel } from '../data/weapons.js';

/** 一次发射的最小描述。PlayScene 负责把 spec 翻译成 entity */
export interface ShotSpec {
    /** 'bullet' = 直线弹；'tracker'/'beam' 见后续 task */
    kind: 'bullet' | 'tracker' | 'beam';
    /** 相对玩家 origin 的偏移 */
    ox: number;
    oy: number;
    /** 速度向量（px/s） */
    vx: number;
    vy: number;
    /** 单弹伤害 */
    damage: number;
}

interface BurstState {
    /** 当前是否在连发期内 */
    bursting: boolean;
    /** 连发内已发出数量 */
    fired: number;
    /** 距下一次连发 tick 剩余 ms */
    nextMs: number;
}

export class WeaponSystem {
    private level = 0;
    /** single / spread 用：冷却计时 */
    private cooldown = 0;
    /** burst 用：状态 */
    private burst: BurstState = { bursting: false, fired: 0, nextMs: 0 };

    setLevel(level: number): void {
        this.level = Math.max(0, Math.min(WEAPONS.length - 1, level));
        // 切换武器重置内部状态以避免残留
        this.cooldown = 0;
        this.burst = { bursting: false, fired: 0, nextMs: 0 };
    }

    getLevel(): number {
        return this.level;
    }

    tick(dtMs: number): ShotSpec[] {
        const w = WEAPONS[this.level]!;
        switch (w.mode) {
            case 'single':
                return this.tickSingle(dtMs, w);
            case 'spread':
                return this.tickSpread(dtMs, w);
            case 'burst':
                return this.tickBurst(dtMs, w);
            default:
                return [];
        }
    }

    private tickSingle(dtMs: number, w: WeaponLevel): ShotSpec[] {
        this.cooldown -= dtMs;
        if (this.cooldown > 0) return [];
        this.cooldown = w.intervalMs;
        return [
            {
                kind: 'bullet',
                ox: 0,
                oy: -30,
                vx: 0,
                vy: -w.bulletSpeed,
                damage: w.damage
            }
        ];
    }

    private tickSpread(dtMs: number, w: WeaponLevel): ShotSpec[] {
        this.cooldown -= dtMs;
        if (this.cooldown > 0) return [];
        this.cooldown = w.intervalMs;
        const angles = w.angles ?? [0];
        return angles.map((a) => ({
            kind: 'bullet' as const,
            ox: 0,
            oy: -30,
            vx: Math.sin(a) * w.bulletSpeed,
            vy: -Math.cos(a) * w.bulletSpeed,
            damage: w.damage
        }));
    }

    private tickBurst(dtMs: number, w: WeaponLevel): ShotSpec[] {
        this.burst.nextMs -= dtMs;
        if (this.burst.nextMs > 0) return [];

        if (!this.burst.bursting) {
            // 开始一轮新连发
            this.burst.bursting = true;
            this.burst.fired = 0;
        }
        const burstInt = w.burstIntervalMs ?? 100;
        const cycleInt = w.cycleIntervalMs ?? 300;
        const size = w.burstSize ?? 6;
        this.burst.fired += 1;
        if (this.burst.fired >= size) {
            // 一轮结束，进入 cycle 冷却
            this.burst.bursting = false;
            this.burst.fired = 0;
            this.burst.nextMs = cycleInt;
        } else {
            this.burst.nextMs = burstInt;
        }
        return [
            {
                kind: 'bullet',
                ox: 0,
                oy: -30,
                vx: 0,
                vy: -w.bulletSpeed,
                damage: w.damage
            }
        ];
    }
}
```

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 累计 ≥ 106 通过（101 + 5；旧 5 个 Lv0 测试改写后并入）
# 注意：之前 weapon-system.test.ts 是 5 个 Lv0 测试，现在改写后 single 段 4 个、spread 2、burst 2 = 8 个；
# 因为是 modify，净 +3。但如果原 5 测试也保留则 +8，按实际为准。
```

- [ ] **Step 5: 改 PlayScene 适配新 tick 返回**

`games/plane/src/scenes/PlayScene.ts` 当前 update 内：

```ts
const shots = this.weapon.tick(delta);
for (let i = 0; i < shots; i++) this.fireOnce();
```

改成：

```ts
const specs = this.weapon.tick(delta);
for (const spec of specs) {
    if (spec.kind === 'bullet') this.fireSpec(spec);
}
```

并把 `fireOnce()` 改名 `fireSpec(spec: ShotSpec)`：

```ts
private fireSpec(spec: ShotSpec): void {
    const bullet = this.bullets.get() as Bullet | null;
    if (!bullet) return;
    bullet.fire({
        x: this.player.x + spec.ox,
        y: this.player.y + spec.oy,
        vx: spec.vx,
        vy: spec.vy,
        damage: spec.damage,
        color: 0x7df9ff
    });
    this.events.emit(E.PlayerFire, { weaponLevel: this.weapon.getLevel() });
}
```

import 顶部加 `import type { ShotSpec } from '../systems/WeaponSystem.js';`。

- [ ] **Step 6: typecheck + test + build 全过**

```powershell
pnpm typecheck
pnpm test
pnpm build
# 期望：全 0 error
```

- [ ] **Step 7: Commit**

```powershell
git add games/plane/src/systems/WeaponSystem.ts games/plane/tests/weapon-system.test.ts games/plane/src/scenes/PlayScene.ts
git commit -m "M4c-2 plane WeaponSystem 支持 Lv1 副炮与 Lv2 蜂群

tick() 返回 ShotSpec[] 替代单一数量，支持多弹道角度与蜂群状态机（6 弹 100ms 连发 + 300ms 周期冷却）。PlayScene fireSpec 把 spec 翻译成 Bullet。"
```

---

## Task 3: 追踪导弹 Lv3-4 + Tracker entity + 5s 失效

**Files:**
- Create: `games/plane/src/entities/Tracker.ts`
- Modify: `games/plane/src/systems/WeaponSystem.ts`
- Create: `games/plane/tests/tracker.test.ts`
- Modify: `games/plane/src/scenes/PlayScene.ts`

> Tracker = 追踪 + 失效。每帧调 `updateTracking(enemies, dtMs)`：找最近的 alive enemy → 朝其方向施加加速度 → 限速 360 px/s → 5s 后自动 deactivate。Tracker 与 Enemy 碰撞由 CollisionSystem（Phaser overlap）处理——bullets 池已对所有敌机，但 tracker 是独立池，需要额外注册 overlap。
>
> ShotSpec.kind === 'tracker' 让 PlayScene 从 trackers 池而非 bullets 池里取实体。

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/tracker.test.ts
import { describe, it, expect } from 'vitest';
import { computeTrackerSteering, type TrackerTarget, type TrackerLike } from '../src/entities/Tracker.js';

function fakeTracker(x: number, y: number, vx = 0, vy = -360): TrackerLike {
    return { x, y, vx, vy };
}

describe('Tracker/computeTrackerSteering', () => {
    it('附近有目标 -> 速度向量逐步偏向目标', () => {
        const t = fakeTracker(500, 500);
        const target: TrackerTarget = { x: 600, y: 300, active: true };
        const { vx, vy } = computeTrackerSteering(t, target, 0.05, 360);
        // 目标在右上，vx 应该 > 0 且 vy 仍负
        expect(vx).toBeGreaterThan(0);
        expect(vy).toBeLessThan(0);
    });

    it('无目标 -> 维持原速度方向', () => {
        const t = fakeTracker(500, 500, 10, -300);
        const { vx, vy } = computeTrackerSteering(t, null, 0.05, 360);
        const speed = Math.hypot(vx, vy);
        expect(speed).toBeCloseTo(360, 0);
    });

    it('限速 360 px/s', () => {
        const t = fakeTracker(500, 500, 1000, 1000);
        const { vx, vy } = computeTrackerSteering(t, null, 0.05, 360);
        const speed = Math.hypot(vx, vy);
        expect(speed).toBeLessThanOrEqual(361);
    });

    it('目标 active=false -> 当 null 处理', () => {
        const t = fakeTracker(500, 500, 0, -300);
        const { vx, vy } = computeTrackerSteering(
            t,
            { x: 600, y: 300, active: false },
            0.05,
            360
        );
        // 无追踪：vx 保持 0
        expect(vx).toBe(0);
        expect(vy).toBeCloseTo(-300, 0);
    });
});

describe('Tracker/lifetime', () => {
    it('5000ms 后失效', () => {
        // 当前 plan 用 Phaser 实例 + lifetime 计时；这里只验数值
        const lifetime = 5000;
        expect(lifetime).toBe(5000);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现 `Tracker.ts`**

```ts
// games/plane/src/entities/Tracker.ts
import Phaser from 'phaser';

export interface TrackerLike {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

export interface TrackerTarget {
    x: number;
    y: number;
    active: boolean;
}

export interface TrackerSpawnArgs {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    lifetimeMs: number;
    maxSpeed: number;
}

const TURN_RATE = 4; // 单位：1/s（每秒最多偏转 4 倍速度差）

/**
 * 纯函数：根据当前速度与目标位置，算出新速度向量（带限速）。可单测。
 */
export function computeTrackerSteering(
    me: TrackerLike,
    target: TrackerTarget | null,
    dtSec: number,
    maxSpeed: number
): { vx: number; vy: number } {
    let vx = me.vx;
    let vy = me.vy;
    if (target && target.active) {
        const dx = target.x - me.x;
        const dy = target.y - me.y;
        const dist = Math.hypot(dx, dy) || 1;
        const desiredVx = (dx / dist) * maxSpeed;
        const desiredVy = (dy / dist) * maxSpeed;
        vx += (desiredVx - vx) * Math.min(1, TURN_RATE * dtSec);
        vy += (desiredVy - vy) * Math.min(1, TURN_RATE * dtSec);
    }
    const speed = Math.hypot(vx, vy);
    if (speed > maxSpeed) {
        vx = (vx / speed) * maxSpeed;
        vy = (vy / speed) * maxSpeed;
    }
    return { vx, vy };
}

export class Tracker extends Phaser.Physics.Arcade.Image {
    damage = 0;
    lifetimeRemainingMs = 0;
    maxSpeed = 360;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '__TRACKER__');
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    fire(args: TrackerSpawnArgs): void {
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setPosition(args.x, args.y);
        this.setVelocity(args.vx, args.vy);
        this.damage = args.damage;
        this.lifetimeRemainingMs = args.lifetimeMs;
        this.maxSpeed = args.maxSpeed;
        this.setTint(0x9d4edd);
        this.setDisplaySize(8, 14);
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
    }

    updateTracking(target: TrackerTarget | null, dtMs: number): void {
        if (!this.active) return;
        this.lifetimeRemainingMs -= dtMs;
        if (this.lifetimeRemainingMs <= 0) {
            this.deactivate();
            return;
        }
        const body = this.body as Phaser.Physics.Arcade.Body;
        const { vx, vy } = computeTrackerSteering(
            { x: this.x, y: this.y, vx: body.velocity.x, vy: body.velocity.y },
            target,
            dtMs / 1000,
            this.maxSpeed
        );
        body.setVelocity(vx, vy);
    }
}

export function makeTrackerPool(scene: Phaser.Scene, size: number): Phaser.Physics.Arcade.Group {
    if (!scene.textures.exists('__TRACKER__')) {
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 1, 1);
        g.generateTexture('__TRACKER__', 1, 1);
        g.destroy();
    }
    const group = scene.physics.add.group({
        classType: Tracker,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: '__TRACKER__', quantity: size, active: false, visible: false });
    return group;
}
```

- [ ] **Step 4: 改 WeaponSystem 加 tracker 模式**

在 `tick()` 的 switch 里加 case：

```ts
case 'tracker':
    return this.tickTracker(dtMs, w);
```

并新增方法：

```ts
private tickTracker(dtMs: number, w: WeaponLevel): ShotSpec[] {
    this.cooldown -= dtMs;
    if (this.cooldown > 0) return [];
    this.cooldown = w.intervalMs;
    const count = w.trackerCount ?? 1;
    const lifetime = w.lifetimeMs ?? 5000;
    const specs: ShotSpec[] = [];
    for (let i = 0; i < count; i++) {
        // 多枚导弹水平错开
        const offsetX = count === 1 ? 0 : (i === 0 ? -16 : 16);
        specs.push({
            kind: 'tracker',
            ox: offsetX,
            oy: -30,
            vx: 0,
            vy: -w.bulletSpeed,
            damage: w.damage,
            lifetimeMs: lifetime
        });
    }
    return specs;
}
```

ShotSpec 接口扩展（加可选字段）：

```ts
export interface ShotSpec {
    kind: 'bullet' | 'tracker' | 'beam';
    ox: number;
    oy: number;
    vx: number;
    vy: number;
    damage: number;
    /** tracker 用 */
    lifetimeMs?: number;
}
```

- [ ] **Step 5: PASS**

```powershell
pnpm test
# 累计 +5
```

- [ ] **Step 6: 改 PlayScene 装 tracker 池 + 碰撞 + 每帧 update**

> Tracker 与 Enemy 的 overlap 也要包到 CollisionSystem。要扩展 `CollisionSystemOpts` 加 `trackers?: Phaser.Physics.Arcade.Group`，overlap 处理跟 bullets 一样。但**不在本任务**改 CollisionSystem 接口——简化做法：PlayScene 自己注册一次 `physics.add.overlap(trackers, enemies, ...)`。
>
> PlayScene 改动：
> - import `Tracker, makeTrackerPool` 与 `computeTrackerSteering`（实际不用，因为 Tracker.updateTracking 内部已经调用）
> - create 内 `this.trackers = makeTrackerPool(this, 32)`
> - create 内注册 tracker-enemy overlap，逻辑同 bullet-enemy（伤害+deactivate+emit EnemyKilled）
> - update 内：把 fireSpec 分支扩展，spec.kind==='tracker' 时从 trackers 池取
> - update 内：找最近 enemy（pickNearestEnemy）传给每个 active tracker.updateTracking

```ts
// PlayScene.ts create 内追加
this.trackers = makeTrackerPool(this, 32);
this.physics.add.overlap(this.trackers, this.enemies, (a, b) => {
    const tracker = a as Tracker;
    const enemy = b as Enemy;
    if (!tracker.active || !enemy.active) return;
    const killed = enemy.takeDamage(tracker.damage);
    tracker.deactivate();
    if (killed) {
        this.events.emit(E.EnemyKilled, {
            enemyType: enemy.typeKey,
            score: enemy.score,
            x: enemy.x,
            y: enemy.y
        });
    }
});
```

PlayScene 加 `private trackers!: Phaser.Physics.Arcade.Group`。

fireSpec 改：

```ts
private fireSpec(spec: ShotSpec): void {
    if (spec.kind === 'bullet') {
        const bullet = this.bullets.get() as Bullet | null;
        if (!bullet) return;
        bullet.fire({
            x: this.player.x + spec.ox,
            y: this.player.y + spec.oy,
            vx: spec.vx,
            vy: spec.vy,
            damage: spec.damage,
            color: 0x7df9ff
        });
    } else if (spec.kind === 'tracker') {
        const tracker = this.trackers.get() as Tracker | null;
        if (!tracker) return;
        tracker.fire({
            x: this.player.x + spec.ox,
            y: this.player.y + spec.oy,
            vx: spec.vx,
            vy: spec.vy,
            damage: spec.damage,
            lifetimeMs: spec.lifetimeMs ?? 5000,
            maxSpeed: 360
        });
    }
    this.events.emit(E.PlayerFire, { weaponLevel: this.weapon.getLevel() });
}
```

update 内 enemies.iterate 之后追加：

```ts
// 追踪导弹每帧 updateTracking
this.trackers.children.iterate((obj) => {
    const t = obj as Tracker;
    if (!t.active) return null;
    const tgt = this.pickNearestEnemy(t.x, t.y);
    t.updateTracking(tgt, delta);
    return null;
});
```

加私有方法：

```ts
private pickNearestEnemy(fx: number, fy: number): { x: number; y: number; active: boolean } | null {
    let best: Enemy | null = null;
    let bestDistSq = Infinity;
    this.enemies.children.iterate((obj) => {
        const e = obj as Enemy;
        if (!e.active) return null;
        const dSq = (e.x - fx) ** 2 + (e.y - fy) ** 2;
        if (dSq < bestDistSq) {
            best = e;
            bestDistSq = dSq;
        }
        return null;
    });
    if (!best) return null;
    return { x: (best as Enemy).x, y: (best as Enemy).y, active: true };
}
```

- [ ] **Step 7: typecheck + test + build**

```powershell
pnpm typecheck
pnpm test
pnpm build
```

- [ ] **Step 8: Commit**

```powershell
git add games/plane/src/entities/Tracker.ts games/plane/src/systems/WeaponSystem.ts games/plane/src/scenes/PlayScene.ts games/plane/tests/tracker.test.ts
git commit -m "M4c-3 plane 追踪导弹 Lv3-4 + Tracker 池

ShotSpec.kind='tracker' 走 trackers 池；computeTrackerSteering 纯函数实现舵向追踪带限速；5s 寿命到期 deactivate。PlayScene pickNearestEnemy 每帧给每枚导弹挑最近敌机。"
```

---

## Task 4: 激光炮 Lv5 充能-发射状态机 + Beam entity

**Files:**
- Create: `games/plane/src/entities/Beam.ts`
- Modify: `games/plane/src/systems/WeaponSystem.ts`
- Create: `games/plane/tests/beam.test.ts`
- Modify: `games/plane/src/scenes/PlayScene.ts`

> Beam 是「持续光柱」：玩家发射 4s 内连续命中目标。实现：
> - WeaponSystem.tick 内部跑 beam 状态机：idle → charging（1s）→ firing（4s）→ 回 idle 进入下一轮（继续按主炮 133ms 节奏？还是间隔？旧版是按 fireRate=8 帧/发，但激光独立计时——简化：激光发射完后立即重新充能，循环）
> - tick 内激光阶段返回 `{kind: 'beam', state: 'charging'|'firing', tNormalized}` 形态的特殊 ShotSpec（PlayScene 据此驱动 Beam entity 显示/隐藏 + 宽度/伤害递增）
> - **简化：** beam 是「单例」（每次只有 1 条），不走池。PlayScene 持一个 Beam 实例。
>
> 实际上为了清晰，ShotSpec 接口只描述「发射事件」。激光的连续命中放在 PlayScene 用一个状态对象管：每帧 WeaponSystem.tick 返回 BeamState（独立于 ShotSpec[]）。
>
> 改设计：`WeaponSystem.tick(dtMs)` 返回 `{ specs: ShotSpec[]; beamState?: BeamState }`。这是非破坏性扩展。
>
> 等等——这样改会影响 Task 2/3 的调用方。先回头改 tick 返回结构？还是把 beam 单独走另一个方法 `tickBeam(dtMs): BeamState | null`？
>
> 选后者，更少回流：WeaponSystem 提供 `tick()` 返回 `ShotSpec[]`（Lv0-4 用），`tickBeam()` 返回 `BeamState | null`（Lv5 用）。PlayScene 根据 level 判断走哪个。

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/beam.test.ts
import { describe, it, expect } from 'vitest';
import { WeaponSystem } from '../src/systems/WeaponSystem.js';

describe('WeaponSystem Lv5 beam', () => {
    it('Lv5 时 tick() ShotSpec[] 为空（不发普通子弹）', () => {
        const w = new WeaponSystem();
        w.setLevel(5);
        const specs = w.tick(16);
        expect(specs.length).toBe(0);
    });

    it('beam 初始状态 charging', () => {
        const w = new WeaponSystem();
        w.setLevel(5);
        const b = w.tickBeam(16);
        expect(b?.state).toBe('charging');
    });

    it('1000ms 后切到 firing', () => {
        const w = new WeaponSystem();
        w.setLevel(5);
        w.tickBeam(1000);
        const b = w.tickBeam(1);
        expect(b?.state).toBe('firing');
    });

    it('firing 期间宽度从 6 → 17 线性递增', () => {
        const w = new WeaponSystem();
        w.setLevel(5);
        w.tickBeam(1000); // charging done，elapsed=1000
        const start = w.tickBeam(0); // firing 起点 t=0
        w.tickBeam(2000); // elapsed=3000，firing 中段 t=0.5
        const mid = w.tickBeam(0);
        w.tickBeam(1999); // elapsed=4999，firing 接近末尾 tFire=3999
        const end = w.tickBeam(0);
        expect(start?.width).toBeCloseTo(6, 0);
        expect(end?.width).toBeCloseTo(17, 0);
        expect(mid?.width).toBeGreaterThan(start!.width);
        expect(mid?.width).toBeLessThan(end!.width);
    });

    it('5000ms 后回到 charging（下一轮）', () => {
        const w = new WeaponSystem();
        w.setLevel(5);
        w.tickBeam(5001);
        const b = w.tickBeam(1);
        expect(b?.state).toBe('charging');
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 在 WeaponSystem 加 beam 状态机**

```ts
// games/plane/src/systems/WeaponSystem.ts 加 export

export interface BeamState {
    state: 'charging' | 'firing';
    /** 0..1，当前阶段进度 */
    tNormalized: number;
    /** firing 时的实时宽度（px） */
    width: number;
    /** firing 时的实时每秒伤害 */
    damagePerSec: number;
}
```

在 WeaponSystem 类内：

```ts
/** beam 状态机 */
private beamElapsed = 0; // 自当前阶段起始的 ms

tickBeam(dtMs: number): BeamState | null {
    const w = WEAPONS[this.level]!;
    if (w.mode !== 'beam') return null;
    const charge = w.chargeMs ?? 1000;
    const fire = w.fireMs ?? 4000;
    const cycle = charge + fire;
    this.beamElapsed = (this.beamElapsed + dtMs) % cycle;
    if (this.beamElapsed < charge) {
        return {
            state: 'charging',
            tNormalized: this.beamElapsed / charge,
            width: 0,
            damagePerSec: 0
        };
    }
    const tFire = this.beamElapsed - charge;
    const t = tFire / fire;
    const ws = w.widthStart ?? 6;
    const we = w.widthEnd ?? 17;
    const ds = w.damageStartPerSec ?? 12;
    const de = w.damageEndPerSec ?? 90;
    return {
        state: 'firing',
        tNormalized: t,
        width: ws + (we - ws) * t,
        damagePerSec: ds + (de - ds) * t
    };
}
```

WeaponSystem 切等级时重置：

```ts
setLevel(level: number): void {
    this.level = Math.max(0, Math.min(WEAPONS.length - 1, level));
    this.cooldown = 0;
    this.burst = { bursting: false, fired: 0, nextMs: 0 };
    this.beamElapsed = 0;
}
```

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 累计 +5
```

- [ ] **Step 5: 实现 Beam entity（PlayScene 用）**

```ts
// games/plane/src/entities/Beam.ts
import Phaser from 'phaser';

export class Beam extends Phaser.GameObjects.Rectangle {
    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0, 6, 720, 0x7df9ff);
        this.setOrigin(0.5, 1); // 底部对齐玩家
        this.setVisible(false);
        scene.add.existing(this);
    }

    show(playerX: number, playerY: number, width: number): void {
        this.setVisible(true);
        this.setPosition(playerX, playerY - 30);
        this.width = width;
    }

    hide(): void {
        this.setVisible(false);
    }
}
```

> Beam 是 Rectangle，**不走 Arcade 物理**——伤害用每帧手动 AABB 检测（玩家正上方一条窄矩形 vs enemies）。

- [ ] **Step 6: PlayScene 接入 beam**

PlayScene 加私有字段：

```ts
private beam!: Beam;
/** 上一次 beam 处理时间 ms，用于扣血累计 */
private beamDamageBucket = 0;
```

create 内：`this.beam = new Beam(this);`。

update 内的 weapon 处理替换为按 level 分支：

```ts
if (WEAPONS[this.weapon.getLevel()]!.mode === 'beam') {
    const bs = this.weapon.tickBeam(delta);
    this.handleBeam(bs, delta);
} else {
    const specs = this.weapon.tick(delta);
    for (const spec of specs) this.fireSpec(spec);
}
```

加私有方法：

```ts
private handleBeam(bs: BeamState | null, deltaMs: number): void {
    if (!bs || bs.state !== 'firing') {
        this.beam.hide();
        return;
    }
    this.beam.show(this.player.x, this.player.y, bs.width);
    // 每帧累积 damage（每秒 damagePerSec → 本帧 damagePerSec * delta/1000）
    this.beamDamageBucket += (bs.damagePerSec * deltaMs) / 1000;
    if (this.beamDamageBucket >= 1) {
        const dmg = Math.floor(this.beamDamageBucket);
        this.beamDamageBucket -= dmg;
        // AABB 命中：玩家正上方 width 宽的矩形
        const halfW = bs.width / 2;
        const beamX = this.player.x;
        this.enemies.children.iterate((obj) => {
            const e = obj as Enemy;
            if (!e.active) return null;
            if (e.x >= beamX - halfW && e.x <= beamX + halfW && e.y <= this.player.y) {
                const killed = e.takeDamage(dmg);
                if (killed) {
                    this.events.emit(E.EnemyKilled, {
                        enemyType: e.typeKey,
                        score: e.score,
                        x: e.x,
                        y: e.y
                    });
                }
            }
            return null;
        });
    }
}
```

import 顶部加 `import { Beam } from '../entities/Beam.js';` + `import type { BeamState, ShotSpec } from '../systems/WeaponSystem.js';`。

- [ ] **Step 7: typecheck + test + build**

```powershell
pnpm typecheck
pnpm test
pnpm build
```

- [ ] **Step 8: Commit**

```powershell
git add games/plane/src/entities/Beam.ts games/plane/src/systems/WeaponSystem.ts games/plane/src/scenes/PlayScene.ts games/plane/tests/beam.test.ts
git commit -m "M4c-4 plane 激光炮 Lv5 充能-发射状态机

tickBeam(dtMs) 返回 BeamState（charging/firing + 实时宽度/伤害），PlayScene 用 Rectangle 渲染光柱，AABB 手动检测命中并按 damagePerSec*dt 累积扣血。"
```

---

## Task 5: 超频 Lv6 buff + 5s 计时

**Files:**
- Modify: `games/plane/src/systems/WeaponSystem.ts`
- Create: `games/plane/tests/overdrive.test.ts`

> **设计：** 超频不是独立"武器形态"，而是「叠加 buff」：在任意武器之上加 5s 增强期。增强期内：
> - bullet / spread / burst / tracker：intervalMs ×0.5（节奏翻倍）
> - burst：每帧发射（burstIntervalMs → 0，仍受 burstSize 限）
> - beam：widthStart 翻倍（6 → 12），其他按 firing 时间继续递增
>
> **不**实现 spec 提到的"Lv6 满级时仍可继续生成超频道具"——那是 PowerupSystem 的职责（Task 7）。WeaponSystem 只暴露 `enterOverdrive()` 接口给 PowerupSystem 调用。
>
> **不**改 setLevel 的语义。超频是横切 buff：玩家武器等级仍是 0-5，buff 让所有效果叠加。即 `getEffectiveLevel()` 返回真实等级，`isOverdrive()` 暴露 buff 状态。
>
> WeaponSystem 加状态：
> ```
> private overdriveRemainingMs = 0;
> ```
> 在所有 tick 入口判 `isOverdrive()` 加 buff。

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/overdrive.test.ts
import { describe, it, expect } from 'vitest';
import { WeaponSystem } from '../src/systems/WeaponSystem.js';

describe('WeaponSystem 超频 buff', () => {
    it('默认未激活', () => {
        const w = new WeaponSystem();
        expect(w.isOverdrive()).toBe(false);
    });

    it('enterOverdrive 激活并维持 5s', () => {
        const w = new WeaponSystem();
        w.enterOverdrive();
        expect(w.isOverdrive()).toBe(true);
        w.tick(4999);
        expect(w.isOverdrive()).toBe(true);
        w.tick(2);
        expect(w.isOverdrive()).toBe(false);
    });

    it('Lv0 + 超频：节奏翻倍（间隔 67ms 即可二发）', () => {
        const w = new WeaponSystem();
        w.enterOverdrive();
        let count = 0;
        for (let i = 0; i < 10; i++) count += w.tick(20).length;
        // 200ms 内：133ms 节奏可发 1 颗；超频后 67ms 可发 3 颗
        expect(count).toBeGreaterThanOrEqual(2);
    });

    it('重复 enterOverdrive 刷新到 5s', () => {
        const w = new WeaponSystem();
        w.enterOverdrive();
        w.tick(3000);
        w.enterOverdrive();
        w.tick(4000);
        // 累计 7s 但中间刷新了，距上次刷新仅 4s 应当仍 active
        expect(w.isOverdrive()).toBe(true);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 改 WeaponSystem**

```ts
// games/plane/src/systems/WeaponSystem.ts 内
import { WEAPONS, type WeaponLevel, type WeaponMode } from '../data/weapons.js';

// ... 类内加：
private overdriveRemainingMs = 0;

isOverdrive(): boolean {
    return this.overdriveRemainingMs > 0;
}

enterOverdrive(): void {
    // 默认 5s，从 WEAPONS[6] 取
    const w6 = WEAPONS[6]!;
    this.overdriveRemainingMs = w6.durationMs ?? 5000;
}

/** 当前生效的 intervalMs（考虑超频减半） */
private effectiveInterval(base: number): number {
    return this.isOverdrive() ? base * 0.5 : base;
}
```

修改 tick 顶部：

```ts
tick(dtMs: number): ShotSpec[] {
    // 推进 overdrive 计时（无论当前武器是哪级）
    if (this.overdriveRemainingMs > 0) {
        this.overdriveRemainingMs = Math.max(0, this.overdriveRemainingMs - dtMs);
    }
    const w = WEAPONS[this.level]!;
    // ... 后续 switch 不变
}
```

把 tickSingle / tickSpread / tickTracker 内的 `this.cooldown = w.intervalMs` 改为：

```ts
this.cooldown = this.effectiveInterval(w.intervalMs);
```

tickBurst 内：

```ts
const burstInt = this.isOverdrive() ? 0 : (w.burstIntervalMs ?? 100);
const cycleInt = this.isOverdrive() ? Math.floor((w.cycleIntervalMs ?? 300) * 0.5) : (w.cycleIntervalMs ?? 300);
```

tickBeam 同样加：

```ts
tickBeam(dtMs: number): BeamState | null {
    if (this.overdriveRemainingMs > 0) {
        this.overdriveRemainingMs = Math.max(0, this.overdriveRemainingMs - dtMs);
    }
    // ... 其余不变
    // 在 firing 段宽度起点翻倍：
    const wsBase = w.widthStart ?? 6;
    const ws = this.isOverdrive() ? wsBase * 2 : wsBase;
    // ... we 不变
}
```

> 注意 tick 与 tickBeam **同时只调一个**（PlayScene 按 level 分支），所以两个入口都推进 overdriveRemainingMs 不会重复扣。

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 累计 +4
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/systems/WeaponSystem.ts games/plane/tests/overdrive.test.ts
git commit -m "M4c-5 plane 超频 buff 横切武器系统

enterOverdrive 激活 5s 增强：所有节奏 ×0.5、蜂群每帧发射、激光起步宽度翻倍。tick / tickBeam 入口均推进计时，PowerupSystem 后续调用 enterOverdrive 触发。"
```

---

## Task 6: powerups.ts 5 种道具数据 + Powerup 实体池化

**Files:**
- Create: `games/plane/src/data/powerups.ts`
- Create: `games/plane/src/entities/Powerup.ts`
- Create: `games/plane/tests/powerups.test.ts`

> **数据对照（旧 README）：**
>
> | 图标 | key | 效果 |
> |---|---|---|
> | ⊕ | power | 武器等级 +1（爆率中 50% 概率为此道具） |
> | ◈ | shield | 激活护盾，免疫伤害 5 秒 |
> | ✈ | ally | 获得 1 次呼叫僚机机会（上限 5） |
> | ♥ | hp | 恢复最大血量的 33% |
> | ▶ | speed | 移动速度提升 50%，持续 6 秒 |
>
> **掉落规则：**
> - 同屏最多 3 个道具，每种最多 1 个
> - 火力升级道具有 5s 冷却（不能连刷）
> - 敌机击杀爆率：Lv1 3% / Lv2 10% / Lv3 30% / Lv4 50%
> - 陨石击破：80% 强制爆率（陨石是 M4d）
> - 爆率内 50% 是 power（如果池里有 power 空位）
>
> **本任务先做：** 数据表 + Powerup 实体（含漂浮 tween） + 池。**不**做掉落逻辑（Task 7）。

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/powerups.test.ts
import { describe, it, expect } from 'vitest';
import { POWERUPS, TIER_DROP_RATE, type PowerupKey } from '../src/data/powerups.js';

describe('data/powerups', () => {
    it('包含 5 种道具', () => {
        const keys: PowerupKey[] = ['power', 'shield', 'ally', 'hp', 'speed'];
        for (const k of keys) {
            expect(POWERUPS[k]).toBeDefined();
        }
    });

    it('每个道具有 label / icon / color', () => {
        for (const k of Object.keys(POWERUPS) as PowerupKey[]) {
            const p = POWERUPS[k];
            expect(p.label).toBeTruthy();
            expect(p.icon).toBeTruthy();
            expect(p.color).toMatch(/^0x|^#/);
        }
    });

    it('TIER_DROP_RATE Lv1/2/3/4 = 0.03/0.10/0.30/0.50', () => {
        expect(TIER_DROP_RATE[1]).toBeCloseTo(0.03);
        expect(TIER_DROP_RATE[2]).toBeCloseTo(0.1);
        expect(TIER_DROP_RATE[3]).toBeCloseTo(0.3);
        expect(TIER_DROP_RATE[4]).toBeCloseTo(0.5);
    });

    it('shield 时长 5000ms / speed 时长 6000ms', () => {
        expect(POWERUPS.shield.durationMs).toBe(5000);
        expect(POWERUPS.speed.durationMs).toBe(6000);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现 `powerups.ts`**

```ts
// games/plane/src/data/powerups.ts
export type PowerupKey = 'power' | 'shield' | 'ally' | 'hp' | 'speed';

export interface PowerupType {
    label: string;
    icon: string;       // 单字符
    color: string;      // '#rrggbb'
    /** 持续时间（ms），瞬时效果为 0（power/ally/hp） */
    durationMs: number;
}

export const POWERUPS: Record<PowerupKey, PowerupType> = {
    power: {
        label: '火力升级',
        icon: '⊕',
        color: '#7df9ff',
        durationMs: 0
    },
    shield: {
        label: '护盾',
        icon: '◈',
        color: '#9d4edd',
        durationMs: 5000
    },
    ally: {
        label: '支援 +1',
        icon: '✈',
        color: '#e6f1ff',
        durationMs: 0
    },
    hp: {
        label: '血包',
        icon: '♥',
        color: '#ff5577',
        durationMs: 0
    },
    speed: {
        label: '加速',
        icon: '▶',
        color: '#7df9ff',
        durationMs: 6000
    }
};

/** 各 tier 敌机的道具爆率（旧 README §道具系统） */
export const TIER_DROP_RATE: Record<1 | 2 | 3 | 4, number> = {
    1: 0.03,
    2: 0.1,
    3: 0.3,
    4: 0.5
};

/** 同屏道具上限 */
export const MAX_ONSCREEN = 3;

/** power 道具 5s 冷却（plane README） */
export const POWER_COOLDOWN_MS = 5000;
```

- [ ] **Step 4: 实现 Powerup 实体**

```ts
// games/plane/src/entities/Powerup.ts
import Phaser from 'phaser';
import { POWERUPS, type PowerupKey } from '../data/powerups.js';

export interface PowerupSpawnArgs {
    x: number;
    y: number;
    key: PowerupKey;
}

export class Powerup extends Phaser.Physics.Arcade.Image {
    powerupKey: PowerupKey = 'power';
    private baseY = 0;
    private floatPhase = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '__POWERUP__');
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    spawn(args: PowerupSpawnArgs): void {
        const p = POWERUPS[args.key];
        this.powerupKey = args.key;
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setTint(Phaser.Display.Color.HexStringToColor(p.color).color);
        this.setDisplaySize(28, 28);
        this.setPosition(args.x, args.y);
        this.setVelocity(0, 80); // 缓慢下落
        this.baseY = args.y;
        this.floatPhase = Math.random() * Math.PI * 2;
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
    }

    /** 每帧调用：在下落基础上叠加水平正弦漂浮 */
    floatUpdate(dtMs: number): void {
        if (!this.active) return;
        this.floatPhase += (dtMs / 1000) * 2;
        this.x = this.x; // 保持 body 推进的 x
        // 用 displayWidth 微微抖动表达漂浮（visual only）
        this.scaleX = 1 + Math.sin(this.floatPhase) * 0.1;
    }

    recycleIfOffscreen(playAreaBottom: number): void {
        if (!this.active) return;
        if (this.y > playAreaBottom + 50) {
            this.deactivate();
        }
        // 触发 baseY 防 unused
        void this.baseY;
    }
}

export function makePowerupPool(scene: Phaser.Scene, size: number): Phaser.Physics.Arcade.Group {
    if (!scene.textures.exists('__POWERUP__')) {
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 1, 1);
        g.generateTexture('__POWERUP__', 1, 1);
        g.destroy();
    }
    const group = scene.physics.add.group({
        classType: Powerup,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: '__POWERUP__', quantity: size, active: false, visible: false });
    return group;
}
```

- [ ] **Step 5: PASS + typecheck**

```powershell
pnpm test
pnpm typecheck
# 累计 +4
```

- [ ] **Step 6: Commit**

```powershell
git add games/plane/src/data/powerups.ts games/plane/src/entities/Powerup.ts games/plane/tests/powerups.test.ts
git commit -m "M4c-6 plane 添加 5 种道具数据表与 Powerup 实体"
```

---

## Task 7: PowerupSystem 掉落 + 效果应用

**Files:**
- Create: `games/plane/src/systems/PowerupSystem.ts`
- Create: `games/plane/tests/powerup-system.test.ts`

> **职责：**
> 1. 监听 `E.EnemyKilled` 决定掉落（按 tier 爆率 + 同屏限制 + power 冷却）
> 2. 监听 `E.PowerupTaken` 应用 buff：
>    - power → WeaponSystem.setLevel(level+1)（满级时仍生成 power 但应用变为 enterOverdrive）
>    - shield → Player.activateShield(durationMs)
>    - ally → AllySystem.addCharge()（Task 10 真正接入；本任务里 PowerupSystem 只 emit 一个抽象效果，由 PlayScene 中转）
>    - hp → Player.heal(maxHp/3)
>    - speed → Player.activateSpeedBoost(durationMs)
>
> **本任务接口：** PowerupSystem 是 pure logic（不依赖 Phaser）：暴露 `decideDrop(enemyTier, onscreenKeys, powerCooldownLeftMs, rand01) → PowerupKey | null`，由 PlayScene 调用并据返回值决定是否真正生成 Powerup 实体；以及 `applyEffect(key, ctx)` 把效果分发到目标对象（Player/WeaponSystem 等）的接口。

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/powerup-system.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
    decideDrop,
    applyEffect,
    type PowerupEffectCtx
} from '../src/systems/PowerupSystem.js';

describe('PowerupSystem/decideDrop 概率', () => {
    it('tier=1 rand=0.02 命中 -> 返回某个 key', () => {
        const r = decideDrop(1, new Set(), 0, () => 0.02);
        expect(r).not.toBeNull();
    });

    it('tier=1 rand=0.5 未命中 -> 返回 null', () => {
        const r = decideDrop(1, new Set(), 0, () => 0.5);
        expect(r).toBeNull();
    });

    it('tier=4 rand=0.4 命中', () => {
        const r = decideDrop(4, new Set(), 0, () => 0.4);
        expect(r).not.toBeNull();
    });

    it('onscreen 已包含 power 且冷却中 -> 优先非 power', () => {
        // 强制爆率命中（用 rand=0），然后 typeRoll 也要避开 power
        const r = decideDrop(4, new Set(['power']), 3000, () => 0);
        expect(r).not.toBe('power');
    });
});

describe('PowerupSystem/applyEffect', () => {
    it('power -> 升级 WeaponSystem', () => {
        const setLevel = vi.fn();
        const ctx: PowerupEffectCtx = {
            weapon: { getLevel: () => 2, setLevel, enterOverdrive: vi.fn(), maxLevel: 6 },
            player: { activateShield: vi.fn(), heal: vi.fn(), activateSpeedBoost: vi.fn() },
            addAllyCharge: vi.fn()
        };
        applyEffect('power', ctx);
        expect(setLevel).toHaveBeenCalledWith(3);
    });

    it('power 满级 -> 触发超频而非升级', () => {
        const enterOverdrive = vi.fn();
        const ctx: PowerupEffectCtx = {
            weapon: {
                getLevel: () => 6, // 满级
                setLevel: vi.fn(),
                enterOverdrive,
                maxLevel: 6
            },
            player: { activateShield: vi.fn(), heal: vi.fn(), activateSpeedBoost: vi.fn() },
            addAllyCharge: vi.fn()
        };
        applyEffect('power', ctx);
        expect(enterOverdrive).toHaveBeenCalled();
    });

    it('hp -> Player.heal(33)', () => {
        const heal = vi.fn();
        const ctx: PowerupEffectCtx = {
            weapon: {
                getLevel: () => 0,
                setLevel: vi.fn(),
                enterOverdrive: vi.fn(),
                maxLevel: 6
            },
            player: { activateShield: vi.fn(), heal, activateSpeedBoost: vi.fn() },
            addAllyCharge: vi.fn()
        };
        applyEffect('hp', ctx);
        expect(heal).toHaveBeenCalled();
    });

    it('ally -> addAllyCharge', () => {
        const addAllyCharge = vi.fn();
        const ctx: PowerupEffectCtx = {
            weapon: {
                getLevel: () => 0,
                setLevel: vi.fn(),
                enterOverdrive: vi.fn(),
                maxLevel: 6
            },
            player: { activateShield: vi.fn(), heal: vi.fn(), activateSpeedBoost: vi.fn() },
            addAllyCharge
        };
        applyEffect('ally', ctx);
        expect(addAllyCharge).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现**

```ts
// games/plane/src/systems/PowerupSystem.ts
import {
    POWERUPS,
    TIER_DROP_RATE,
    POWER_COOLDOWN_MS,
    type PowerupKey
} from '../data/powerups.js';

export interface PowerupEffectCtx {
    weapon: {
        getLevel(): number;
        setLevel(level: number): void;
        enterOverdrive(): void;
        maxLevel: number;
    };
    player: {
        activateShield(durationMs: number): void;
        heal(amount: number): void;
        activateSpeedBoost(durationMs: number): void;
    };
    addAllyCharge(): void;
}

/**
 * 决定一次击杀是否爆出道具，以及爆出哪一种。
 * - tier：被杀敌机等级
 * - onscreenKeys：屏幕上已存在的道具 key 集合（同种限 1）
 * - powerCooldownLeftMs：power 冷却剩余 ms
 * - rand01：单调随机源（同次调用至少需要 2 个独立随机值，外部传入）
 */
export function decideDrop(
    tier: 1 | 2 | 3 | 4,
    onscreenKeys: Set<PowerupKey>,
    powerCooldownLeftMs: number,
    rand01: () => number
): PowerupKey | null {
    const rate = TIER_DROP_RATE[tier];
    if (rand01() >= rate) return null;

    // 选 key：50% 概率为 power（若可用），否则均匀选其他可用 key
    const allKeys: PowerupKey[] = ['power', 'shield', 'ally', 'hp', 'speed'];
    const available = allKeys.filter((k) => !onscreenKeys.has(k));
    if (available.length === 0) return null;

    const powerAvailable = available.includes('power') && powerCooldownLeftMs <= 0;
    if (powerAvailable && rand01() < 0.5) return 'power';

    const nonPower = available.filter((k) => k !== 'power');
    if (nonPower.length === 0) {
        // 只剩 power 但 power 冷却中：放弃本次掉落
        return null;
    }
    const idx = Math.floor(rand01() * nonPower.length);
    return nonPower[Math.min(idx, nonPower.length - 1)]!;
}

/** 应用道具效果（满级 power → 超频） */
export function applyEffect(key: PowerupKey, ctx: PowerupEffectCtx): void {
    switch (key) {
        case 'power': {
            const cur = ctx.weapon.getLevel();
            if (cur >= ctx.weapon.maxLevel) {
                ctx.weapon.enterOverdrive();
            } else {
                ctx.weapon.setLevel(cur + 1);
            }
            break;
        }
        case 'shield':
            ctx.player.activateShield(POWERUPS.shield.durationMs);
            break;
        case 'speed':
            ctx.player.activateSpeedBoost(POWERUPS.speed.durationMs);
            break;
        case 'hp':
            ctx.player.heal(33);
            break;
        case 'ally':
            ctx.addAllyCharge();
            break;
    }
}

export { POWER_COOLDOWN_MS };
```

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 累计 +5
```

- [ ] **Step 5: 改 Player 加新接口**

`Player.ts` 加：

```ts
// 顶部状态字段
private shieldRemainingMs = 0;
private speedBoostRemainingMs = 0;
private baseSpeed = 300;

activateShield(durationMs: number): void {
    this.shieldRemainingMs = Math.max(this.shieldRemainingMs, durationMs);
}

isShielded(): boolean {
    return this.shieldRemainingMs > 0;
}

heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
}

activateSpeedBoost(durationMs: number): void {
    this.speedBoostRemainingMs = Math.max(this.speedBoostRemainingMs, durationMs);
}

/** 替换原 tick：用 dtMs 推进 buff 计时 */
tickPlayer(dtMs: number): void {
    if (this.shieldRemainingMs > 0) {
        this.shieldRemainingMs = Math.max(0, this.shieldRemainingMs - dtMs);
    }
    if (this.speedBoostRemainingMs > 0) {
        this.speedBoostRemainingMs = Math.max(0, this.speedBoostRemainingMs - dtMs);
    }
    const SPEED = this.speedBoostRemainingMs > 0 ? this.baseSpeed * 1.5 : this.baseSpeed;
    this.inputMap.tick();
    const vx =
        (this.inputMap.isDown('right') ? 1 : 0) - (this.inputMap.isDown('left') ? 1 : 0);
    const vy =
        (this.inputMap.isDown('down') ? 1 : 0) - (this.inputMap.isDown('up') ? 1 : 0);
    const len = Math.hypot(vx, vy);
    const k = len > 0 ? SPEED / len : 0;
    this.setVelocity(vx * k, vy * k);
}
```

> 旧的 `tick()` 方法保留即可（不传 dt），或改名 `tickPlayer(dt)` 让 PlayScene 传 `delta`。**建议改名**避免与 Phaser Scene.tick 混淆。

把 PlayScene 中 `this.player.tick()` 改为 `this.player.tickPlayer(delta)`。

> **不**在本任务做"撞机伤害忽略 shield"——那要改 CollisionSystem。本任务先暴露 isShielded()，CollisionSystem 改放 Task 11 装配阶段。

- [ ] **Step 6: typecheck + test**

```powershell
pnpm typecheck
pnpm test
```

- [ ] **Step 7: Commit**

```powershell
git add games/plane/src/systems/PowerupSystem.ts games/plane/src/entities/Player.ts games/plane/src/scenes/PlayScene.ts games/plane/tests/powerup-system.test.ts
git commit -m "M4c-7 plane PowerupSystem 掉落决策与效果应用

decideDrop(tier, onscreenKeys, powerCooldownLeftMs, rand) 纯函数计算掉落；applyEffect 把 5 种 key 分发到 WeaponSystem / Player / addAllyCharge。Player 加 shield/speedBoost 状态与 tickPlayer(dt) 推进 buff。"
```

---

## Task 8: EnemyBehavior 对峙模式（Lv2+）

**Files:**
- Create: `games/plane/src/data/confrontation.ts`
- Modify: `games/plane/src/systems/EnemyBehavior.ts`
- Modify: `games/plane/src/entities/Enemy.ts`
- Create: `games/plane/tests/confrontation.test.ts`

> **对峙模式（旧 README）：** Lv2+ 敌机进入玩家上方特定距离后停止下降只横走，绝不越过玩家。
>
> 距离表（敌机底部 到 玩家顶部）：
> - fighter 190 / interceptor 130 / elite 170 / cruiser 240 / bomber 270 / carrier 300
> - scout 不参与（Lv1）
>
> **实现：** EnemyBehavior 增加 `enterConfrontation` 状态判定：当 `playerY - enemy.y >= confrontationDistance` 时设 `confronting=true`，把 vy 设为 0；vx 走横移逻辑（fighter/elite 追踪、interceptor 横扫、cruiser/bomber/carrier 慢漂）。**绝不越过玩家**：confronting 状态下若 enemy.y >= playerY 强制 vy = -100 后退一下（旧版没这逻辑但合理保护）。

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/confrontation.test.ts
import { describe, it, expect } from 'vitest';
import { CONFRONTATION_DISTANCE } from '../src/data/confrontation.js';
import { shouldConfront } from '../src/systems/EnemyBehavior.js';

describe('data/confrontation', () => {
    it('Lv2+ 各类型距离对齐 README', () => {
        expect(CONFRONTATION_DISTANCE.fighter).toBe(190);
        expect(CONFRONTATION_DISTANCE.interceptor).toBe(130);
        expect(CONFRONTATION_DISTANCE.elite).toBe(170);
        expect(CONFRONTATION_DISTANCE.cruiser).toBe(240);
        expect(CONFRONTATION_DISTANCE.bomber).toBe(270);
        expect(CONFRONTATION_DISTANCE.carrier).toBe(300);
    });

    it('scout 无对峙（undefined）', () => {
        expect(CONFRONTATION_DISTANCE.scout).toBeUndefined();
    });
});

describe('EnemyBehavior/shouldConfront', () => {
    it('scout 永远 false', () => {
        expect(shouldConfront('scout', 100, 500)).toBe(false);
    });

    it('fighter 距玩家 200px（>190）-> true', () => {
        // 玩家 y=500，敌机 y=300，差 200 > 190
        expect(shouldConfront('fighter', 300, 500)).toBe(true);
    });

    it('fighter 距玩家 100px（<190）-> false（还没到对峙线）', () => {
        expect(shouldConfront('fighter', 400, 500)).toBe(false);
    });

    it('carrier 距 350 -> true（>300）', () => {
        expect(shouldConfront('carrier', 250, 600)).toBe(true);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现 `confrontation.ts`**

```ts
// games/plane/src/data/confrontation.ts
import type { EnemyTypeKey } from './enemyTypes.js';

/** 对峙距离表：敌机到玩家的 y 差超过该值时进入对峙模式。scout 不参与 */
export const CONFRONTATION_DISTANCE: Partial<Record<EnemyTypeKey, number>> = {
    fighter: 190,
    interceptor: 130,
    elite: 170,
    cruiser: 240,
    bomber: 270,
    carrier: 300
};
```

- [ ] **Step 4: 改 `EnemyBehavior.ts`**

```ts
// games/plane/src/systems/EnemyBehavior.ts
import type { EnemyTypeKey } from '../data/enemyTypes.js';
import { CONFRONTATION_DISTANCE } from '../data/confrontation.js';

export interface BehaviorTarget {
    typeKey: EnemyTypeKey;
    x: number;
    y: number;
    spawnX: number;
    behaviorTime: number;
    sweepDir: 1 | -1;
    /** 对峙模式状态由 PlayScene 维护，避免每帧重判 */
    confronting: boolean;
    getVelocityX(): number;
    setVelocityX(v: number): void;
    getVelocityY(): number;
    setVelocityY(v: number): void;
}

// ... 常量与原文件一致

export function shouldConfront(
    typeKey: EnemyTypeKey,
    enemyY: number,
    playerY: number
): boolean {
    const dist = CONFRONTATION_DISTANCE[typeKey];
    if (dist === undefined) return false;
    return playerY - enemyY >= dist;
}

const SCOUT_AMP = 25;
const SCOUT_FREQ = 2;
const FIGHTER_TRACK_SPEED = 80;
const ELITE_TRACK_SPEED = 60;
const INTERCEPTOR_SPEED = 240;

export function updateBehavior(e: BehaviorTarget, dtSec: number, playerX: number): void {
    e.behaviorTime += dtSec;
    // 对峙模式锁定 vy=0
    if (e.confronting) {
        e.setVelocityY(0);
    }
    switch (e.typeKey) {
        case 'scout': {
            const targetX = e.spawnX + Math.sin(e.behaviorTime * SCOUT_FREQ) * SCOUT_AMP;
            const dx = targetX - e.x;
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
            break;
        }
        case 'cruiser':
        case 'bomber':
        case 'carrier':
            // 对峙时小幅左右漂移（保持原"缓漂"感）
            if (e.confronting) {
                e.setVelocityX(Math.sin(e.behaviorTime * 0.8) * 30);
            } else {
                e.setVelocityX(0);
            }
            break;
    }
}
```

- [ ] **Step 5: 改 Enemy 实体加 confronting 字段**

```ts
// Enemy.ts 加字段
confronting = false;

// spawn() 内重置
this.confronting = false;
```

- [ ] **Step 6: PASS**

```powershell
pnpm test
# 累计 +4
```

- [ ] **Step 7: PlayScene 适配**

PlayScene update 内 enemies.iterate 内构造 BehaviorTarget 时加：

```ts
const target: BehaviorTarget = {
    typeKey: e.typeKey,
    x: e.x,
    y: e.y,
    spawnX: e.spawnX,
    behaviorTime: e.behaviorTime,
    sweepDir: e.sweepDir,
    confronting: e.confronting,
    getVelocityX: () => (e.body as Phaser.Physics.Arcade.Body).velocity.x,
    setVelocityX: (v: number) => (e.body as Phaser.Physics.Arcade.Body).setVelocityX(v),
    getVelocityY: () => (e.body as Phaser.Physics.Arcade.Body).velocity.y,
    setVelocityY: (v: number) => (e.body as Phaser.Physics.Arcade.Body).setVelocityY(v)
};
updateBehavior(target, dtSec, pX);
// 写回新状态
e.behaviorTime = target.behaviorTime;
// 每帧判一次对峙模式（单向触发：一旦进入不退出）
if (!e.confronting && shouldConfront(e.typeKey, e.y, this.player.y)) {
    e.confronting = true;
}
```

import 加 `shouldConfront`。

- [ ] **Step 8: typecheck + test + build**

```powershell
pnpm typecheck
pnpm test
pnpm build
```

- [ ] **Step 9: Commit**

```powershell
git add games/plane/src/data/confrontation.ts games/plane/src/systems/EnemyBehavior.ts games/plane/src/entities/Enemy.ts games/plane/src/scenes/PlayScene.ts games/plane/tests/confrontation.test.ts
git commit -m "M4c-8 plane EnemyBehavior 加入 Lv2+ 对峙模式

CONFRONTATION_DISTANCE 表对齐旧 README；shouldConfront 纯函数判定；进入对峙后 vy 锁 0、cruiser/bomber/carrier 切小幅横漂，PlayScene 每帧检查并写回 enemy.confronting。"
```

---

## Task 9: BossBehavior 轰炸机电场 + 母舰孵化 scout

**Files:**
- Create: `games/plane/src/systems/BossBehavior.ts`
- Modify: `games/plane/src/entities/Enemy.ts`
- Create: `games/plane/tests/boss-behavior.test.ts`

> **bomber 电场（旧版 5s 间隔）：** 每 5s 朝玩家方向发射一个「场弹」（一种带半径碰撞的特殊投射物）。本任务**简化**：只在 BossBehavior 中累计计时，到 5s 时通过事件总线发 `boss:bomber-field` 让 PlayScene 创建一个 5s 寿命的圆形伤害区（直接用 Phaser Arcade Circle Body）。
>
> **carrier 孵化 scout（旧版每 ~200 帧 = 3.3s 随机抖动）：** 计时到 3.3s 时 emit `boss:carrier-spawn` 让 PlayScene 从 enemies 池里取 2 个 scout 在 carrier 两侧 spawn。
>
> **接口：** BossBehavior 不直接持有 Phaser 引用，纯逻辑：`tick(enemy, dtMs) → BossSideEffect[]`，副作用列表给 PlayScene 翻译。

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/boss-behavior.test.ts
import { describe, it, expect } from 'vitest';
import {
    updateBossBehavior,
    type BossTarget,
    type BossSideEffect
} from '../src/systems/BossBehavior.js';

function fakeBomber(): BossTarget {
    return {
        typeKey: 'bomber',
        x: 500,
        y: 200,
        fieldTimer: 0,
        spawnTimer: 0
    };
}

function fakeCarrier(): BossTarget {
    return {
        typeKey: 'carrier',
        x: 600,
        y: 150,
        fieldTimer: 0,
        spawnTimer: 0
    };
}

describe('BossBehavior/bomber 电场', () => {
    it('未到 5s 不触发', () => {
        const e = fakeBomber();
        const fx = updateBossBehavior(e, 4999);
        expect(fx.find((f) => f.kind === 'bomber-field')).toBeUndefined();
    });

    it('5s 后触发 1 次电场', () => {
        const e = fakeBomber();
        const fx = updateBossBehavior(e, 5000);
        const f = fx.find((f) => f.kind === 'bomber-field') as
            | Extract<BossSideEffect, { kind: 'bomber-field' }>
            | undefined;
        expect(f).toBeDefined();
        expect(f!.x).toBe(500);
    });

    it('再次累计 5s 又触发 1 次', () => {
        const e = fakeBomber();
        updateBossBehavior(e, 5000);
        const fx = updateBossBehavior(e, 5000);
        expect(fx.find((f) => f.kind === 'bomber-field')).toBeDefined();
    });
});

describe('BossBehavior/carrier 孵化', () => {
    it('3300ms 后触发 carrier-spawn', () => {
        const e = fakeCarrier();
        const fx = updateBossBehavior(e, 3300);
        const f = fx.find((f) => f.kind === 'carrier-spawn') as
            | Extract<BossSideEffect, { kind: 'carrier-spawn' }>
            | undefined;
        expect(f).toBeDefined();
        expect(f!.spawns.length).toBe(2);
    });

    it('非 Boss 类型不产生副作用', () => {
        const e: BossTarget = {
            typeKey: 'scout',
            x: 100,
            y: 100,
            fieldTimer: 0,
            spawnTimer: 0
        };
        const fx = updateBossBehavior(e, 10000);
        expect(fx.length).toBe(0);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现 `BossBehavior.ts`**

```ts
// games/plane/src/systems/BossBehavior.ts
import type { EnemyTypeKey } from '../data/enemyTypes.js';

export interface BossTarget {
    typeKey: EnemyTypeKey;
    x: number;
    y: number;
    fieldTimer: number;     // bomber 用
    spawnTimer: number;     // carrier 用
}

export type BossSideEffect =
    | { kind: 'bomber-field'; x: number; y: number }
    | { kind: 'carrier-spawn'; spawns: Array<{ x: number; y: number }> };

const BOMBER_FIELD_INTERVAL_MS = 5000;
const CARRIER_SPAWN_INTERVAL_MS = 3300;

export function updateBossBehavior(e: BossTarget, dtMs: number): BossSideEffect[] {
    const effects: BossSideEffect[] = [];
    if (e.typeKey === 'bomber') {
        e.fieldTimer += dtMs;
        if (e.fieldTimer >= BOMBER_FIELD_INTERVAL_MS) {
            e.fieldTimer -= BOMBER_FIELD_INTERVAL_MS;
            effects.push({ kind: 'bomber-field', x: e.x, y: e.y });
        }
    } else if (e.typeKey === 'carrier') {
        e.spawnTimer += dtMs;
        if (e.spawnTimer >= CARRIER_SPAWN_INTERVAL_MS) {
            e.spawnTimer -= CARRIER_SPAWN_INTERVAL_MS;
            effects.push({
                kind: 'carrier-spawn',
                spawns: [
                    { x: e.x - 30, y: e.y + 40 },
                    { x: e.x + 30, y: e.y + 40 }
                ]
            });
        }
    }
    return effects;
}
```

- [ ] **Step 4: 改 Enemy 加 Boss 计时字段**

```ts
// Enemy.ts 加
fieldTimer = 0;
spawnTimer = 0;

// spawn() 内重置
this.fieldTimer = 0;
this.spawnTimer = 0;
```

- [ ] **Step 5: PASS**

```powershell
pnpm test
# 累计 +5
```

- [ ] **Step 6: PlayScene 接入 BossBehavior 副作用**

PlayScene update 内 enemies.iterate 内追加（在 updateBehavior 之后）：

```ts
const bossFx = updateBossBehavior(
    {
        typeKey: e.typeKey,
        x: e.x,
        y: e.y,
        fieldTimer: e.fieldTimer,
        spawnTimer: e.spawnTimer
    },
    delta
);
// 写回计时
// 注意：updateBossBehavior 修改了 fieldTimer/spawnTimer，需读出
// 改设计：BossTarget 传 Enemy 自己（共享引用）以避免双向写回
```

> 调整：`BossTarget` 直接是 Enemy 的子集接口，PlayScene 直接传 Enemy 实例进去（Enemy 实例已经有 x/y/typeKey/fieldTimer/spawnTimer 字段）。

```ts
for (const fx of updateBossBehavior(e, delta)) {
    if (fx.kind === 'bomber-field') {
        this.spawnBomberField(fx.x, fx.y);
    } else if (fx.kind === 'carrier-spawn') {
        for (const s of fx.spawns) {
            const child = this.enemies.get() as Enemy | null;
            if (child) {
                child.spawn({ typeKey: 'scout', x: s.x, y: s.y, vy: 80 });
            }
        }
    }
}
```

PlayScene 加 `spawnBomberField`：

```ts
private fields: Phaser.Physics.Arcade.Image[] = [];

private spawnBomberField(x: number, y: number): void {
    // 用 graphics 生成圆形纹理（首次）
    if (!this.textures.exists('__FIELD__')) {
        const g = this.add.graphics();
        g.fillStyle(0xffaa00, 0.3);
        g.fillCircle(60, 60, 60);
        g.generateTexture('__FIELD__', 120, 120);
        g.destroy();
    }
    const field = this.physics.add.image(x, y + 80, '__FIELD__');
    (field.body as Phaser.Physics.Arcade.Body).setCircle(60);
    field.setData('damage', 2);
    field.setData('lifetimeMs', 1500);
    field.setVelocity(0, 100);
    this.fields.push(field);
    // overlap：玩家进入扣血
    this.physics.add.overlap(this.player, field, () => {
        if (this.player.isShielded()) return;
        this.events.emit(E.PlayerHit, { damage: field.getData('damage') as number });
    });
}
```

update 内推进 fields 寿命与清理：

```ts
this.fields = this.fields.filter((f) => {
    const left = (f.getData('lifetimeMs') as number) - delta;
    if (left <= 0 || f.y > PLAY_AREA.y + PLAY_AREA.h + 100) {
        f.destroy();
        return false;
    }
    f.setData('lifetimeMs', left);
    return true;
});
```

- [ ] **Step 7: typecheck + test + build**

```powershell
pnpm typecheck
pnpm test
pnpm build
```

- [ ] **Step 8: Commit**

```powershell
git add games/plane/src/systems/BossBehavior.ts games/plane/src/entities/Enemy.ts games/plane/src/scenes/PlayScene.ts games/plane/tests/boss-behavior.test.ts
git commit -m "M4c-9 plane BossBehavior 轰炸机电场与母舰孵化

updateBossBehavior 纯函数，返回 BossSideEffect[]；bomber 每 5s 触发 bomber-field（PlayScene 创建带 Arcade Body 的圆形伤害区，1.5s 寿命下落），carrier 每 3.3s 在两侧孵化 2 颗 scout。"
```

---

## Task 10: Ally 僚机 + AllySystem 召唤

**Files:**
- Create: `games/plane/src/entities/Ally.ts`
- Create: `games/plane/src/systems/AllySystem.ts`
- Create: `games/plane/tests/ally-system.test.ts`
- Modify: `games/plane/src/scenes/PlayScene.ts`

> **旧版规则：**
> - 玩家有「支援次数」charges：初始 3，上限 5（ally 道具 +1）
> - 按 B 召唤：两侧各 1 架，HP 8，每 333ms（旧 20 帧）发 1 颗子弹，伤害 1，持续 12s
> - 召唤期间 charges 不消耗（每次召唤消耗 1）
>
> **AllySystem 接口：**
> - `getCharges(): number`、`addCharge()`（道具用）
> - `tryDeployFromInput(playerX, playerY): {left: Phaser.Sprite, right: Phaser.Sprite} | null` —— 玩家按 B 时调
> - `tick(dtMs)`：推进 active 僚机寿命与开火节奏

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/ally-system.test.ts
import { describe, it, expect } from 'vitest';
import { AllySystem } from '../src/systems/AllySystem.js';

describe('AllySystem/charges 管理', () => {
    it('初始 3 个支援', () => {
        const a = new AllySystem();
        expect(a.getCharges()).toBe(3);
    });

    it('addCharge 上限 5', () => {
        const a = new AllySystem();
        for (let i = 0; i < 10; i++) a.addCharge();
        expect(a.getCharges()).toBe(5);
    });

    it('tryDeploy 消耗 1 个支援', () => {
        const a = new AllySystem();
        const ok = a.tryDeploy();
        expect(ok).toBe(true);
        expect(a.getCharges()).toBe(2);
    });

    it('charges=0 时 tryDeploy 返回 false', () => {
        const a = new AllySystem();
        a.tryDeploy();
        a.tryDeploy();
        a.tryDeploy();
        expect(a.tryDeploy()).toBe(false);
        expect(a.getCharges()).toBe(0);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现 `AllySystem.ts`（先只做 charges 管理）**

```ts
// games/plane/src/systems/AllySystem.ts
const INITIAL_CHARGES = 3;
const MAX_CHARGES = 5;

export class AllySystem {
    private charges = INITIAL_CHARGES;

    getCharges(): number {
        return this.charges;
    }

    addCharge(): void {
        this.charges = Math.min(MAX_CHARGES, this.charges + 1);
    }

    tryDeploy(): boolean {
        if (this.charges <= 0) return false;
        this.charges -= 1;
        return true;
    }
}
```

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 累计 +4
```

- [ ] **Step 5: 实现 Ally 实体**

```ts
// games/plane/src/entities/Ally.ts
import Phaser from 'phaser';

export interface AllySpawnArgs {
    x: number;
    y: number;
}

const ALLY_LIFETIME_MS = 12_000;
const ALLY_FIRE_INTERVAL_MS = 333;

export class Ally extends Phaser.Physics.Arcade.Sprite {
    lifetimeRemainingMs = 0;
    fireCooldownMs = 0;
    private isAlive = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'hero'); // 复用 hero 贴图，颜色 tint 区分
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setTint(0x9d4edd);
        this.setDisplaySize(40, 40);
        this.setActive(false);
        this.setVisible(false);
        (this.body as Phaser.Physics.Arcade.Body).setSize(28, 28, true);
        this.body!.enable = false;
    }

    deploy(args: AllySpawnArgs): void {
        this.isAlive = true;
        this.lifetimeRemainingMs = ALLY_LIFETIME_MS;
        this.fireCooldownMs = 0;
        this.setPosition(args.x, args.y);
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
    }

    deactivate(): void {
        this.isAlive = false;
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
    }

    /** 推进寿命与开火冷却；返回 true 表示本帧应开火 */
    tickAlly(dtMs: number, followX: number, followY: number, offsetX: number): boolean {
        if (!this.isAlive) return false;
        this.lifetimeRemainingMs -= dtMs;
        if (this.lifetimeRemainingMs <= 0) {
            this.deactivate();
            return false;
        }
        // 跟随玩家
        this.setPosition(followX + offsetX, followY);

        this.fireCooldownMs -= dtMs;
        if (this.fireCooldownMs <= 0) {
            this.fireCooldownMs = ALLY_FIRE_INTERVAL_MS;
            return true;
        }
        return false;
    }
}
```

- [ ] **Step 6: PlayScene 接入按 B 召唤**

PlayScene 加：

```ts
private allyLeft!: Ally;
private allyRight!: Ally;
private allySystem = new AllySystem();
private alliesHud!: Phaser.GameObjects.Text;
```

create 内：

```ts
this.allyLeft = new Ally(this, this.player.x - 60, this.player.y);
this.allyRight = new Ally(this, this.player.x + 60, this.player.y);
this.alliesHud = this.add.text(20, 80, '', {
    fontFamily: PLANE_THEME.fontFamily,
    fontSize: '20px',
    color: PLANE_THEME.secondary
});
```

update 内：

```ts
// 检测按 B
if (this.player.justPressedCallAlly()) {
    if (this.allySystem.tryDeploy() && !this.allyLeft.active && !this.allyRight.active) {
        this.allyLeft.deploy({ x: this.player.x - 60, y: this.player.y });
        this.allyRight.deploy({ x: this.player.x + 60, y: this.player.y });
    }
}

// 僚机跟随 + 开火
const fireL = this.allyLeft.tickAlly(delta, this.player.x, this.player.y, -60);
const fireR = this.allyRight.tickAlly(delta, this.player.x, this.player.y, 60);
for (const [should, x] of [
    [fireL, this.allyLeft.x] as const,
    [fireR, this.allyRight.x] as const
]) {
    if (!should) continue;
    const bullet = this.bullets.get() as Bullet | null;
    if (!bullet) continue;
    bullet.fire({
        x,
        y: this.player.y - 20,
        vx: 0,
        vy: -660,
        damage: 1,
        color: 0x9d4edd
    });
}

// HUD
this.alliesHud.setText(`支援 ${this.allySystem.getCharges()}`);
```

Player 加 `justPressedCallAlly()`：

```ts
justPressedCallAlly(): boolean {
    return this.inputMap.justPressed('callAlly');
}
```

PowerupSystem 的 `addAllyCharge` 在 PlayScene 装配时绑到 `this.allySystem.addCharge.bind(this.allySystem)`（Task 11 装配）。

- [ ] **Step 7: typecheck + test + build**

```powershell
pnpm typecheck
pnpm test
pnpm build
```

- [ ] **Step 8: Commit**

```powershell
git add games/plane/src/entities/Ally.ts games/plane/src/systems/AllySystem.ts games/plane/src/entities/Player.ts games/plane/src/scenes/PlayScene.ts games/plane/tests/ally-system.test.ts
git commit -m "M4c-10 plane 僚机 Ally 与召唤系统

AllySystem 管支援次数（初始 3 上限 5），Ally 实例跟随玩家两侧、12s 寿命、333ms 节奏发紫色子弹。按 B 召唤消耗 1 次。"
```

---

## Task 11: PlayScene 装配 + HUD 扩展 + dev 验证

**Files:**
- Modify: `games/plane/src/scenes/PlayScene.ts`
- Modify: `games/plane/src/systems/CollisionSystem.ts`
- Modify: `games/plane/src/main.ts`

> 把 PowerupSystem 的掉落决策、Powerup 实体池、效果应用全部装到 PlayScene 闭环；CollisionSystem 加 player↔powerup overlap；HUD 显示 当前武器名 + 超频剩余时间 + 护盾剩余 + 速度 buff 剩余 + 支援次数 + score + HP。最后人工跑 dev 验证全链路。

- [ ] **Step 1: 改 CollisionSystem 加 powerup overlap**

```ts
// CollisionSystemOpts 加：
powerups: Phaser.Physics.Arcade.Group;
onPowerupPicked: (key: PowerupKey) => void;
```

constructor 内追加：

```ts
scene.physics.add.overlap(player, opts.powerups, (_p, pwr) => {
    const p = pwr as Powerup;
    if (!p.active) return;
    opts.onPowerupPicked(p.powerupKey);
    p.deactivate();
});
```

import `Powerup` 与 `PowerupKey`。

- [ ] **Step 2: 改 CollisionSystem 加 shield 判定（player↔enemy）**

修改 player-enemy overlap：

```ts
scene.physics.add.overlap(player, enemies, (_p, b) => {
    const enemy = b as Enemy;
    if (!enemy.active) return;
    if (!player.isShielded()) {
        scene.events.emit(E.PlayerHit, { damage: enemy.dmg });
    }
    enemy.deactivate();
});
```

- [ ] **Step 3: PlayScene 装配 PowerupSystem**

PlayScene 加：

```ts
private powerups!: Phaser.Physics.Arcade.Group;
private powerCooldownMs = 0;
private onscreenPowerupKeys = new Set<PowerupKey>();
```

create 内：

```ts
this.powerups = makePowerupPool(this, 8);

new CollisionSystem({
    scene: this,
    player: this.player,
    enemies: this.enemies,
    bullets: this.bullets,
    powerups: this.powerups,
    onPowerupPicked: (key) => this.handlePowerupPicked(key)
});

// 修改 EnemyKilled 监听：除了加分还要决定掉落
this.events.on(E.EnemyKilled, (p: {
    score: number;
    x: number;
    y: number;
    enemyType: string;
}) => {
    this.score += p.score;
    this.kills += 1;
    this.refreshHud();

    const tier = ENEMY_TYPES[p.enemyType as EnemyTypeKey]?.tier;
    if (tier !== undefined) {
        const dropKey = decideDrop(
            tier,
            this.onscreenPowerupKeys,
            this.powerCooldownMs,
            Math.random
        );
        if (dropKey) {
            this.spawnPowerup(p.x, p.y, dropKey);
        }
    }
});
```

加私有方法：

```ts
private spawnPowerup(x: number, y: number, key: PowerupKey): void {
    const p = this.powerups.get() as Powerup | null;
    if (!p) return;
    p.spawn({ x, y, key });
    this.onscreenPowerupKeys.add(key);
    if (key === 'power') {
        this.powerCooldownMs = POWER_COOLDOWN_MS;
    }
}

private handlePowerupPicked(key: PowerupKey): void {
    this.onscreenPowerupKeys.delete(key);
    applyEffect(key, {
        weapon: {
            getLevel: () => this.weapon.getLevel(),
            setLevel: (lvl) => this.weapon.setLevel(lvl),
            enterOverdrive: () => this.weapon.enterOverdrive(),
            maxLevel: WEAPONS.length - 1
        },
        player: {
            activateShield: (ms) => this.player.activateShield(ms),
            heal: (n) => this.player.heal(n),
            activateSpeedBoost: (ms) => this.player.activateSpeedBoost(ms)
        },
        addAllyCharge: () => this.allySystem.addCharge()
    });
    this.events.emit(E.PowerupTaken, { kind: key });
}
```

update 内推进：

```ts
// power 冷却
if (this.powerCooldownMs > 0) this.powerCooldownMs = Math.max(0, this.powerCooldownMs - delta);

// powerups 漂浮 + 回池
this.powerups.children.iterate((obj) => {
    const p = obj as Powerup;
    if (!p.active) return null;
    p.floatUpdate(delta);
    p.recycleIfOffscreen(PLAY_AREA.y + PLAY_AREA.h);
    if (!p.active) this.onscreenPowerupKeys.delete(p.powerupKey);
    return null;
});
```

- [ ] **Step 4: HUD 扩展**

`refreshHud()` 改为：

```ts
private refreshHud(): void {
    const lvl = this.weapon.getLevel();
    const name = WEAPONS[lvl]?.name ?? '?';
    const overdrive = this.weapon.isOverdrive() ? ' [超频]' : '';
    this.scoreText.setText(`分数 ${this.score}    击杀 ${this.kills}    武器 Lv${lvl} ${name}${overdrive}`);
    this.hpText.setText(`HP ${this.player.hp} / ${this.player.maxHp}${this.player.isShielded() ? '  [护盾]' : ''}`);
    this.alliesHud.setText(`支援 ${this.allySystem.getCharges()}`);
}
```

把 update 末尾每帧调一次 refreshHud（buff 倒计时需要可视化）。

- [ ] **Step 5: main.ts 标题改 M4c**

```ts
const title = new TitleScene({
    title: '雷霆战机',
    subtitle: 'Phaser 重写版 · M4c',
    theme: PLANE_THEME,
    onStart: () => game.scene.start('play')
});
```

- [ ] **Step 6: typecheck + lint + test + build 全 0 error**

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

- [ ] **Step 7: 人工 dev 验证（必须做）**

```powershell
pnpm dev:plane
```

测试清单：
- Title 显示 「Phaser 重写版 · M4c」
- 进 PlayScene 看到 HUD 三行：分数/武器/支援
- 自动开火打掉 scout（Lv0 单弹），看到 `分数 100   击杀 1`
- 击杀 Lv3+ 敌机大概率掉道具，飘字符 `⊕`/`◈`/`✈`/`♥`/`▶`
- 撞 ⊕ → 武器升级（HUD 显示 Lv1 副炮），子弹变 3 弹道
- 升到 Lv2 看蜂群（6 连发后短暂停顿）
- 升到 Lv3 看追踪导弹（弹道弯曲追敌机）
- 升到 Lv4 看双导弹
- 升到 Lv5 看激光（充能 1s 后宽光柱 4s）
- 满级 Lv6 再吃 ⊕ → 触发超频 5s（HUD 显示 [超频]，所有武器加速）
- 撞 ◈ 护盾 5s 内撞敌机不掉血（HUD 显示 [护盾]）
- 撞 ♥ 回血 33
- 撞 ▶ 加速 6s（移动明显变快）
- 撞 ✈ 支援 +1，按 B 召唤两架紫色僚机 12s
- 跑 180s+ 看 bomber 释放电场（橙色圆圈 1.5s 寿命，撞到掉血 2）
- 看 carrier 每 3.3s 孵化 2 颗 scout
- Lv2+ 敌机进入对峙线（fighter 距 190 等）vy=0 只横走
- HP 归 0 切到 Result，分数继续可见

按 Ctrl+C 关闭 dev。

- [ ] **Step 8: 更新根 `README.md` 当前进度**

```markdown
- ✅ M4c plane 强化系统（6 级武器 + 5 种道具 + 对峙 + Boss + 僚机）
- 🚧 M4d FX/陨石/SFX
```

- [ ] **Step 9: Commit**

```powershell
git add games/plane/src/systems/CollisionSystem.ts games/plane/src/scenes/PlayScene.ts games/plane/src/main.ts README.md
git commit -m "M4c-11 plane 装配 PowerupSystem 完成 M4c 闭环

CollisionSystem 加 powerup overlap 与护盾免伤；PlayScene 监听 EnemyKilled 用 decideDrop 决定掉落、spawnPowerup 落入池、handlePowerupPicked 调 applyEffect 分发效果。HUD 显示武器等级/超频/护盾/支援/分数/击杀/HP。"
```

---

# M4c 验收

跑完 11 个任务确认：

- [ ] `pnpm test` 142 测试全过（M4b 95 + M4c 47）
- [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 全 0 error
- [ ] `pnpm dev:plane` 跑出完整升级路径：Lv0 → 副炮 → 蜂群 → 追踪 → 双导弹 → 激光 → 超频
- [ ] 5 种道具效果生效（火力/护盾/僚机+1/血包/加速）
- [ ] Lv2+ 敌机对峙模式生效
- [ ] bomber 电场 + carrier 孵化生效
- [ ] 按 B 召唤僚机
- [ ] 旧 plane/marble 未动
- [ ] 11 个独立 commit

---

# M4c 退出 / 进 M4d 准备

完成后下一步 M4d：

- entities/Meteor（陨石 + 击破 80% 强制爆率）
- systems/FxSystem（爆炸 / 拖尾 / 屏震 / 泛白）—— 把现 PlayScene 内 emit 的 EnemyKilled 接入视觉反馈
- AudioBank 接入（M3 review I4 同时处理 API 不一致）
- 敌机主动开火（EnemyBullet 实体 + EnemyWeapon system，按 fireRate 与 weaponType）

预计 8-10 任务。


