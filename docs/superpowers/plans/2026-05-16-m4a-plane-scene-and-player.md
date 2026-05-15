# M4a · plane 场景骨架与玩家飞机实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `@cp/game-plane` 从 Phaser hello-world 推进到「能用方向键控制玩家飞机、自动开火打主炮、子弹用对象池」的最小可玩骨架。

**Architecture:** 基于 `@cp/core` 的 BootScene/TitleScene/PauseOverlay 模板，新建 PlayScene 作协调者。Player 与 Bullet 各自一个 `Phaser.Physics.Arcade.Sprite` 子类；Bullet 用 `Group.createMultiple({ active: false })` 池化避免 GC 颠簸；WeaponSystem Lv0 只实现 8 帧间隔单发主炮；InputMap 用 `@cp/core/input` 单帧边沿；速度全部 `px/s` 配合 `delta/1000` 完成 dt 基准化。

**Tech Stack:** Phaser 3.80 + TypeScript strict + Vite + `@cp/core`。逻辑分辨率 1280×720 / `Scale.FIT`。

**前置阅读：**
- 架构 spec：`docs/superpowers/specs/2026-05-15-architecture-design.md` §3、§6.2-6.6
- M1-M3 plan：`docs/superpowers/plans/2026-05-15-m1-m3-foundation.md`（已完成，66 测试通过）
- M3 review 留下的 **M4 待定项**：
  - I3 碰撞 sequential 单 pass —— 本 plan 不涉及（M4a 没碰撞），M4b 再处理
  - I4 AudioBank API 不一致 —— 本 plan 不放 SFX，M4d 再处理
  - I6 `Store<T>.write` 类型脆弱 —— 本 plan 不持久化，M4e 再处理

**关键约束（每个任务都遵守）：**

- 中文回复 + 中文 commit message
- 不动旧 `plane/` `marble/`（M1-M5 期间保留对比基线）
- 所有速度 `px/s`，所有时间 `ms`（Phaser 默认）或 `s`（marble-sim 风格）；不能用「帧」当时间单位
- 玩家移动响应度对齐旧版：旧 `plane/game.js` 玩家速度 `5px/帧 @60fps` ≈ **300 px/s**；加速时 ×1.5 ≈ 450 px/s
- 子弹速度对齐旧版：旧版 `bulletSpeed=12 px/帧` ≈ **720 px/s**
- 主炮射速对齐旧版：旧版 `8 帧/发 @60fps` ≈ **每 133 ms 一发** ≈ 7.5 发/秒
- 每个 task 完 commit，commit message 中文
- 测试落地 `games/plane/tests/**/*.test.ts`（vitest 已配置识别该路径）

---

## 文件结构（M4a 产出）

```
games/plane/
├── public/
│   └── static/
│       └── 飞机png/
│           └── hero/
│               └── plane_01_blue_striker_hires.png   # 从旧目录拷贝
├── src/
│   ├── main.ts                # 改写：装配 Phaser.Game，注册 3 个场景
│   ├── events.ts              # 新：事件名常量 + 类型
│   ├── data/
│   │   ├── theme.ts           # 新：颜色、字体（暂沿用 core DEFAULT_THEME，加 plane 自有色）
│   │   └── weapons.ts         # 新：武器表，先只 Lv0 主炮
│   ├── assets/
│   │   └── manifest.ts        # 新：AssetManifest，hero + bullet 占位
│   ├── scenes/
│   │   ├── PlayScene.ts       # 新：游戏主场景（协调 entities + systems）
│   │   └── ResultScene.ts     # 不在 M4a 范围（M4d）
│   ├── entities/
│   │   ├── Player.ts          # 新：Physics.Arcade.Sprite，HP/速度/移动
│   │   └── Bullet.ts          # 新：Physics.Arcade.Sprite + pool
│   └── systems/
│       └── WeaponSystem.ts    # 新：Lv0 主炮自动开火（间隔 133ms）
└── tests/
    ├── data.test.ts           # 新：weapons/theme 数据表结构校验
    └── weapon-system.test.ts  # 新：WeaponSystem 触发节奏（不依赖 Phaser）
```

**未在 M4a 范围：** Enemy / Boss / Ally / Powerup / Meteor / WaveDirector / EnemyBehavior / CollisionSystem / FxSystem / ScoreSystem / PowerupSystem / MarbleSpawner / ResultScene / 音效。

---

## 总任务清单（8 个）

| # | 任务 | 产出 |
|---|---|---|
| 1 | events 总线 + theme 数据 | `events.ts`、`data/theme.ts` |
| 2 | 武器表 + 单测 | `data/weapons.ts` + `tests/data.test.ts` |
| 3 | 拷贝 hero 资产 + manifest | `public/static/...`、`assets/manifest.ts` |
| 4 | Boot/Title 接入 + main.ts 重写 | 启动后能看到标题，点开始切到空白 PlayScene |
| 5 | Player 实体 + 键盘移动 | InputMap + Player + WASD/方向键移动 |
| 6 | Bullet 实体 + 对象池 | `Bullet.ts`，Group 池化、`spawn(x, y)` API |
| 7 | WeaponSystem Lv0 + dt 基准化 | 自动开火，间隔 133ms，单测覆盖节奏 |
| 8 | PlayScene 联通装配 + 收尾 | 跑通 `pnpm dev:plane`，玩家移动并自动开火 |

---

## Task 1: events 总线 + theme 数据

**Files:**
- Create: `games/plane/src/events.ts`
- Create: `games/plane/src/data/theme.ts`

> Review 反馈 M4 第一步必先把 events 写出来，避免后续 Scene 之间用 `registry.emit/on` 串状态、测试时事件穿透。本 task 只声明常量与类型，不在 PlayScene 真消费——下一个 task 再串。

- [ ] **Step 1: 写 `events.ts`**

```ts
// games/plane/src/events.ts
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
    [E.MarbleSpawn]: { enemyType: string };
}
```

> M4a 只用 `E.PlayerFire`，其余声明先占位以免 M4b/c/d 加事件时反复改 events.ts。

- [ ] **Step 2: 写 `data/theme.ts`**

```ts
// games/plane/src/data/theme.ts
import { DEFAULT_THEME, type Theme } from '@cp/core';

export const PLANE_THEME: Theme = {
    ...DEFAULT_THEME,
    primary: '#7df9ff', // 青
    secondary: '#9d4edd', // 紫
    danger: '#ff5577',
    text: '#e6f1ff',
    bg: '#020617',
    fontFamily: 'monospace'
};

export const HUD_HEIGHT = 80;            // 上下 HUD 各 80
export const PLAY_AREA = {
    x: 0,
    y: HUD_HEIGHT,
    w: 1280,
    h: 720 - HUD_HEIGHT * 2 // 560
};
```

- [ ] **Step 3: typecheck**

```powershell
pnpm --filter @cp/game-plane typecheck
# 期望：0 error
```

- [ ] **Step 4: Commit**

```powershell
git add games/plane/src/events.ts games/plane/src/data/theme.ts
git commit -m "M4a-1 plane 添加 events 总线与 theme 数据"
```

---

## Task 2: 武器表 + 单测

**Files:**
- Create: `games/plane/src/data/weapons.ts`
- Create: `games/plane/tests/data.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// games/plane/tests/data.test.ts
import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../src/data/weapons.js';

describe('data/weapons 表', () => {
    it('Lv0 主炮存在', () => {
        const w = WEAPONS[0];
        expect(w).toBeDefined();
        expect(w!.name).toBe('主炮');
    });

    it('Lv0 间隔为 133ms（旧版 8 帧 @60fps）', () => {
        expect(WEAPONS[0]!.intervalMs).toBe(133);
    });

    it('Lv0 子弹速度 720 px/s（旧版 12 px/帧 @60fps）', () => {
        expect(WEAPONS[0]!.bulletSpeed).toBe(720);
    });

    it('Lv0 主弹伤害大于 0', () => {
        expect(WEAPONS[0]!.damage).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 2: 跑测试看到 FAIL**

```powershell
pnpm test
# 期望：FAIL，找不到 ../src/data/weapons.js
```

- [ ] **Step 3: 写 `weapons.ts`**

```ts
// games/plane/src/data/weapons.ts
export interface WeaponLevel {
    name: string;
    intervalMs: number;     // 两发之间间隔（ms）
    bulletSpeed: number;    // px/s
    damage: number;
    spread?: number;        // 散射半角（弧度），M4a 不用
}

export const WEAPONS: WeaponLevel[] = [
    {
        name: '主炮',
        intervalMs: 133,     // 旧版 8 帧/发 @60fps
        bulletSpeed: 720,    // 旧版 12 px/帧 @60fps
        damage: 1
    }
];
```

> M4a 只放 Lv0。Lv1-6 在 M4c 的 WeaponSystem 升级时追加。

- [ ] **Step 4: 跑测试看到 PASS**

```powershell
pnpm test
# 期望：PASS，新增 4 测试，累计 70 通过
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/data/weapons.ts games/plane/tests/data.test.ts
git commit -m "M4a-2 plane 添加武器表 Lv0 与单测"
```

---

## Task 3: 拷贝 hero 资产 + AssetManifest

**Files:**
- Create: `games/plane/public/static/飞机png/hero/plane_01_blue_striker_hires.png`（从旧 `plane/static/` 拷贝）
- Create: `games/plane/src/assets/manifest.ts`

> 路径含中文是有意的（spec §6.1：避免 import 时字符问题，public 目录方式直接走相对路径字符串）。Vite dev / build 都能处理。

- [ ] **Step 1: 拷贝 hero png**

```powershell
$src = 'plane\static\飞机png\hero\plane_01_blue_striker_hires.png'
$dst = 'games\plane\public\static\飞机png\hero\plane_01_blue_striker_hires.png'
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item $src $dst
```

- [ ] **Step 2: 写 `manifest.ts`**

```ts
// games/plane/src/assets/manifest.ts
import type { AssetManifest } from '@cp/core';

export const planeManifest: AssetManifest = {
    images: [
        { key: 'hero', url: 'static/飞机png/hero/plane_01_blue_striker_hires.png' }
    ]
};
```

> M4a 还不需要 enemy / bullet 贴图——子弹用 Phaser Graphics 画矩形即可，下一个 task 处理。

- [ ] **Step 3: 验证文件确实落到 public 目录**

```powershell
Test-Path 'games/plane/public/static/飞机png/hero/plane_01_blue_striker_hires.png'
# 期望：True
```

- [ ] **Step 4: typecheck**

```powershell
pnpm --filter @cp/game-plane typecheck
# 期望：0 error
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/public games/plane/src/assets
git commit -m "M4a-3 plane 拷贝 hero 资产并定义 AssetManifest"
```

---

## Task 4: Boot/Title 接入 + main.ts 重写

**Files:**
- Modify: `games/plane/src/main.ts`（重写）

> 用 `@cp/core` 的 BootScene 加载 manifest，TitleScene 显示「雷霆战机 重写版」+ 开始按钮，点开始进入空白 PlayScene。PlayScene 此阶段只画背景色 + 一行占位文字。

- [ ] **Step 1: 写 `src/scenes/PlayScene.ts`（先骨架）**

```ts
// games/plane/src/scenes/PlayScene.ts
import Phaser from 'phaser';
import { PLANE_THEME } from '../data/theme.js';

export class PlayScene extends Phaser.Scene {
    constructor() {
        super('play');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);
        this.add
            .text(this.scale.width / 2, this.scale.height / 2, 'PlayScene 占位 · M4a-4', {
                fontFamily: PLANE_THEME.fontFamily,
                fontSize: '24px',
                color: PLANE_THEME.text
            })
            .setOrigin(0.5);
    }
}
```

- [ ] **Step 2: 改写 `src/main.ts`**

```ts
// games/plane/src/main.ts
import Phaser from 'phaser';
import { BootScene, TitleScene } from '@cp/core';
import { PLANE_THEME } from './data/theme.js';
import { planeManifest } from './assets/manifest.js';
import { PlayScene } from './scenes/PlayScene.js';

const boot = new BootScene({ manifest: planeManifest, next: 'title' });
const title = new TitleScene({
    title: '雷霆战机',
    subtitle: 'Phaser 重写版 · M4a',
    theme: PLANE_THEME,
    onStart: () => game.scene.start('play')
});
const play = new PlayScene();

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
    scene: [boot, title, play]
});
```

> `physics.arcade` 启用以便后续 Task 5/6 用 Arcade Sprite。`gravity: { x: 0, y: 0 }` —— plane 没重力，子弹/敌机由速度直接驱动。

- [ ] **Step 3: typecheck**

```powershell
pnpm --filter @cp/game-plane typecheck
# 期望：0 error
```

- [ ] **Step 4: build 验证**

```powershell
pnpm build
# 期望：0 error，games/plane/dist 生成
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/main.ts games/plane/src/scenes
git commit -m "M4a-4 plane 接入 Boot/Title 与 PlayScene 骨架"
```

---

## Task 5: Player 实体 + 键盘移动

**Files:**
- Create: `games/plane/src/entities/Player.ts`
- Modify: `games/plane/src/scenes/PlayScene.ts`

> Player 是 `Physics.Arcade.Sprite` 子类，吃 hero 贴图。移动用 `@cp/core/InputMap` 拿 WASD/方向键，每帧根据按键状态写 `setVelocity`。Player 自身不负责限制活动区——本 task 用 `setCollideWorldBounds(true)` + 自定义 bounds。

- [ ] **Step 1: 写 `Player.ts`**

```ts
// games/plane/src/entities/Player.ts
import Phaser from 'phaser';
import { InputMap, type InputSource } from '@cp/core';

export type PlayerAction = 'up' | 'down' | 'left' | 'right' | 'callAlly' | 'pause';

const SPEED_PX_PER_SEC = 300;

export class Player extends Phaser.Physics.Arcade.Sprite {
    private input: InputMap<PlayerAction>;
    hp = 100;
    maxHp = 100;

    constructor(scene: Phaser.Scene, x: number, y: number, kbSource: InputSource) {
        super(scene, x, y, 'hero');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        // hero 原图较大，缩到合适显示尺寸
        this.setDisplaySize(64, 64);
        // 物理体略小于显示，给玩家容错
        (this.body as Phaser.Physics.Arcade.Body).setSize(40, 40, true);

        this.input = new InputMap<PlayerAction>(kbSource);
        this.input.bindKey('up', 'ArrowUp', 'KeyW');
        this.input.bindKey('down', 'ArrowDown', 'KeyS');
        this.input.bindKey('left', 'ArrowLeft', 'KeyA');
        this.input.bindKey('right', 'ArrowRight', 'KeyD');
        this.input.bindKey('callAlly', 'KeyB');
        this.input.bindKey('pause', 'KeyP');
    }

    tick(): void {
        this.input.tick();
        const vx =
            (this.input.isDown('right') ? 1 : 0) - (this.input.isDown('left') ? 1 : 0);
        const vy =
            (this.input.isDown('down') ? 1 : 0) - (this.input.isDown('up') ? 1 : 0);
        // 对角线归一化
        const len = Math.hypot(vx, vy);
        const k = len > 0 ? SPEED_PX_PER_SEC / len : 0;
        this.setVelocity(vx * k, vy * k);
    }

    justPressedPause(): boolean {
        return this.input.justPressed('pause');
    }
}
```

- [ ] **Step 2: 修改 `PlayScene.ts` 实例化 Player**

```ts
// games/plane/src/scenes/PlayScene.ts
import Phaser from 'phaser';
import { PLANE_THEME, PLAY_AREA } from '../data/theme.js';
import { Player } from '../entities/Player.js';

export class PlayScene extends Phaser.Scene {
    private player!: Player;

    constructor() {
        super('play');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);

        // 限制 Player 活动区到玩家区（HUD 之间）
        this.physics.world.setBounds(PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.w, PLAY_AREA.h);

        const kbSource = {
            isKeyDown: (code: string): boolean => {
                const k = this.input.keyboard;
                if (!k) return false;
                return k.checkDown(k.addKey(code));
            }
        };

        this.player = new Player(this, this.scale.width / 2, PLAY_AREA.y + PLAY_AREA.h - 80, kbSource);
    }

    override update(_time: number, _delta: number): void {
        this.player.tick();
    }
}
```

> `_time`、`_delta` 用 `_` 前缀豁免 unused warn（M3 review 之后已配 `argsIgnorePattern: '^_'`）。

- [ ] **Step 3: typecheck**

```powershell
pnpm --filter @cp/game-plane typecheck
# 期望：0 error
```

- [ ] **Step 4: build 验证**

```powershell
pnpm build
# 期望：0 error
```

- [ ] **Step 5: 人工跑一次 dev 验证（可选——后续 Task 8 会再跑一次）**

```powershell
pnpm dev:plane
# 浏览器自动开 5173
# 点「开始」进 PlayScene
# WASD/方向键玩家飞机移动，越界被边界挡住
# Ctrl+C 关闭
```

> 若 dev 不便跑，至少跑 build 验证；Task 8 必须人工 dev 验证。

- [ ] **Step 6: Commit**

```powershell
git add games/plane/src/entities/Player.ts games/plane/src/scenes/PlayScene.ts
git commit -m "M4a-5 plane 添加 Player 实体与键盘移动"
```

---

## Task 6: Bullet 实体 + 对象池

**Files:**
- Create: `games/plane/src/entities/Bullet.ts`

> 子弹是 plane 性能瓶颈（同屏可达 800+）。用 `Group.createMultiple({ active: false })` 池化。spec §6.6 性能基线对此明确要求。

- [ ] **Step 1: 写 `Bullet.ts`**

```ts
// games/plane/src/entities/Bullet.ts
import Phaser from 'phaser';

export interface BulletSpawnArgs {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    color?: number;
}

export class Bullet extends Phaser.Physics.Arcade.Image {
    damage = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '__BULLET__'); // 占位 key，用 Graphics 生成
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    fire(args: BulletSpawnArgs): void {
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setPosition(args.x, args.y);
        this.setVelocity(args.vx, args.vy);
        this.damage = args.damage;
        // 用 displayWidth/Height 控制大小；颜色靠 tint
        this.setTint(args.color ?? 0x7df9ff);
        this.setDisplaySize(6, 12);
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
    }

    /** 超出屏幕则回池 */
    update(playAreaTop: number): void {
        if (!this.active) return;
        if (this.y < playAreaTop - 50 || this.y > 720 + 50 || this.x < -50 || this.x > 1280 + 50) {
            this.deactivate();
        }
    }
}

/** 在 PlayScene.create() 里调用一次，生成空白纹理 + Group + 预填池 */
export function makeBulletPool(scene: Phaser.Scene, size: number): Phaser.Physics.Arcade.Group {
    // 用 1×1 白色纹理，颜色靠 tint
    if (!scene.textures.exists('__BULLET__')) {
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 1, 1);
        g.generateTexture('__BULLET__', 1, 1);
        g.destroy();
    }
    const group = scene.physics.add.group({
        classType: Bullet,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: '__BULLET__', quantity: size, active: false, visible: false });
    return group;
}
```

> `classType: Bullet` 让 group 内部用我们的 Bullet 类。`maxSize: size` 限制池容量，避免无限增长。

- [ ] **Step 2: typecheck**

```powershell
pnpm --filter @cp/game-plane typecheck
# 期望：0 error
```

- [ ] **Step 3: 此 task 暂无单测**（子弹纯 Phaser，复用 Arcade Body，单测价值低；Task 7 的 WeaponSystem 单测会间接覆盖触发逻辑）

- [ ] **Step 4: Commit**

```powershell
git add games/plane/src/entities/Bullet.ts
git commit -m "M4a-6 plane 添加 Bullet 实体与对象池"
```

---

## Task 7: WeaponSystem Lv0 + dt 基准化 + 单测

**Files:**
- Create: `games/plane/src/systems/WeaponSystem.ts`
- Create: `games/plane/tests/weapon-system.test.ts`

> WeaponSystem 负责「按时间间隔发射子弹」，不依赖 Phaser。提供 `update(dtMs, fireRequest)` 接口，返回应在本帧发射的次数。这样既能单测（pure logic）又能在 PlayScene 中接到真子弹池。

- [ ] **Step 1: 写失败测试**

```ts
// games/plane/tests/weapon-system.test.ts
import { describe, it, expect } from 'vitest';
import { WeaponSystem } from '../src/systems/WeaponSystem.js';

describe('WeaponSystem Lv0', () => {
    it('首次 tick 立刻发射（旧版行为：按下开火立刻发）', () => {
        const w = new WeaponSystem();
        expect(w.tick(16)).toBe(1);
    });

    it('冷却期内不重发', () => {
        const w = new WeaponSystem();
        w.tick(16); // 首发进入冷却
        expect(w.tick(50)).toBe(0);
    });

    it('累积 dt 超过间隔时只发 1 次（防尖峰一帧多发）', () => {
        const w = new WeaponSystem();
        // dt=400ms 理论可发 3 次，但 cap 在 1 次
        expect(w.tick(400)).toBe(1);
    });

    it('多帧累计触发节奏稳定', () => {
        const w = new WeaponSystem();
        // 跑 1 秒：1000ms / 133ms ≈ 7.5 次
        let total = 0;
        for (let i = 0; i < 60; i++) total += w.tick(1000 / 60);
        expect(total).toBeGreaterThanOrEqual(7);
        expect(total).toBeLessThanOrEqual(8);
    });

    it('setLevel 0 是默认主炮 133ms', () => {
        const w = new WeaponSystem();
        w.setLevel(0);
        expect(w.tick(133)).toBe(1);
    });
});
```

- [ ] **Step 2: FAIL（找不到 ../src/systems/WeaponSystem.js）**

```powershell
pnpm test
```

- [ ] **Step 3: 实现**

```ts
// games/plane/src/systems/WeaponSystem.ts
import { WEAPONS } from '../data/weapons.js';

export class WeaponSystem {
    private level = 0;
    private cooldown = 0; // ms，距下次可发射剩余时间

    setLevel(level: number): void {
        this.level = level;
        // 升级不重置 cooldown，保持手感连贯
    }

    getLevel(): number {
        return this.level;
    }

    /** 推进 dt（毫秒），返回本帧应发射的弹幕数（cap 在 1） */
    tick(dtMs: number): number {
        this.cooldown -= dtMs;
        if (this.cooldown > 0) return 0;
        // 复位 cooldown 到下一次间隔（避免尖峰一帧多发）
        const interval = WEAPONS[this.level]!.intervalMs;
        this.cooldown = interval;
        return 1;
    }
}
```

> **关键设计：** dt 累积超过间隔时只发 1 次。理由是 Phaser 在切 tab 后回来 dt 可能瞬时几百 ms，如果一次发 N 颗子弹会瞬间塞满池子。spec §6.6 要求 plane 流畅度 ≥60fps 平均，这种保护必要。

- [ ] **Step 4: PASS**

```powershell
pnpm test
# 期望：5 新增测试通过，累计 75
```

- [ ] **Step 5: Commit**

```powershell
git add games/plane/src/systems/WeaponSystem.ts games/plane/tests/weapon-system.test.ts
git commit -m "M4a-7 plane 添加 WeaponSystem Lv0 与节奏单测"
```

---

## Task 8: PlayScene 联通装配 + 收尾

**Files:**
- Modify: `games/plane/src/scenes/PlayScene.ts`

> 把 Bullet 池、WeaponSystem、Player 接到一起。Player 头顶发射子弹，向上飞，超出屏幕回池。事件 `E.PlayerFire` 触发。

- [ ] **Step 1: 改写 `PlayScene.ts`**

```ts
// games/plane/src/scenes/PlayScene.ts
import Phaser from 'phaser';
import { PLANE_THEME, PLAY_AREA } from '../data/theme.js';
import { Player } from '../entities/Player.js';
import { Bullet, makeBulletPool } from '../entities/Bullet.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { WEAPONS } from '../data/weapons.js';
import { E } from '../events.js';

export class PlayScene extends Phaser.Scene {
    private player!: Player;
    private bullets!: Phaser.Physics.Arcade.Group;
    private weapon = new WeaponSystem();

    constructor() {
        super('play');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);
        this.physics.world.setBounds(PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.w, PLAY_AREA.h);

        const kbSource = {
            isKeyDown: (code: string): boolean => {
                const k = this.input.keyboard;
                if (!k) return false;
                return k.checkDown(k.addKey(code));
            }
        };

        this.player = new Player(this, this.scale.width / 2, PLAY_AREA.y + PLAY_AREA.h - 80, kbSource);
        this.bullets = makeBulletPool(this, 256);
    }

    override update(_time: number, delta: number): void {
        this.player.tick();

        // 武器自动开火
        const shots = this.weapon.tick(delta);
        for (let i = 0; i < shots; i++) {
            this.fireOnce();
        }

        // 子弹超界回池
        this.bullets.children.iterate((b) => {
            (b as Bullet).update(PLAY_AREA.y);
            return null;
        });
    }

    private fireOnce(): void {
        const bullet = this.bullets.get() as Bullet | null;
        if (!bullet) return; // 池满了，丢弃本次发射（不应频繁发生）
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
}
```

- [ ] **Step 2: typecheck + build**

```powershell
pnpm --filter @cp/game-plane typecheck
pnpm build
# 期望：均 0 error
```

- [ ] **Step 3: lint + test 全检**

```powershell
pnpm lint
pnpm test
# 期望：均 PASS，累计 75 测试通过
```

- [ ] **Step 4: 人工 dev 验证（必须做）**

```powershell
pnpm dev:plane
```

在浏览器：
- 看到「雷霆战机 · Phaser 重写版 · M4a」标题与「[ 开始 ]」按钮
- 点开始进入 PlayScene
- WASD / 方向键控制飞机移动，被 PLAY_AREA 边界挡住
- 自动开火（青色细长子弹从飞机头部往上飞）
- 子弹超出屏幕顶部消失（不堆积）
- 浏览器 console 没有 error

按 Ctrl+C 关闭 dev server。

- [ ] **Step 5: 更新仓库根 `README.md`，在「常用命令」表后追加 M4a 进度**

> README 上不写 "M4a 完成"——内容由 git log 表达。但如果想加一个「当前进度」段落，可以加：

```markdown
## 当前进度

- ✅ M1 脚手架（pnpm/TS/ESLint/Vitest/Phaser hello）
- ✅ M2 @cp/core 共享引擎（math/save/input/assets/audio/ui/scenes）
- ✅ M3 @cp/marble-sim 仿真包（World/Obstacle/Sweep/Pipe/Zone/Launcher）
- ✅ M4a plane 场景骨架与玩家（Player + WeaponSystem Lv0）
- 🚧 M4b plane 敌机与碰撞
- ⏳ M4c plane 强化系统（9 级武器 + 5 种道具 + Boss）
- ⏳ M4d plane FX/HUD/陨石
- ⏳ M4e MarbleSpawner 接 marble-sim
```

如果你只想保留 git log 作为事实之源，**可以跳过 Step 5**。

- [ ] **Step 6: Commit**

```powershell
git add games/plane/src/scenes/PlayScene.ts README.md
git commit -m "M4a-8 plane 装配 PlayScene 完成 M4a 可玩骨架

玩家飞机响应 WASD/方向键 4 向移动（含对角线归一化），自动开火 Lv0 主炮间隔 133ms 子弹速度 720px/s，子弹用 256 容量对象池，超界自回池。dt 基准化通过 Phaser delta 参数完成，单测覆盖间隔触发节奏。"
```

---

# M4a 验收

跑完 8 个任务后，确认：

- [ ] `pnpm test` 75 测试全过（M1-M3 的 66 + M4a 的 9）
- [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 全 0 error
- [ ] `pnpm dev:plane` 能玩起来：移动 + 自动开火 + 子弹回池
- [ ] 旧 `plane/` `marble/` 未动
- [ ] 8 个新 commit 各自独立有意义、可单独 revert

---

# M4a 退出 / 进 M4b 准备

完成后，下一步是 M4b（敌机与碰撞）。M4b 预期范围：

- entities/Enemy（7 类型策略模式 base class）
- data/enemyTypes.ts（HP/速度/伤害/掉落/贴图 key 表）
- data/wavePresets.ts（时间→敌机配方）
- systems/WaveDirector（按时间生成敌机）
- systems/EnemyBehavior（按 type 走策略）
- systems/CollisionSystem（子弹 ↔ 敌机、敌机 ↔ 玩家）
- 处理 M3 review 留下的 **I3 碰撞 iteration**（如果 sequential 单 pass 出现抖动）

M4a 完工后直接调 `superpowers:writing-plans` 写 `2026-XX-XX-m4b-plane-enemies-and-collision.md`。
