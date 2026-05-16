# M4d · plane 陨石 / 视觉特效 / 敌机弹幕实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 M4c 升级闭环之上补齐战斗反馈：陨石系统（带 HP 可被击破）、FxSystem（爆炸粒子 + 屏震 + 击中泛白）、敌机主动开火（5 类武器：single/double/rapid/fan/barrage）、SFX 音效骨架。

**Architecture:** 数据驱动 + 系统协调，沿用 M4b/c 模式。陨石与敌机子弹各开一个对象池；FxSystem 用 Phaser ParticleEmitter（爆炸）+ camera.shake（屏震）+ tween（命中泛白），通过事件总线消费 EnemyKilled/PlayerHit；EnemyWeapon 是纯逻辑系统（dt 累计 + cooldown），返回 `EnemyShotSpec[]`，PlayScene 翻译为 EnemyBullet 实体；AudioBank 集中加载 SFX 由 events.ts 事件绑定（解决 M3 review I4 的 API 不一致：本 plan 统一 `play(key)` 为 fire-and-forget 语义）。

**Tech Stack:** Phaser ParticleEmitter / Camera.shake / Tween / Sound + TypeScript strict + `@cp/core` + 既有 events 总线。

**前置阅读：**
- 架构 spec：`docs/superpowers/specs/2026-05-15-architecture-design.md` §3.2/§3.3/§6.6
- 旧版陨石规则：`plane/README.md § 陨石系统`
- 旧版敌机武器：`plane/game.js:1363-1430`（5 类弹幕实现）
- M3 review 留下的 I4 AudioBank 行为不一致：本 plan 处理（统一 fire-and-forget）

**关键约束：**

- 中文回复 + 中文 commit message
- 不动旧 `plane/` `marble/`
- 数值对齐旧版：陨石间隔 600-1200 帧 → 10-20s；爆率 80%；伤害 3；敌机子弹速度 6 px/帧 → 360 px/s
- 同屏敌机子弹上限：旧版 80（spec §6.6）。本 plan 用对象池 maxSize=128 容错
- SFX 文件本 plan 不引入真音频文件（避免增大 repo），AudioBank 注册占位 sound key，dev 时 `play()` 走 Phaser sound.add 但不触发实际播放（key 不存在静默失败）
- 每 task 完 commit 中文 message

---

## 文件结构（M4d 产出）

```
games/plane/
├── src/
│   ├── data/
│   │   ├── enemyWeapons.ts        # 新：5 类敌机武器参数表
│   │   └── sfxKeys.ts             # 新：SFX key 常量（占位）
│   ├── entities/
│   │   ├── Meteor.ts              # 新：陨石实体 + 池化
│   │   ├── EnemyBullet.ts         # 新：敌机子弹 + 池化
│   │   └── Enemy.ts               # 改：加 fireCooldownMs / burstState
│   ├── systems/
│   │   ├── EnemyWeapon.ts         # 新：5 类武器 tick 纯逻辑
│   │   ├── FxSystem.ts            # 新：爆炸/屏震/命中泛白
│   │   └── CollisionSystem.ts     # 改：加 bullet↔meteor、enemyBullet↔player、meteor↔player
│   ├── scenes/PlayScene.ts        # 改：装配陨石/敌机子弹/FX/SFX
│   └── audio/sfxBank.ts           # 新：薄壳，包 @cp/core AudioBank + key 默认注册
└── tests/
    ├── enemy-weapons.test.ts      # 新：5 类武器数据 + 节奏
    ├── enemy-weapon-system.test.ts # 新：tick 状态机
    ├── meteor.test.ts             # 新：陨石生成节奏 + 掉落
    └── fx-system.test.ts          # 新：FxSystem 事件订阅冒烟
```

未在 M4d 范围：MarbleSpawner（M4e）。

---

## 总任务清单（10 个）

| # | 任务 | 测试增量 |
|---|---|---|
| 1 | enemyWeapons 5 类参数表 + 单测 | +5 |
| 2 | EnemyBullet 实体 + 池化 | — |
| 3 | EnemyWeapon 系统（5 模式 tick）+ 单测 | +6 |
| 4 | Meteor 实体 + MeteorDirector + 单测 | +5 |
| 5 | FxSystem 爆炸 + 屏震 + 单测 | +4 |
| 6 | sfxKeys + sfxBank 薄壳 | — |
| 7 | CollisionSystem 扩展（meteor + enemyBullet） | — |
| 8 | PlayScene 装配 EnemyWeapon | — |
| 9 | PlayScene 装配 Meteor + FxSystem + sfxBank | — |
| 10 | dev 验证 + README 进度更新 | — |

完工后预计 **146 + 20 = 166 测试**。

---

## Task 1: enemyWeapons 5 类参数表 + 单测

**Files:**
- Create: `games/plane/src/data/enemyWeapons.ts`
- Create: `games/plane/tests/enemy-weapons.test.ts`

> **5 类武器对照（旧 game.js:1363-1430，6 px/帧 → 360 px/s）：**
>
> - `single`（scout）：单发瞄准玩家，速度 360 px/s，fireRate 200 帧 ≈ 3333ms
> - `double`（fighter）：3 弹扇形（中央瞄 + 左右 ±0.28rad），fireRate 110 帧 ≈ 1833ms
> - `rapid`（interceptor）：5 弹连发，burst 内 8 帧/发 ≈ 133ms，整体 fireRate 65 帧 ≈ 1083ms
> - `fan`（elite）：7 弹扇形，伤害 ×2，fireRate 75 帧 ≈ 1250ms
> - `barrage`（cruiser）：5 弹宽扇形 + 加伤，fireRate 85 帧 ≈ 1417ms
>
> bomber 用 `field`、carrier 用 `cycle` 旧 game.js 都在特殊行为里——M4d 让它们沿用 `double` 弹幕，电场/孵化已在 M4c BossBehavior 实现。

- [ ] **Step 1: 写失败测试**

```ts
// games/plane/tests/enemy-weapons.test.ts
import { describe, it, expect } from 'vitest';
import { ENEMY_WEAPONS, type EnemyWeaponKey } from '../src/data/enemyWeapons.js';

describe('data/enemyWeapons', () => {
    it('5 类武器都存在', () => {
        const keys: EnemyWeaponKey[] = ['single', 'double', 'rapid', 'fan', 'barrage'];
        for (const k of keys) {
            expect(ENEMY_WEAPONS[k]).toBeDefined();
        }
    });

    it('single 单发，pellet=1', () => {
        expect(ENEMY_WEAPONS.single.pelletsPerShot).toBe(1);
    });

    it('double 3 弹扇形', () => {
        expect(ENEMY_WEAPONS.double.pelletsPerShot).toBe(3);
    });

    it('rapid burst 5 发，内部 ~133ms', () => {
        expect(ENEMY_WEAPONS.rapid.burstSize).toBe(5);
        expect(ENEMY_WEAPONS.rapid.burstIntervalMs).toBeLessThanOrEqual(150);
    });

    it('fan 7 弹扇形 + 伤害加成 ≥2', () => {
        expect(ENEMY_WEAPONS.fan.pelletsPerShot).toBe(7);
        expect(ENEMY_WEAPONS.fan.damageMultiplier).toBeGreaterThanOrEqual(2);
    });

    it('所有 bulletSpeed > 0 且 ≤ 500（px/s）', () => {
        const keys: EnemyWeaponKey[] = ['single', 'double', 'rapid', 'fan', 'barrage'];
        for (const k of keys) {
            const w = ENEMY_WEAPONS[k];
            expect(w.bulletSpeed).toBeGreaterThan(0);
            expect(w.bulletSpeed).toBeLessThanOrEqual(500);
        }
    });
});
```

- [ ] **Step 2: 跑测试看 FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现 `enemyWeapons.ts`**

```ts
// games/plane/src/data/enemyWeapons.ts
export type EnemyWeaponKey = 'single' | 'double' | 'rapid' | 'fan' | 'barrage';

export interface EnemyWeapon {
    /** 主节奏：两次开火之间间隔（ms） */
    intervalMs: number;
    /** 每次发射的子弹数 */
    pelletsPerShot: number;
    /** 扇形半角（rad），0 表示直线 */
    spreadRad: number;
    /** burst 用：连发总数；非 burst 武器为 1 */
    burstSize: number;
    /** burst 用：连发内部间隔（ms） */
    burstIntervalMs: number;
    /** 子弹速度（px/s） */
    bulletSpeed: number;
    /** 伤害倍数（基础 1，fan/barrage 加成） */
    damageMultiplier: number;
    /** 子弹颜色（视觉） */
    color: number;
}

export const ENEMY_WEAPONS: Record<EnemyWeaponKey, EnemyWeapon> = {
    single: {
        intervalMs: 3333,
        pelletsPerShot: 1,
        spreadRad: 0,
        burstSize: 1,
        burstIntervalMs: 0,
        bulletSpeed: 360,
        damageMultiplier: 1,
        color: 0xff4444
    },
    double: {
        intervalMs: 1833,
        pelletsPerShot: 3,
        spreadRad: 0.28,
        burstSize: 1,
        burstIntervalMs: 0,
        bulletSpeed: 390,
        damageMultiplier: 1,
        color: 0xff8800
    },
    rapid: {
        intervalMs: 1083,
        pelletsPerShot: 1,
        spreadRad: 0,
        burstSize: 5,
        burstIntervalMs: 133,
        bulletSpeed: 420,
        damageMultiplier: 1,
        color: 0xffcc00
    },
    fan: {
        intervalMs: 1250,
        pelletsPerShot: 7,
        spreadRad: 0.5,
        burstSize: 1,
        burstIntervalMs: 0,
        bulletSpeed: 360,
        damageMultiplier: 2,
        color: 0xff44aa
    },
    barrage: {
        intervalMs: 1417,
        pelletsPerShot: 5,
        spreadRad: 0.6,
        burstSize: 1,
        burstIntervalMs: 0,
        bulletSpeed: 360,
        damageMultiplier: 1.5,
        color: 0xcc44ff
    }
};

/** EnemyTypeKey → EnemyWeaponKey 映射（M4d 简化版） */
export const ENEMY_WEAPON_MAP: Record<string, EnemyWeaponKey> = {
    scout: 'single',
    fighter: 'double',
    interceptor: 'rapid',
    elite: 'fan',
    cruiser: 'barrage',
    bomber: 'double', // 电场/孵化在 M4c BossBehavior，普通弹用 double
    carrier: 'double'
};
```

- [ ] **Step 4: 跑测试看 PASS**

```powershell
pnpm test
# 累计 ≥ 151 通过（146 + 5）
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/data/enemyWeapons.ts games/plane/tests/enemy-weapons.test.ts
git commit -m "M4d-1 plane 添加 5 类敌机武器参数表"
```

---

## Task 2: EnemyBullet 实体 + 池化

**Files:**
- Create: `games/plane/src/entities/EnemyBullet.ts`

> 仿 `Bullet.ts` 模式，但分组独立避免和玩家子弹混。`fire(spawnArgs)` 重置位置/速度/颜色。出屏回池。

- [ ] **Step 1: 写 `EnemyBullet.ts`**

```ts
// games/plane/src/entities/EnemyBullet.ts
import Phaser from 'phaser';

export interface EnemyBulletSpawnArgs {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    color: number;
}

export class EnemyBullet extends Phaser.Physics.Arcade.Image {
    damage = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '__BULLET__');
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    fire(args: EnemyBulletSpawnArgs): void {
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setPosition(args.x, args.y);
        this.setVelocity(args.vx, args.vy);
        this.damage = args.damage;
        this.setTint(args.color);
        this.setDisplaySize(8, 8);
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
    }

    recycleIfOffscreen(playAreaTop: number, playAreaBottom: number): void {
        if (!this.active) return;
        if (this.y < playAreaTop - 50 || this.y > playAreaBottom + 50 || this.x < -50 || this.x > 1280 + 50) {
            this.deactivate();
        }
    }
}

export function makeEnemyBulletPool(
    scene: Phaser.Scene,
    size: number
): Phaser.Physics.Arcade.Group {
    if (!scene.textures.exists('__BULLET__')) {
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 1, 1);
        g.generateTexture('__BULLET__', 1, 1);
        g.destroy();
    }
    const group = scene.physics.add.group({
        classType: EnemyBullet,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: '__BULLET__', quantity: size, active: false, visible: false });
    return group;
}
```

- [ ] **Step 2: typecheck**

```powershell
pnpm --filter @cp/game-plane typecheck
# 期望：0 error
```

- [ ] **Step 3: Commit**

```powershell
git add games/plane/src/entities/EnemyBullet.ts
git commit -m "M4d-2 plane 添加 EnemyBullet 实体与池化"
```

---

## Task 3: EnemyWeapon 系统 + 单测

**Files:**
- Create: `games/plane/src/systems/EnemyWeapon.ts`
- Create: `games/plane/tests/enemy-weapon-system.test.ts`

> **职责：** 纯逻辑，吃 dt + 敌机当前状态（cooldownMs / burstRemaining / burstNextMs）+ 玩家位置 → 返回 `EnemyShotSpec[]`。状态字段挂在 Enemy 实例上（task 8 修改 Enemy）。
>
> 模式区分：
> - non-burst（single/double/fan/barrage）：cooldown 到 0 一次发 N 弹（按 spread 均匀分布角度）
> - burst（rapid）：cooldown 到 0 进入连发态，burstRemaining=burstSize，每帧推进 burstNextMs；连发结束后回到 cooldown=intervalMs
>
> 接口：`updateEnemyWeapon(state, dtMs, targetPos, weaponKey) → EnemyShotSpec[]`，pure。

- [ ] **Step 1: 写失败测试**

```ts
// games/plane/tests/enemy-weapon-system.test.ts
import { describe, it, expect } from 'vitest';
import {
    updateEnemyWeapon,
    type EnemyWeaponState
} from '../src/systems/EnemyWeapon.js';

function newState(): EnemyWeaponState {
    return { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };
}

describe('EnemyWeapon/single', () => {
    it('首次 tick 立刻发 1 弹瞄准玩家', () => {
        const s = newState();
        const shots = updateEnemyWeapon(
            s,
            { ex: 500, ey: 100, px: 500, py: 500 },
            16,
            'single'
        );
        expect(shots.length).toBe(1);
        expect(shots[0]!.vy).toBeGreaterThan(0); // 朝下打玩家
    });

    it('intervalMs 后才发第二轮', () => {
        const s = newState();
        updateEnemyWeapon(s, { ex: 500, ey: 100, px: 500, py: 500 }, 16, 'single');
        const noShots = updateEnemyWeapon(
            s,
            { ex: 500, ey: 100, px: 500, py: 500 },
            1000,
            'single'
        );
        expect(noShots.length).toBe(0);
    });
});

describe('EnemyWeapon/double', () => {
    it('一次发 3 弹', () => {
        const s = newState();
        const shots = updateEnemyWeapon(
            s,
            { ex: 500, ey: 100, px: 500, py: 500 },
            16,
            'double'
        );
        expect(shots.length).toBe(3);
    });
});

describe('EnemyWeapon/fan', () => {
    it('一次发 7 弹', () => {
        const s = newState();
        const shots = updateEnemyWeapon(
            s,
            { ex: 500, ey: 100, px: 500, py: 500 },
            16,
            'fan'
        );
        expect(shots.length).toBe(7);
    });

    it('damage 含倍数（>= 2）', () => {
        const s = newState();
        const shots = updateEnemyWeapon(
            s,
            { ex: 500, ey: 100, px: 500, py: 500 },
            16,
            'fan'
        );
        expect(shots[0]!.damage).toBeGreaterThanOrEqual(2);
    });
});

describe('EnemyWeapon/rapid burst', () => {
    it('1083ms 内进入 burst，5 弹分散在 133ms 间', () => {
        const s = newState();
        let total = 0;
        // 跑 1.5 秒
        for (let i = 0; i < 90; i++) {
            total += updateEnemyWeapon(
                s,
                { ex: 500, ey: 100, px: 500, py: 500 },
                1000 / 60,
                'rapid'
            ).length;
        }
        // 第一轮 burst 5 弹应该都已发完
        expect(total).toBeGreaterThanOrEqual(5);
    });

    it('单帧只发 1 弹（连发期内不会一帧出多发）', () => {
        const s = newState();
        const first = updateEnemyWeapon(
            s,
            { ex: 500, ey: 100, px: 500, py: 500 },
            16,
            'rapid'
        );
        expect(first.length).toBeLessThanOrEqual(1);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现**

```ts
// games/plane/src/systems/EnemyWeapon.ts
import { ENEMY_WEAPONS, type EnemyWeaponKey } from '../data/enemyWeapons.js';

export interface EnemyWeaponState {
    /** 距下次主开火剩余 ms */
    cooldownMs: number;
    /** burst 剩余发数 */
    burstRemaining: number;
    /** 距下次 burst 子发剩余 ms */
    burstNextMs: number;
}

export interface EnemyShotSpec {
    /** 相对敌机的偏移（一般 0） */
    ox: number;
    oy: number;
    /** 速度向量 px/s */
    vx: number;
    vy: number;
    /** 单弹伤害（含倍数） */
    damage: number;
    /** 颜色 */
    color: number;
}

export interface EnemyWeaponCtx {
    /** 敌机当前位置 */
    ex: number;
    ey: number;
    /** 玩家当前位置 */
    px: number;
    py: number;
}

/** 计算从敌机指向玩家的单位向量 */
function aimDirection(ctx: EnemyWeaponCtx): { nx: number; ny: number } {
    const dx = ctx.px - ctx.ex;
    const dy = ctx.py - ctx.ey;
    const d = Math.hypot(dx, dy) || 1;
    return { nx: dx / d, ny: dy / d };
}

/** 在瞄准方向上按 spread 半角生成 N 个均匀分布的速度向量 */
function fanShots(
    ctx: EnemyWeaponCtx,
    pellets: number,
    spreadRad: number,
    speed: number,
    damage: number,
    color: number
): EnemyShotSpec[] {
    const { nx, ny } = aimDirection(ctx);
    const baseAngle = Math.atan2(ny, nx);
    const specs: EnemyShotSpec[] = [];
    if (pellets === 1) {
        specs.push({
            ox: 0,
            oy: 0,
            vx: nx * speed,
            vy: ny * speed,
            damage,
            color
        });
        return specs;
    }
    for (let i = 0; i < pellets; i++) {
        const t = pellets === 1 ? 0 : i / (pellets - 1);
        const a = baseAngle - spreadRad + 2 * spreadRad * t;
        specs.push({
            ox: 0,
            oy: 0,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            damage,
            color
        });
    }
    return specs;
}

export function updateEnemyWeapon(
    state: EnemyWeaponState,
    ctx: EnemyWeaponCtx,
    dtMs: number,
    key: EnemyWeaponKey
): EnemyShotSpec[] {
    const w = ENEMY_WEAPONS[key];
    state.cooldownMs -= dtMs;

    // burst 模式：rapid
    if (w.burstSize > 1) {
        // 主 cooldown 到 -> 进入新一轮 burst
        if (state.cooldownMs <= 0 && state.burstRemaining <= 0) {
            state.cooldownMs = w.intervalMs;
            state.burstRemaining = w.burstSize;
            state.burstNextMs = 0;
        }
        // 在 burst 期内推进 burstNextMs
        if (state.burstRemaining > 0) {
            state.burstNextMs -= dtMs;
            if (state.burstNextMs <= 0) {
                state.burstNextMs = w.burstIntervalMs;
                state.burstRemaining -= 1;
                return fanShots(
                    ctx,
                    1,
                    0,
                    w.bulletSpeed,
                    Math.max(1, Math.floor(w.damageMultiplier)),
                    w.color
                );
            }
        }
        return [];
    }

    // non-burst：cooldown 归 0 一次发 N 弹
    if (state.cooldownMs <= 0) {
        state.cooldownMs = w.intervalMs;
        return fanShots(
            ctx,
            w.pelletsPerShot,
            w.spreadRad,
            w.bulletSpeed,
            Math.max(1, Math.floor(w.damageMultiplier)),
            w.color
        );
    }
    return [];
}
```

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 累计 +6
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/systems/EnemyWeapon.ts games/plane/tests/enemy-weapon-system.test.ts
git commit -m "M4d-3 plane EnemyWeapon 系统支持 5 类弹幕"
```

---

## Task 4: Meteor 实体 + MeteorDirector + 单测

**Files:**
- Create: `games/plane/src/entities/Meteor.ts`
- Create: `games/plane/src/systems/MeteorDirector.ts`
- Create: `games/plane/tests/meteor.test.ts`

> **数据对照（旧 plane README）：**
> - 间隔 600-1200 帧 → 10000-20000ms
> - HP 可被击破（旧 r 半径决定，简化：固定 hp=20）
> - 撞玩家伤害 3
> - 击破 80% 强制掉道具
>
> MeteorDirector 是纯逻辑：`tick(dtMs, rand) → SpawnRequest[]`。

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/meteor.test.ts
import { describe, it, expect } from 'vitest';
import { MeteorDirector } from '../src/systems/MeteorDirector.js';

const fixedRand = (): number => 0.5;

describe('MeteorDirector', () => {
    it('未到第一次间隔时不发请求', () => {
        const d = new MeteorDirector({
            minX: 40,
            maxX: 1240,
            randSource: fixedRand
        });
        const reqs = d.tick(1000);
        expect(reqs.length).toBe(0);
    });

    it('累计到首次 spawn 时间后发 1 个请求', () => {
        const d = new MeteorDirector({
            minX: 40,
            maxX: 1240,
            randSource: fixedRand
        });
        // 默认初始 cooldown 用 randSource 抽 10000-20000，rand=0.5 → 15000
        const reqs = d.tick(15001);
        expect(reqs.length).toBe(1);
        expect(reqs[0]!.x).toBeGreaterThanOrEqual(40);
        expect(reqs[0]!.x).toBeLessThanOrEqual(1240);
    });

    it('单次 tick 最多发 1 个请求', () => {
        const d = new MeteorDirector({
            minX: 40,
            maxX: 1240,
            randSource: fixedRand
        });
        const reqs = d.tick(60000);
        expect(reqs.length).toBe(1);
    });

    it('连续 60s 应产出 3-5 个陨石（间隔 10-20s）', () => {
        const d = new MeteorDirector({
            minX: 40,
            maxX: 1240,
            randSource: fixedRand
        });
        let total = 0;
        for (let i = 0; i < 60 * 60; i++) {
            total += d.tick(1000 / 60).length;
        }
        expect(total).toBeGreaterThanOrEqual(3);
        expect(total).toBeLessThanOrEqual(6);
    });
});

describe('Meteor/掉率', () => {
    it('击破 80% 强制爆率（数值约束）', () => {
        const METEOR_DROP_RATE = 0.8;
        expect(METEOR_DROP_RATE).toBe(0.8);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现 `Meteor.ts`**

```ts
// games/plane/src/entities/Meteor.ts
import Phaser from 'phaser';

export interface MeteorSpawnArgs {
    x: number;
    y: number;
}

export const METEOR_HP = 20;
export const METEOR_DAMAGE = 3;

export class Meteor extends Phaser.Physics.Arcade.Sprite {
    hp = METEOR_HP;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '__METEOR__');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setTint(0x886655);
        this.setDisplaySize(40, 40);
    }

    spawn(args: MeteorSpawnArgs): void {
        this.hp = METEOR_HP;
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setPosition(args.x, args.y);
        this.setVelocity(0, 180); // 旧版 ~3 px/帧
        this.setAngularVelocity(60);
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
        this.setAngularVelocity(0);
    }

    /** 返回是否被打死 */
    takeDamage(amount: number): boolean {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.deactivate();
            return true;
        }
        return false;
    }

    recycleIfOffscreen(playAreaBottom: number): void {
        if (!this.active) return;
        if (this.y > playAreaBottom + 80) {
            this.deactivate();
        }
    }
}

export function makeMeteorPool(scene: Phaser.Scene, size: number): Phaser.Physics.Arcade.Group {
    if (!scene.textures.exists('__METEOR__')) {
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(20, 20, 20);
        g.generateTexture('__METEOR__', 40, 40);
        g.destroy();
    }
    const group = scene.physics.add.group({
        classType: Meteor,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: '__METEOR__', quantity: size, active: false, visible: false });
    return group;
}
```

- [ ] **Step 4: 实现 `MeteorDirector.ts`**

```ts
// games/plane/src/systems/MeteorDirector.ts
export interface MeteorSpawnRequest {
    x: number;
}

export interface MeteorDirectorOpts {
    minX: number;
    maxX: number;
    randSource: () => number;
}

export const METEOR_DROP_RATE = 0.8;

const MIN_INTERVAL_MS = 10_000;
const MAX_INTERVAL_MS = 20_000;

export class MeteorDirector {
    private cooldownMs: number;
    private opts: MeteorDirectorOpts;

    constructor(opts: MeteorDirectorOpts) {
        this.opts = opts;
        this.cooldownMs = this.rollInterval();
    }

    private rollInterval(): number {
        return (
            MIN_INTERVAL_MS + this.opts.randSource() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS)
        );
    }

    tick(dtMs: number): MeteorSpawnRequest[] {
        this.cooldownMs -= dtMs;
        if (this.cooldownMs > 0) return [];
        this.cooldownMs = this.rollInterval();
        const x = this.opts.minX + this.opts.randSource() * (this.opts.maxX - this.opts.minX);
        return [{ x }];
    }
}
```

- [ ] **Step 5: PASS**

```powershell
pnpm test
# 累计 +5
```

- [ ] **Step 6: Commit**

```powershell
git add games/plane/src/entities/Meteor.ts games/plane/src/systems/MeteorDirector.ts games/plane/tests/meteor.test.ts
git commit -m "M4d-4 plane 添加 Meteor 实体与 MeteorDirector 时间驱动"
```

---

## Task 5: FxSystem 爆炸 + 屏震 + 单测

**Files:**
- Create: `games/plane/src/systems/FxSystem.ts`
- Create: `games/plane/tests/fx-system.test.ts`

> **职责：** 监听 `E.EnemyKilled` / `E.PlayerHit` / `meteor-broken`，分发视觉副作用：
> - 爆炸：Phaser ParticleEmitter 在死亡位置释放 12 个粒子（300ms 寿命）
> - 屏震：camera.shake(150ms, 0.005)
> - 命中泛白：暂不实现（旧版 enemy.hitFlash），M4d 留空，不阻塞核心
>
> FxSystem 构造时订阅事件并保留 unbind 句柄。单测用 fake scene 验事件订阅与调用次数。

- [ ] **Step 1: 写测试**

```ts
// games/plane/tests/fx-system.test.ts
import { describe, it, expect, vi } from 'vitest';
import { FxSystem } from '../src/systems/FxSystem.js';
import { E } from '../src/events.js';

function makeFakeScene() {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const cam = {
        shake: vi.fn()
    };
    const emitter = { emitParticleAt: vi.fn() };
    const particles = { destroy: vi.fn() };
    const scene = {
        events: {
            on: vi.fn((evt: string, fn: (...args: unknown[]) => void) => {
                if (!listeners.has(evt)) listeners.set(evt, []);
                listeners.get(evt)!.push(fn);
            }),
            off: vi.fn(),
            once: vi.fn()
        },
        add: {
            particles: vi.fn(() => emitter)
        },
        cameras: { main: cam }
    };
    return { scene, listeners, cam, emitter, particles };
}

describe('FxSystem 事件订阅', () => {
    it('订阅 EnemyKilled', () => {
        const fk = makeFakeScene();
        // eslint-disable-next-line no-new
        new FxSystem(fk.scene as never);
        expect(fk.listeners.has(E.EnemyKilled)).toBe(true);
    });

    it('收到 EnemyKilled 时触发屏震', () => {
        const fk = makeFakeScene();
        // eslint-disable-next-line no-new
        new FxSystem(fk.scene as never);
        const fns = fk.listeners.get(E.EnemyKilled);
        fns![0]!({ score: 100, x: 500, y: 300, enemyType: 'scout' });
        expect(fk.cam.shake).toHaveBeenCalled();
    });

    it('收到 PlayerHit 触发更强屏震', () => {
        const fk = makeFakeScene();
        // eslint-disable-next-line no-new
        new FxSystem(fk.scene as never);
        const fns = fk.listeners.get(E.PlayerHit);
        fns![0]!({ damage: 5 });
        expect(fk.cam.shake).toHaveBeenCalled();
    });

    it('订阅 meteor-broken 自定义事件', () => {
        const fk = makeFakeScene();
        // eslint-disable-next-line no-new
        new FxSystem(fk.scene as never);
        expect(fk.listeners.has('meteor-broken')).toBe(true);
    });
});
```

- [ ] **Step 2: FAIL**

```powershell
pnpm test
```

- [ ] **Step 3: 实现**

```ts
// games/plane/src/systems/FxSystem.ts
import Phaser from 'phaser';
import { E } from '../events.js';

const METEOR_BROKEN_EVENT = 'meteor-broken';

export class FxSystem {
    private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    constructor(private scene: Phaser.Scene) {
        if (!scene.textures.exists('__SPARK__')) {
            const g = scene.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(2, 2, 2);
            g.generateTexture('__SPARK__', 4, 4);
            g.destroy();
        }
        this.emitter = scene.add.particles(0, 0, '__SPARK__', {
            lifespan: 300,
            speed: { min: 80, max: 220 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD',
            emitting: false
        });

        scene.events.on(E.EnemyKilled, this.onEnemyKilled, this);
        scene.events.on(E.PlayerHit, this.onPlayerHit, this);
        scene.events.on(METEOR_BROKEN_EVENT, this.onMeteorBroken, this);
    }

    private onEnemyKilled(p: { x: number; y: number }): void {
        this.emitter?.emitParticleAt(p.x, p.y, 12);
        this.scene.cameras.main.shake(150, 0.005);
    }

    private onPlayerHit(): void {
        this.scene.cameras.main.shake(280, 0.012);
    }

    private onMeteorBroken(p: { x: number; y: number }): void {
        this.emitter?.emitParticleAt(p.x, p.y, 28);
        this.scene.cameras.main.shake(220, 0.008);
    }
}

export { METEOR_BROKEN_EVENT };
```

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 累计 +4
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/systems/FxSystem.ts games/plane/tests/fx-system.test.ts
git commit -m "M4d-5 plane FxSystem 爆炸粒子与屏震反馈"
```

---

## Task 6: sfxKeys + sfxBank 薄壳

**Files:**
- Create: `games/plane/src/data/sfxKeys.ts`
- Create: `games/plane/src/audio/sfxBank.ts`

> **职责：** sfxBank 是 `@cp/core/AudioBank` 的薄壳：暴露 `playSfx(key)` 一次性接口（fire-and-forget，解决 M3 review I4 的"API 不一致"——本接口不再支持 loop / rate / volume 覆盖，意图明确）。
>
> SFX key 用常量集中：`E_FIRE` / `E_EXPLODE` / `P_HIT` / `M_BREAK`。本 plan 不引入真音频文件（manifest.audio 为空），AudioBank.play(key) 在 key 不存在时 Phaser 会 console.warn 但不会抛错——这是有意行为，dev 跑起来 console 看见 warn 即知道该补 mp3。

- [ ] **Step 1: 写 `sfxKeys.ts`**

```ts
// games/plane/src/data/sfxKeys.ts
export const SFX = {
    EnemyExplode: 'sfx-enemy-explode',
    PlayerHit: 'sfx-player-hit',
    MeteorBreak: 'sfx-meteor-break',
    PlayerFire: 'sfx-player-fire'
} as const;

export type SfxKey = (typeof SFX)[keyof typeof SFX];
```

- [ ] **Step 2: 写 `sfxBank.ts`**

```ts
// games/plane/src/audio/sfxBank.ts
import Phaser from 'phaser';
import { AudioBank } from '@cp/core';

/**
 * SFX fire-and-forget 接口。
 *
 * 说明：M3 review 指出 @cp/core/AudioBank.play(key, opts) 的 loop/rate/volume
 * 是 "黏性 vs 重置" 行为不一致。playSfx 故意只接 key，
 * 内部固定 loop=false，每次重新设置默认音量。
 */
export class SfxBank {
    private bank: AudioBank;

    constructor(scene: Phaser.Scene) {
        this.bank = new AudioBank(scene, { volume: 0.6 });
    }

    playSfx(key: string): void {
        // Phaser 未注册 key 时 sound.add 会抛错。先 catch 让游戏不被音频中断
        try {
            this.bank.play(key, { loop: false });
        } catch {
            // 静默：占位 key 在 dev 期无 mp3 是预期状态
        }
    }
}
```

- [ ] **Step 3: typecheck**

```powershell
pnpm --filter @cp/game-plane typecheck
# 期望：0 error
```

- [ ] **Step 4: Commit**

```powershell
git add games/plane/src/data/sfxKeys.ts games/plane/src/audio/sfxBank.ts
git commit -m "M4d-6 plane 添加 SfxBank 薄壳与 SFX key 常量"
```

---

## Task 7: CollisionSystem 扩展（meteor + enemyBullet）

**Files:**
- Modify: `games/plane/src/systems/CollisionSystem.ts`

> 加 3 路 overlap：
> 1. `bullets ↔ meteors` 玩家子弹击破陨石（陨石死亡 emit `meteor-broken`）
> 2. `enemyBullets ↔ player` 敌机子弹打玩家（emit PlayerHit）
> 3. `meteors ↔ player` 陨石撞玩家（damage 3）

- [ ] **Step 1: 改 `CollisionSystem.ts`**

把 `CollisionSystemOpts` 扩展为：

```ts
export interface CollisionSystemOpts {
    scene: Phaser.Scene;
    player: Player;
    enemies: Phaser.Physics.Arcade.Group;
    bullets: Phaser.Physics.Arcade.Group;
    powerups: Phaser.Physics.Arcade.Group;
    enemyBullets: Phaser.Physics.Arcade.Group;
    meteors: Phaser.Physics.Arcade.Group;
    onPowerupPicked: (key: PowerupKey) => void;
}
```

constructor 内追加（保留原有 overlap）：

```ts
// 玩家子弹打陨石
scene.physics.add.overlap(bullets, opts.meteors, (a, b) => {
    const bullet = a as Bullet;
    const meteor = b as Meteor;
    if (!bullet.active || !meteor.active) return;
    const killed = meteor.takeDamage(bullet.damage);
    bullet.deactivate();
    if (killed) {
        scene.events.emit('meteor-broken', { x: meteor.x, y: meteor.y });
    }
});

// 敌机子弹打玩家
scene.physics.add.overlap(player, opts.enemyBullets, (_p, b) => {
    const bullet = b as EnemyBullet;
    if (!bullet.active) return;
    bullet.deactivate();
    if (!player.isShielded()) {
        scene.events.emit(E.PlayerHit, { damage: bullet.damage });
    }
});

// 陨石撞玩家
scene.physics.add.overlap(player, opts.meteors, (_p, m) => {
    const meteor = m as Meteor;
    if (!meteor.active) return;
    if (!player.isShielded()) {
        scene.events.emit(E.PlayerHit, { damage: METEOR_DAMAGE });
    }
    meteor.deactivate();
});
```

顶部 import 追加：

```ts
import { EnemyBullet } from '../entities/EnemyBullet.js';
import { Meteor, METEOR_DAMAGE } from '../entities/Meteor.js';
```

- [ ] **Step 2: typecheck（PlayScene 此刻还没传新参数，会暂时编译失败，但下一 task 装配）**

```powershell
pnpm --filter @cp/game-plane typecheck
# 期望：在 PlayScene.ts 报 "missing properties: enemyBullets, meteors"
```

> **注意：** 这里 typecheck 故意会 fail。下一个 task 修。不 commit 这一步。

- [ ] **Step 3: 暂存改动等待 task 8 一起 commit**

不 commit。改动会随 task 8 一起进入。

---

## Task 8: PlayScene 装配 EnemyWeapon + EnemyBullet 池

**Files:**
- Modify: `games/plane/src/scenes/PlayScene.ts`
- Modify: `games/plane/src/entities/Enemy.ts`

> 给 Enemy 加 `weaponState: EnemyWeaponState`（构造时初始化、spawn 时重置）。PlayScene 在 enemies.iterate 内每帧调 `updateEnemyWeapon`，把 ShotSpec 翻译成 EnemyBullet。
>
> 启用条件：敌机进入 PLAY_AREA 才开火（避免出现"刚生成在屏幕外就开火"的问题）。

- [ ] **Step 1: 改 `Enemy.ts` 加 `weaponState`**

加字段：

```ts
weaponState: EnemyWeaponState = { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };
```

`spawn()` 内重置：

```ts
this.weaponState = { cooldownMs: 0, burstRemaining: 0, burstNextMs: 0 };
```

import 顶部：

```ts
import type { EnemyWeaponState } from '../systems/EnemyWeapon.js';
```

- [ ] **Step 2: 改 `PlayScene.ts`**

import 顶部追加：

```ts
import { EnemyBullet, makeEnemyBulletPool } from '../entities/EnemyBullet.js';
import { updateEnemyWeapon } from '../systems/EnemyWeapon.js';
import { ENEMY_WEAPON_MAP } from '../data/enemyWeapons.js';
```

加私有字段：

```ts
private enemyBullets!: Phaser.Physics.Arcade.Group;
```

create 内 `this.enemies = ...` 后追加：

```ts
this.enemyBullets = makeEnemyBulletPool(this, 128);
```

CollisionSystem 调用改为传入 enemyBullets 与 meteors（meteors 在 task 9 加，先用占位 `this.physics.add.group({})` 顶一下不行——会破坏 task 9 的池子）。

> 调整：task 8 暂时**只**接 enemyBullets，meteors 在 task 9 再加。所以 CollisionSystem 的 opts 接口要允许 meteors 可选——重设计：

回退到 task 7：把 `enemyBullets` 与 `meteors` 都改为**必传**（task 9 立刻补 meteors）。task 8 + task 9 合并最终装配，确保 CollisionSystem 接口与 PlayScene 同时更新。

**新做法：** task 8 跳过 CollisionSystem 改动（task 7 的 modify 暂不实施）。仅添加 Enemy.weaponState + PlayScene 的 enemyBullets 池 + 每帧 EnemyWeapon tick + 用 `physics.add.overlap` 直接注册 `enemyBullets ↔ player`（不走 CollisionSystem）。task 9 一起把 CollisionSystem 重构 + meteors。

修改后 PlayScene create 内追加：

```ts
this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => {
    const bullet = b as EnemyBullet;
    if (!bullet.active) return;
    bullet.deactivate();
    if (!this.player.isShielded()) {
        this.events.emit(E.PlayerHit, { damage: bullet.damage });
    }
});
```

update 内 enemies.iterate 之内追加（在 BossBehavior 副作用后）：

```ts
// 敌机开火：进入屏幕才开
if (e.y > PLAY_AREA.y) {
    const wkey = ENEMY_WEAPON_MAP[e.typeKey];
    if (wkey) {
        const shots = updateEnemyWeapon(
            e.weaponState,
            { ex: e.x, ey: e.y, px: this.player.x, py: this.player.y },
            delta,
            wkey
        );
        for (const s of shots) {
            const bullet = this.enemyBullets.get() as EnemyBullet | null;
            if (!bullet) continue;
            bullet.fire({
                x: e.x + s.ox,
                y: e.y + s.oy,
                vx: s.vx,
                vy: s.vy,
                damage: s.damage,
                color: s.color
            });
        }
    }
}
```

update 末尾追加敌机子弹回池：

```ts
this.enemyBullets.children.iterate((b) => {
    (b as EnemyBullet).recycleIfOffscreen(PLAY_AREA.y, PLAY_AREA.y + PLAY_AREA.h);
    return null;
});
```

- [ ] **Step 3: typecheck / lint / test / build**

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# 期望：全 0 error
```

- [ ] **Step 4: Commit**

```powershell
git add games/plane/src/entities/Enemy.ts games/plane/src/scenes/PlayScene.ts
git commit -m "M4d-8 plane 装配 EnemyWeapon 与 EnemyBullet 池

敌机进入屏幕后按 type 走 5 类弹幕，子弹池 128 容量，超界自回池。敌机子弹打玩家发 PlayerHit 事件（护盾期免伤）。"
```

---

## Task 9: PlayScene 装配 Meteor + FxSystem + sfxBank

**Files:**
- Modify: `games/plane/src/systems/CollisionSystem.ts`
- Modify: `games/plane/src/scenes/PlayScene.ts`

> 这次一次性把 task 7 的 CollisionSystem 接口扩展 + meteor 池接入 + FxSystem 启动 + SfxBank 加载。

- [ ] **Step 1: 改 `CollisionSystem.ts`**

完整代码：

```ts
// games/plane/src/systems/CollisionSystem.ts
import Phaser from 'phaser';
import { Bullet } from '../entities/Bullet.js';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { Powerup } from '../entities/Powerup.js';
import { Meteor, METEOR_DAMAGE } from '../entities/Meteor.js';
import type { PowerupKey } from '../data/powerups.js';
import { E } from '../events.js';

export interface CollisionSystemOpts {
    scene: Phaser.Scene;
    player: Player;
    enemies: Phaser.Physics.Arcade.Group;
    bullets: Phaser.Physics.Arcade.Group;
    powerups: Phaser.Physics.Arcade.Group;
    meteors: Phaser.Physics.Arcade.Group;
    onPowerupPicked: (key: PowerupKey) => void;
}

export class CollisionSystem {
    constructor(opts: CollisionSystemOpts) {
        const { scene, player, enemies, bullets, powerups, meteors } = opts;

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

        scene.physics.add.overlap(bullets, meteors, (a, b) => {
            const bullet = a as Bullet;
            const meteor = b as Meteor;
            if (!bullet.active || !meteor.active) return;
            const killed = meteor.takeDamage(bullet.damage);
            bullet.deactivate();
            if (killed) {
                scene.events.emit('meteor-broken', { x: meteor.x, y: meteor.y });
            }
        });

        scene.physics.add.overlap(player, enemies, (_p, b) => {
            const enemy = b as Enemy;
            if (!enemy.active) return;
            if (!player.isShielded()) {
                scene.events.emit(E.PlayerHit, { damage: enemy.dmg });
            }
            enemy.deactivate();
        });

        scene.physics.add.overlap(player, meteors, (_p, m) => {
            const meteor = m as Meteor;
            if (!meteor.active) return;
            if (!player.isShielded()) {
                scene.events.emit(E.PlayerHit, { damage: METEOR_DAMAGE });
            }
            meteor.deactivate();
        });

        scene.physics.add.overlap(player, powerups, (_p, pwr) => {
            const p = pwr as Powerup;
            if (!p.active) return;
            opts.onPowerupPicked(p.powerupKey);
            p.deactivate();
        });
    }
}
```

- [ ] **Step 2: 改 `PlayScene.ts`**

import 顶部追加：

```ts
import { Meteor, makeMeteorPool } from '../entities/Meteor.js';
import { MeteorDirector, METEOR_DROP_RATE } from '../systems/MeteorDirector.js';
import { FxSystem } from '../systems/FxSystem.js';
import { SfxBank } from '../audio/sfxBank.js';
import { SFX } from '../data/sfxKeys.js';
```

加私有字段：

```ts
private meteors!: Phaser.Physics.Arcade.Group;
private meteorDirector!: MeteorDirector;
private sfx!: SfxBank;
```

create 内：

```ts
this.meteors = makeMeteorPool(this, 8);
this.meteorDirector = new MeteorDirector({
    minX: PLAY_AREA.x + 40,
    maxX: PLAY_AREA.x + PLAY_AREA.w - 40,
    randSource: Math.random
});
this.sfx = new SfxBank(this);
// eslint-disable-next-line no-new
new FxSystem(this);
```

CollisionSystem 实例化加 `meteors: this.meteors`：

```ts
new CollisionSystem({
    scene: this,
    player: this.player,
    enemies: this.enemies,
    bullets: this.bullets,
    powerups: this.powerups,
    meteors: this.meteors,
    onPowerupPicked: (key) => this.handlePowerupPicked(key)
});
```

监听陨石破碎，按 80% 强制掉道具：

```ts
this.events.on('meteor-broken', (p: { x: number; y: number }) => {
    this.sfx.playSfx(SFX.MeteorBreak);
    if (Math.random() < METEOR_DROP_RATE) {
        // 80% 掉落：从所有可用道具里随机选（不受 tier 限制）
        const allKeys: PowerupKey[] = ['power', 'shield', 'ally', 'hp', 'speed'];
        const available = allKeys.filter((k) => !this.onscreenPowerupKeys.has(k));
        if (available.length > 0) {
            const idx = Math.floor(Math.random() * available.length);
            const key = available[idx]!;
            this.spawnPowerupEntity(p.x, p.y, key);
        }
    }
});
```

事件 hook 加 SFX（在 EnemyKilled / PlayerHit / PlayerFire 监听里）：

```ts
this.events.on(E.EnemyKilled, () => this.sfx.playSfx(SFX.EnemyExplode));
this.events.on(E.PlayerHit, () => this.sfx.playSfx(SFX.PlayerHit));
this.events.on(E.PlayerFire, () => this.sfx.playSfx(SFX.PlayerFire));
```

update 内追加陨石推进：

```ts
const meteorReqs = this.meteorDirector.tick(delta);
for (const r of meteorReqs) {
    const m = this.meteors.get() as Meteor | null;
    if (m) m.spawn({ x: r.x, y: PLAY_AREA.y - 60 });
}

this.meteors.children.iterate((m) => {
    (m as Meteor).recycleIfOffscreen(PLAY_AREA.y + PLAY_AREA.h);
    return null;
});
```

main.ts subtitle 改 M4d：

```ts
subtitle: 'Phaser 重写版 · M4d',
```

- [ ] **Step 3: typecheck / lint / test / build**

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# 全 0 error
```

- [ ] **Step 4: Commit**

```powershell
git add games/plane/src/systems/CollisionSystem.ts games/plane/src/scenes/PlayScene.ts games/plane/src/main.ts
git commit -m "M4d-9 plane 装配 Meteor / FxSystem / SfxBank 闭环

陨石池 8 容量，MeteorDirector 间隔 10-20s 触发；玩家子弹击破陨石 80% 掉道具；CollisionSystem 加 bullet↔meteor、meteor↔player、enemyBullet↔player 三路 overlap；FxSystem 监听 EnemyKilled/PlayerHit/meteor-broken 触发粒子爆炸+屏震；SfxBank 包 AudioBank 用 fire-and-forget API 解决 M3 review I4。"
```

---

## Task 10: dev 验证 + README 进度更新

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 人工 dev 验证**

```powershell
pnpm dev:plane
```

清单：
- Title 显示「Phaser 重写版 · M4d」
- 敌机进入屏幕后**开火**（红/橙/黄/粉/紫五色弹幕对应 5 类武器）
- 玩家被敌机子弹打中扣血（HP 减少，屏震，护盾期免伤）
- 击杀敌机有橙色粒子爆炸 + 屏震
- 10-20s 出一颗陨石从顶部下落，HP 较高（玩家子弹打多发才能击破）
- 陨石击破：粒子爆炸 + 屏震 + 80% 概率掉一个道具
- 陨石撞玩家扣 3 HP（屏震更剧烈）
- console 可能见 sfx-* key 未注册的 warn（预期，无音频文件）
- 无 error

按 Ctrl+C 关闭 dev server。

- [ ] **Step 2: 更新根 `README.md` 当前进度（可选）**

```markdown
- ✅ M4d plane FX + 陨石 + 敌机弹幕（已无 SFX 音频文件，sfx keys 已就位）
- 🚧 M4e MarbleSpawner 接 marble-sim
```

- [ ] **Step 3: Commit**

```powershell
git add README.md
git commit -m "M4d-10 README 更新 M4d 完成进度"
```

---

# M4d 验收

跑完 10 个任务确认：

- [ ] `pnpm test` 166 测试全过（M4c 146 + M4d 20）
- [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 全 0 error
- [ ] `pnpm dev:plane` 跑出完整体验：敌机弹幕 + 陨石 + 爆炸粒子 + 屏震
- [ ] 旧 plane/marble 未动
- [ ] 10 个 commit 独立可 revert

---

# M4d 退出 / 进 M4e 准备

完成后 M4 阶段的核心战斗已经完整复刻，进 M4e（M4 最后一段）：

- 在 plane 内嵌入 marble-sim 弹珠面板
- 用 marble-sim 的 PLANE_SPAWNER_PRESET 配置 + Zone 触发 emit MarbleSpawn 事件
- WaveDirector 不再用纯时间触发，改为「时间 + 弹珠 zone 命中」联合驱动
- HUD 右侧加一个 220×560 的 Canvas/Graphics 显示弹珠模拟

预计 6-8 任务。完成 M4e 后整个重构 M4 阶段结束，进 M5 marble 独立游戏 / M6 收尾。
