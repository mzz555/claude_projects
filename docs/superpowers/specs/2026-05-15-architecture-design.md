# claude_projects 技术架构设计

- 日期：2026-05-15
- 适用范围：claude_projects 仓库的整体技术架构重构
- 当前形态：plane（雷霆战机 v9.0，单文件 game.js 2168 行）+ marble（单文件 index.html 649 行），无构建、无依赖管理、无共享代码
- 目标形态：基于 Phaser 3 的多游戏公共引擎仓库

## 0. 决策摘要

| 维度 | 决策 |
|---|---|
| 范围 | 多游戏公共引擎（plane/marble 全重写） |
| 引擎 | Phaser 3 + TypeScript + Vite |
| 仓库 | pnpm monorepo + workspaces |
| 共享层 | 标准集：scenes / assets / ui / audio / save / input / math |
| 物理共享 | 新增 `packages/marble-sim` 纯逻辑包 |
| 质量门 | Vitest + ESLint + Prettier；无 CI、无 husky |
| 部署 | 暂只本地（pnpm dev / pnpm build） |
| 资产 | 独立 PNG，置于 `games/*/public/static/` |
| 逻辑分辨率 | 1280×720（16:9，Phaser Scale.FIT 自适应） |

## 1. 高层视图

### 1.1 仓库结构

```
claude_projects/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.cjs   .prettierrc.cjs
├── vitest.config.ts
│
├── packages/
│   ├── core/                 # @cp/core 共享引擎
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── scenes/       # Boot/Title/PauseOverlay/GameOver 模板
│   │   │   ├── assets/       # AssetManifest 类型 + 加载辅助
│   │   │   ├── ui/           # Button / Bar / Dialog / HudPanel
│   │   │   ├── audio/        # AudioBank
│   │   │   ├── save/         # 版本化 localStorage
│   │   │   ├── input/        # ActionMap（KB + Gamepad）
│   │   │   ├── math/         # rand / clamp / lerp / RNG / 缓动
│   │   │   └── index.ts
│   │   └── tests/
│   └── marble-sim/           # @cp/marble-sim 纯仿真包
│       ├── src/
│       │   ├── world.ts ball.ts obstacle.ts sweep.ts pipe.ts
│       │   ├── zone.ts launcher.ts collision.ts types.ts
│       │   └── presets.ts
│       └── tests/
│
├── games/
│   ├── plane/                # @cp/game-plane
│   │   ├── package.json      # 依赖 phaser、@cp/core、@cp/marble-sim
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── scenes/                  # BootScene / TitleScene / PlayScene / ResultScene
│   │   │   ├── entities/                # Player / Enemy / Boss / Ally / Bullet / Powerup / Meteor
│   │   │   ├── systems/                 # WaveDirector / WeaponSystem / EnemyBehavior /
│   │   │   │                            # CollisionSystem / FxSystem / ScoreSystem /
│   │   │   │                            # PowerupSystem / MarbleSpawner
│   │   │   ├── data/                    # enemyTypes / weapons / wavePresets / powerups / theme
│   │   │   ├── events.ts                # 事件名常量
│   │   │   └── assets/manifest.ts
│   │   └── public/static/               # 现有 PNG 平移过来
│   └── marble/               # @cp/game-marble
│       └── …同上结构
│
└── docs/superpowers/specs/
```

### 1.2 依赖方向

```
                phaser (npm)
                    │
                ┌───▼────────┐
                │ @cp/core   │
                └─┬────────┬─┘
                  │        │
       ┌──────────▼─┐  ┌───▼──────────────┐
       │ @cp/marble-sim │  │ (其他共享包预留位) │
       └──────┬──────┘  └─────────────────┘
              │  ┌──────────────────────────┐
              ├──▶ @cp/game-plane            │
              │  └──────────────────────────┘
              │  ┌──────────────────────────┐
              └──▶ @cp/game-marble           │
                 └──────────────────────────┘
```

**核心约束：** 依赖单向，core 与 marble-sim 不得反向引用任何具体游戏。游戏入口 `main.ts` 是唯一装配 `Phaser.Game` 的位置。

## 2. `packages/core` 模块设计

### 2.1 `scenes/` 场景模板

| 类 | 入参 | 职责 |
|---|---|---|
| `BootScene` | `{ manifest, next }` | 显示进度条，按 manifest 加载所有资源 |
| `TitleScene` | `{ title, subtitle, theme, onStart }` | 标题、开始按钮、设置入口 |
| `PauseOverlay` | `(scene)` 静态方法 | 半透明遮罩 + 继续/重开/退出 |
| `GameOverScene` | `{ stats: StatLine[], onRetry, onMenu }` | 显示统计、再来一局；不写业务字段 |

设计原则：模板不写业务字段，只画骨架接收回调。

### 2.2 `assets/` 资产清单

```ts
type AssetManifest = {
    images?: Array<{ key: string; url: string }>;
    spritesheets?: Array<{ key: string; url: string; frameW: number; frameH: number }>;
    audio?: Array<{ key: string; urls: string[] }>;
    fonts?: Array<{ family: string; url: string }>;
};
```

### 2.3 `ui/` 控件

- `Button` 矩形 + 文本 + hover/down + 主题色
- `Bar` 进度条，fill/track 双色
- `Dialog` 模态对话框
- `HudPanel` 自动布局容器

默认主题取 plane 现有未来科技青/紫配色，主题对象可整体替换。

### 2.4 `audio/AudioBank`

```ts
class AudioBank {
    constructor(scene: Phaser.Scene, defaults?: { volume?: number });
    play(key: string, opts?: { rate?: number; volume?: number; loop?: boolean }): void;
    stop(key: string): void;
    setMasterVolume(v: number): void;
    setMuted(m: boolean): void;
}
```

音量与静音状态通过 `save` 模块持久化。SFX key 不在 core 中穷举，由游戏注册。

### 2.5 `save/` 版本化 localStorage

```ts
defineStore<T>(namespace: string, version: number, defaults: T): Store<T>
```

写入附 `__v` 字段；启动时版本不匹配则迁移或重置。单测覆盖：正常读写、版本错配回退、JSON 损坏回退。

### 2.6 `input/` 动作映射

```ts
class InputMap<A extends string = string> {
    bindKey(action: A, ...keys: string[]): void;
    bindGamepad(action: A, button: number): void;
    isDown(action: A): boolean;
    justPressed(action: A): boolean;   // 单帧边沿
}
```

游戏自定义 Action 联合类型，InputMap 用泛型保留类型安全。

### 2.7 `math/` 工具

`rand / randInt / clamp / lerp / hits / SeededRNG / easeOutQuad ...`。纯函数，100% 单测覆盖。

### 2.8 内部依赖矩阵

```
scenes → ui, assets, audio
ui     → math
audio  → save
save   → (无)
input  → (无)
math   → (无)
assets → (无)
```

叶子模块：math / save / input / assets。无循环依赖。

## 3. `games/plane` 设计

### 3.1 场景拆分

```
BootScene → TitleScene → PlayScene ─┬─ PauseOverlay (sleep/resume)
                                    ├─ ResultScene (lose)
                                    └─ ResultScene (win)
```

PlayScene 是协调者，不再 1 个 class 撑 2000 行；工作交给 entities/ 和 systems/。

### 3.2 实体（`entities/`）

| 文件 | 当前对应 | Phaser 父类 |
|---|---|---|
| `Player.ts` | class Player | Physics.Arcade.Sprite |
| `Bullet.ts` | class Bullet | Physics.Arcade.Sprite + Group 池化 |
| `Enemy.ts` | class Enemy | Physics.Arcade.Sprite + 抽象基类，按 type 走策略 |
| `Boss.ts` | carrier 行为 | Physics.Arcade.Sprite（拆出便于扩 Boss） |
| `Ally.ts` | class Ally | Physics.Arcade.Sprite |
| `Powerup.ts` | class Powerup | Physics.Arcade.Sprite + 漂浮 tween |
| `Meteor.ts` | class Meteor | Physics.Arcade.Sprite |

> 现版本的 `class Particle` 整体废弃：爆炸、拖尾、超频环都改用 Phaser `ParticleEmitter`，由 `FxSystem` 持有，不再作为独立 entity 类。

### 3.3 系统（`systems/`）

| 系统 | 输入 | 输出 |
|---|---|---|
| `WaveDirector` | wavePresets, 当前时间 | `spawn(EnemyType, x)` |
| `WeaponSystem` | Player.state | bullets |
| `EnemyBehavior` | Enemy.type, dt | 行为副作用 |
| `CollisionSystem` | Phaser groups | 事件总线 |
| `FxSystem` | events | 爆炸/震屏/泛白 |
| `ScoreSystem` | events | UI 更新 |
| `PowerupSystem` | events | Player.state 变更 |
| `MarbleSpawner` | tick | 触发 `marble-spawn` 事件 |

**关键设计：** 系统之间通过 PlayScene 的事件总线通信，不互相直接引用。删一个系统不会牵连其他。

### 3.4 数据驱动（`data/`）

```
data/
├── enemyTypes.ts    # 7 种敌机 hp/速度/伤害/掉落/贴图 key
├── weapons.ts       # 9 种武器弹道/角度/伤害
├── wavePresets.ts   # 时间 → 敌机配方
├── powerups.ts      # 形态属性
└── theme.ts         # 颜色、字体
```

### 3.5 资产 manifest 示例

```ts
export const planeManifest: AssetManifest = {
    images: [
        { key: 'hero',    url: 'static/飞机png/hero/plane_01_blue_striker_hires.png' },
        { key: 'enemy-1', url: 'static/飞机png/enemy/enemy-1.png' },
        // ...
    ],
    audio: [
        { key: 'sfx-fire', urls: ['static/audio/fire.mp3'] },
    ],
};
```

### 3.6 文件规模目标

```
当前：plane/game.js 2168 行
目标：scenes/(4) + entities/(7) + systems/(8) + data/(5)
      + main.ts + events.ts + assets/manifest.ts ≈ 27 个文件
      单文件 50~250 行
      总行数预计 1300~1500 行（Phaser 替代了约 700 行自写 boilerplate）
```

## 4. `games/marble` 与 `packages/marble-sim`

### 4.1 拆分

```
packages/marble-sim   纯仿真，零渲染，可在 Node 跑
       │
       ├──→ games/marble       全屏 Phaser 弹珠模拟器
       └──→ games/plane        侧栏小面板（原生 Canvas 2D 渲染）
```

把物理仿真与渲染严格分离。plane 侧栏继续用原生 Canvas 2D，不引第二个 Phaser.Game 实例。

### 4.2 `packages/marble-sim` 模块

```
src/
├── world.ts        # World + step(dt) + snapshot()
├── ball.ts obstacle.ts sweep.ts pipe.ts zone.ts launcher.ts
├── collision.ts    # 圆-圆 / 圆-线段 / 圆-墙
├── types.ts        # Vec2, CollisionEvent, WorldConfig
└── presets.ts      # PLANE_SPAWNER_PRESET / STANDALONE_PRESET
```

API 形态：

```ts
const world = new World({ bounds, gravity, bounce });
world.addObstacle({ x, y, r });
world.addSweep({ pivot, length, omega });
world.addZone({ x, y, w, h, onEnter: ball => {...} });
world.launchBall({ x, y, vx, vy });

function tick(dt: number) {
    const events = world.step(dt);
    render(world.snapshot());
}
```

### 4.3 `games/marble` 独立游戏

| 文件 | 职责 |
|---|---|
| `scenes/PlayScene.ts` | 实例化 World，每帧 step，用 Phaser Graphics 画 |
| `ui/FreqSlider.ts` | 频率滑块（绿色科技风） |
| `ui/HudPanel.ts` | 击中目标计数、当前球数（复用 core） |
| `config.ts` | 关卡布局：障碍、管道、目标区 |
| `assets/manifest.ts` | 暂无贴图 |

### 4.4 plane 侧栏复用

```ts
class MarbleSpawner {
    private world = new World(PLANE_SPAWNER_PRESET);
    private renderer = new MarblePanelRenderer(this.canvas, this.world);

    constructor(private playScene: PlayScene) {
        this.world.addZone({ ..., onEnter: () => this.emit('scout') });
        // 7 个 zone 对应 7 种敌机
    }

    update(dt: number) {
        this.world.step(dt);
        this.renderer.draw();
    }

    private emit(type: EnemyType) {
        this.playScene.events.emit('marble-spawn', type);
    }
}
```

### 4.5 文件规模目标

```
当前：marble/index.html 649 行
目标：marble-sim/         ~600 行（多文件，便于测试）
      games/marble/        ~300 行
      plane 的 MarbleSpawner  ~120 行（替代现 ~250 行）
```

## 5. 工程脚手架

### 5.1 根 `package.json`

```jsonc
{
  "name": "claude-projects",
  "private": true,
  "scripts": {
    "dev:plane":  "pnpm --filter @cp/game-plane dev",
    "dev:marble": "pnpm --filter @cp/game-marble dev",
    "build":      "pnpm -r build",
    "test":       "vitest run",
    "test:watch": "vitest",
    "typecheck":  "pnpm -r typecheck",
    "lint":       "eslint . --ext .ts",
    "format":     "prettier --write ."
  },
  "devDependencies": {
    "typescript": "^5.5",
    "vitest": "^2",
    "eslint": "^9",
    "@typescript-eslint/eslint-plugin": "^8",
    "@typescript-eslint/parser": "^8",
    "prettier": "^3"
  },
  "packageManager": "pnpm@9"
}
```

### 5.2 `tsconfig.base.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

### 5.3 子包 `tsconfig.json`

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

### 5.4 `vite.config.ts`（各游戏一份相同模板）

```ts
import { defineConfig } from 'vite';
export default defineConfig({
    base: './',
    server: { port: 5173, open: true },
    build: { target: 'es2022', sourcemap: true },
    resolve: { alias: { '@': '/src' } },
});
```

### 5.5 `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
  - 'games/*'
```

### 5.6 工作区依赖示例

```jsonc
{
  "name": "@cp/game-plane",
  "dependencies": {
    "phaser": "^3.80",
    "@cp/core":       "workspace:*",
    "@cp/marble-sim": "workspace:*"
  }
}
```

### 5.7 ESLint 关键规则

```js
rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    'eqeqeq': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'curly': ['error', 'multi-line'],
}
```

### 5.8 Vitest 覆盖范围

| 包 | 测试什么 | 不测什么 |
|---|---|---|
| `core/math` | RNG 决定性、clamp/lerp 边界、hits AABB | 视觉 |
| `core/save` | 版本迁移、JSON 损坏回退、命名空间隔离 | DOM |
| `core/input` | 动作映射、单帧边沿 | 真实硬件 |
| `marble-sim` | 落地能量守恒、墙壁反弹、对称碰撞 | 渲染 |
| `game-plane` | data/ 表结构、关键纯函数 | Phaser 行为 |

Phaser 视觉与手感全靠人工跑 `pnpm dev:plane` 验证。

### 5.9 加新游戏清单

```
1. mkdir games/<name> && cd $_
2. cp -r ../plane/{package.json,tsconfig.json,vite.config.ts,index.html} .
3. 改 package.json 的 name 为 @cp/game-<name>
4. 删 src/，新建空 main.ts，import phaser + @cp/core
5. pnpm install
6. pnpm dev:<name>
```

## 6. 跨切关注点

### 6.1 资产路径

- 采用 Vite **public 目录**方案：`games/plane/public/static/...`
- manifest 中写相对路径字符串，与 dist 一致
- 原因：现有路径含中文（`飞机png`），避免 import 时字符问题；小项目无需哈希指纹

### 6.2 事件总线

```ts
// games/plane/src/events.ts
export const E = {
    EnemyKilled:   'enemy-killed',
    PlayerHit:     'player-hit',
    PowerupTaken:  'powerup-taken',
    WeaponChanged: 'weapon-changed',
    BossEntered:   'boss-entered',
    MarbleSpawn:   'marble-spawn',
} as const;
export type EventName = typeof E[keyof typeof E];
```

规则：core 不参与游戏事件；events.ts 只存在于游戏侧。

### 6.3 场景数据传递

- 通过 `scene.scene.start('next', payload)` 传递关卡数据
- 禁止用全局单例存关卡状态（重玩第二局时不易重置）
- 唯一全局状态是 `core/save` 暴露的持久层（高分、设置）

### 6.4 dt 与帧驱动

- Phaser 的 `update(time, delta)`，delta 单位毫秒
- 所有速度按 `px/s`，乘 `delta/1000`
- 现版本是按 60fps 硬假设写的，迁移期必做基准化（见 §7.2 M4）

### 6.5 DPR 与分辨率

- 逻辑分辨率 **1280×720**（16:9）
- `scale.mode: Phaser.Scale.FIT`、`autoCenter: CENTER_BOTH`
- `resolution: window.devicePixelRatio` 自动适配高分屏
- HUD 上下各 80px，玩家活动区 1280×560

### 6.6 性能基线

| 指标 | 目标 |
|---|---|
| 平均 FPS | ≥ 60 |
| 启动到可玩 | ≤ 1.5s |
| Player.update 单帧 | ≤ 0.2ms |
| 总实体 | ≤ 200 Sprite + 800 子弹（对象池） |

子弹/敌弹用 Phaser `Group.createMultiple({ active: false })` 池化。

### 6.7 i18n

不引入框架。文案直接中文写在 data/theme.ts。预留 `messages.ts` 常量文件，未来要换语言只动这一个文件。

### 6.8 错误处理与可观测性

- 全局 `window.addEventListener('error', ...)`，dev-only debug overlay 显示
- `import.meta.env.DEV` 时启用，生产 build 移除
- 不引入 Sentry / 监控

## 7. 风险、里程碑、范围

### 7.1 风险与对策

| 风险 | 对策 |
|---|---|
| dt 迁移导致手感偏移 | 迁移前录 60Hz 视频做基线，60Hz/144Hz 双屏对比 |
| 中文路径 + Vite 构建坑 | 上线前 `pnpm build && http-server dist` 全量点一遍 |
| Phaser ParticleEmitter 与现自写粒子手感不同 | FxSystem 抽口子，必要时退回 Graphics 手画 |
| Matter.js 与现 plane 碰撞判定差异 | plane 用 Arcade（AABB），不用 Matter |
| WebAudio → Phaser Sound 切换 | AudioBank 留 volume/rate 参数 |
| 重写中断现版本 | 旧 plane/ marble/ 不删，新代码并存于 games/，完成后清理 |

### 7.2 里程碑

```
M1  脚手架就位
    - pnpm workspace、tsconfig、eslint、vitest 起来
    - 一个 hello-world Phaser 跑在 games/plane/
    - 根 README 写明工作流命令

M2  core 包成型
    - math（最先，纯函数好测）
    - save、input（叶子，独立可测）
    - assets、audio（依赖 Phaser）
    - ui、scenes（最复杂，最后）
    - 每模块 Vitest 关键路径覆盖

M3  marble-sim 包成型
    - World/Ball/Obstacle/Sweep/Pipe/Zone/Launcher 7 类
    - collision 算法单测
    - 暴露快照 API

M4  plane 重写（主战场）
    - entities 7 个
    - systems 8 个
    - data 5 张表
    - MarbleSpawner 接入 marble-sim
    - dt 基准化与 60/144Hz 对比

M5  marble 独立游戏
    - Phaser 场景包一下 marble-sim
    - 复用 core/ui 频率滑块

M6  收尾
    - 老 plane/、marble/ 移到 legacy/ 或删除
    - README 更新「加新游戏」段落
    - 性能基线对比报告
```

### 7.3 明确**不**做（YAGNI）

- 没有后端、账号、云端排行榜
- 没有移动端触控适配（保留键盘+手柄）
- 没有 i18n 框架
- 没有可视化关卡编辑器
- 没有 CI/CD
- 没有 husky / lint-staged
- 没有 Sentry / 监控
- 没有 TexturePacker atlas
- 没有 PWA / 离线缓存

### 7.4 验收检查点

1. `pnpm dev:plane` 直接跑起 plane → 是
2. `pnpm dev:marble` 直接跑起 marble → 是
3. plane 手感与旧版基本一致 → 是（dt 基准化解决）
4. 5 分钟加一个新游戏空架子 → 是（§5.9）
5. 换主角贴图需要改几个文件 → 1 个（manifest.ts）

## 8. 与现有代码的过渡策略

- 旧 `plane/`、`marble/` 目录在 M1~M5 期间**保留不动**，作为旧版本对比基线
- 新代码全部进 `games/`，路径不冲突
- M6 收尾时把旧目录移到 `legacy/`（或确认废弃后删除）
- 整个重构周期内，旧版本仍可通过现有 8765 端口静态服务运行

## 9. 后续

本设计完成后，移交 `writing-plans` 技能生成实施计划，按 M1~M6 顺序拆任务。每个里程碑独立可交付、可验证、可回滚。
