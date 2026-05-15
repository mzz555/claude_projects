# claude_projects 基础包阶段（M1–M3）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 plane / marble 两个零依赖原生项目重构为 Phaser 3 + TypeScript + Vite 的 pnpm monorepo 形态，完成脚手架（M1）、`@cp/core` 共享引擎包（M2）和 `@cp/marble-sim` 纯仿真包（M3）。

**Architecture:** monorepo 三层依赖：phaser ← `@cp/core` ← `@cp/marble-sim` ← `games/*`。M1 立起工程化（包管理 / TS / 单测 / lint / Vite），M2 把 7 个共享模块按"叶子优先"顺序填进 core，M3 把弹珠物理纯逻辑分离成独立包，零渲染依赖、Node 可跑测试。

**Tech Stack:** pnpm@9 + TypeScript@5.5 strict + Vite + Phaser@3.80 + Vitest@2 + ESLint@9 + Prettier@3。逻辑分辨率 1280×720 / Scale.FIT。

**前置阅读：** `docs/superpowers/specs/2026-05-15-architecture-design.md` 是本计划的依据，关键决策在 §0/§1.2/§2/§4/§5。

**关键约束（每个任务都要遵守）：**

- 依赖单向：core / marble-sim 不得反向 import 任何 `games/*`
- 旧 `plane/` `marble/` 目录**保留不动**作为对比基线，整个 M1-M3 期间不可删除或修改
- 所有 npm 脚本统一在仓库根 `package.json`
- TypeScript strict / noUncheckedIndexedAccess / exactOptionalPropertyTypes 全开
- 每个 task 完成后 commit，commit message 用中文（per CLAUDE.md）
- 频繁小步提交，不要把多个 task 攒一个 commit

---

## 总任务清单（28 个）

| # | 阶段 | 任务 |
|---|---|---|
| 1 | M1 | 安装 pnpm，初始化根 `package.json` + `pnpm-workspace.yaml` |
| 2 | M1 | 创建 `tsconfig.base.json` |
| 3 | M1 | 配置 ESLint + Prettier |
| 4 | M1 | 配置 Vitest（根级） |
| 5 | M1 | 创建 `@cp/game-plane` 子包骨架（package/tsconfig/vite/index.html） |
| 6 | M1 | 写 Hello-World Phaser `main.ts` |
| 7 | M1 | 验证 `pnpm dev:plane` 与 `pnpm build` |
| 8 | M1 | 更新根 `README.md` 工作流说明 |
| 9 | M2 | 创建 `@cp/core` 包骨架 |
| 10 | M2 | `math/`：`clamp / lerp / rand / randInt` |
| 11 | M2 | `math/`：`SeededRNG` 决定性随机 |
| 12 | M2 | `math/`：`hits` AABB + `easeOutQuad` |
| 13 | M2 | `save/`：`defineStore` 基础读写 + namespace 隔离 |
| 14 | M2 | `save/`：版本迁移 + JSON 损坏回退 |
| 15 | M2 | `input/`：`InputMap` 键盘 `isDown / justPressed` |
| 16 | M2 | `input/`：手柄按钮映射 |
| 17 | M2 | `assets/`：`AssetManifest` 类型 + 加载辅助 |
| 18 | M2 | `audio/`：`AudioBank` 包 Phaser sound |
| 19 | M2 | `ui/`：`Button` |
| 20 | M2 | `ui/`：`Bar` + `Dialog` + `HudPanel` |
| 21 | M2 | `scenes/`：`BootScene` |
| 22 | M2 | `scenes/`：`TitleScene` + `PauseOverlay` + `GameOverScene` + 包总出口 |
| 23 | M3 | 创建 `@cp/marble-sim` 包骨架 + `types.ts` |
| 24 | M3 | `World` + 重力积分 + `step()` + `snapshot()` |
| 25 | M3 | `Obstacle` + 圆-圆弹性碰撞（对称性 / 能量守恒） |
| 26 | M3 | `Sweep`（转动臂）+ 圆-线段碰撞 |
| 27 | M3 | `Pipe`（管道）+ 圆-墙反弹 |
| 28 | M3 | `Zone` + `Launcher` + `presets` |

---

# M1 — 脚手架就位

## Task 1: 安装 pnpm + 根 package.json + workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`（追加 node_modules / dist / .vitest）

- [ ] **Step 1: 安装 pnpm（全局）**

```powershell
npm install -g pnpm@9
pnpm --version   # 期望输出 9.x
```

- [ ] **Step 2: 创建根 `package.json`**

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

- [ ] **Step 3: 创建 `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
  - 'games/*'
```

- [ ] **Step 4: 追加 `.gitignore`**

```
node_modules/
dist/
.vitest/
*.log
.DS_Store
```

- [ ] **Step 5: 验证安装**

```powershell
pnpm install
# 期望：无错误，生成 node_modules 与 pnpm-lock.yaml
```

- [ ] **Step 6: Commit**

```powershell
git add package.json pnpm-workspace.yaml .gitignore pnpm-lock.yaml
git commit -m "M1-1 初始化 pnpm monorepo 工作区"
```

---

## Task 2: tsconfig.base.json

**Files:**
- Create: `tsconfig.base.json`

- [ ] **Step 1: 写 base 配置**

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

- [ ] **Step 2: 验证 TypeScript 自身可用**

```powershell
pnpm exec tsc --version  # 期望 Version 5.5.x
```

- [ ] **Step 3: Commit**

```powershell
git add tsconfig.base.json
git commit -m "M1-2 添加 tsconfig 基础配置（strict 全开）"
```

---

## Task 3: ESLint + Prettier

> **注：** ESLint v9 已经弃用 `.eslintrc.*` 与 `.eslintignore`，使用 flat config（`eslint.config.cjs`），ignore 规则迁移到 `ignores` 字段。规则内容等价。

**Files:**
- Create: `eslint.config.cjs`
- Create: `.prettierrc.cjs`
- Modify: `package.json`（lint 脚本改为 v9 API）

- [ ] **Step 1: 写 `eslint.config.cjs`（flat config）**

```js
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
    {
        ignores: ['dist/**', 'node_modules/**', 'plane/**', 'marble/**', '**/*.cjs']
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaVersion: 2022, sourceType: 'module' }
        },
        plugins: { '@typescript-eslint': tsPlugin },
        rules: {
            ...tsPlugin.configs.recommended.rules, // 等价原 v8 extends: ['plugin:@typescript-eslint/recommended']
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'warn',
            '@typescript-eslint/no-floating-promises': 'error',
            eqeqeq: 'error',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            curly: ['error', 'multi-line']
        }
    }
];
```

- [ ] **Step 2: 写 `.prettierrc.cjs`**

```js
module.exports = {
    tabWidth: 4,
    useTabs: false,
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
    arrowParens: 'always'
};
```

- [ ] **Step 3: 更新 `package.json` 的 lint 脚本（ESLint v9 不再支持 `--ext`）**

把 `"lint": "eslint . --ext .ts"` 改为：

```jsonc
"lint": "eslint \"**/*.ts\" --no-error-on-unmatched-pattern"
```

- [ ] **Step 4: 验证 lint 在空工作区可跑**

```powershell
pnpm lint
# 期望：exit 0
```

- [ ] **Step 5: Commit**

```powershell
git add eslint.config.cjs .prettierrc.cjs package.json
git commit -m "M1-3 配置 ESLint 与 Prettier"
```

---

## Task 4: Vitest 根配置

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: 写 Vitest 配置**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['packages/*/tests/**/*.test.ts', 'games/*/tests/**/*.test.ts'],
        coverage: { provider: 'v8', reporter: ['text', 'html'] }
    }
});
```

- [ ] **Step 2: 验证 vitest 启动（暂时无测试，应当 0 passed 0 failed）**

```powershell
pnpm test
# 期望：No test files found, exiting with code 0（vitest 默认 passWithNoTests=false，可先忽略 exit code）
```

- [ ] **Step 3: Commit**

```powershell
git add vitest.config.ts
git commit -m "M1-4 配置 Vitest 测试运行器"
```

---

## Task 5: @cp/game-plane 子包骨架

**Files:**
- Create: `games/plane/package.json`
- Create: `games/plane/tsconfig.json`
- Create: `games/plane/vite.config.ts`
- Create: `games/plane/index.html`
- Create: `games/plane/src/.gitkeep`

- [ ] **Step 1: `games/plane/package.json`**

```jsonc
{
    "name": "@cp/game-plane",
    "private": true,
    "version": "0.0.0",
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "tsc -b && vite build",
        "typecheck": "tsc --noEmit"
    },
    "dependencies": {
        "phaser": "^3.80"
    },
    "devDependencies": {
        "vite": "^5",
        "typescript": "^5.5"
    }
}
```

- [ ] **Step 2: `games/plane/tsconfig.json`**

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

- [ ] **Step 3: `games/plane/vite.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    server: { port: 5173, open: true },
    build: { target: 'es2022', sourcemap: true },
    resolve: { alias: { '@': '/src' } }
});
```

- [ ] **Step 4: `games/plane/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <title>雷霆战机 · M1 脚手架</title>
    <style>
        html, body { margin: 0; padding: 0; background: #000; height: 100%; }
        #game { display: block; margin: 0 auto; }
    </style>
</head>
<body>
    <div id="game"></div>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: 占位 `src/.gitkeep`**

```powershell
New-Item -ItemType File -Path games/plane/src/.gitkeep -Force
```

- [ ] **Step 6: 安装依赖**

```powershell
pnpm install
# 期望：phaser / vite 进入 games/plane/node_modules 软链
```

- [ ] **Step 7: Commit**

```powershell
git add games/plane
git commit -m "M1-5 创建 @cp/game-plane 子包骨架"
```

---

## Task 6: Hello-World Phaser main.ts

**Files:**
- Create: `games/plane/src/main.ts`

- [ ] **Step 1: 写最小可运行 Phaser 场景**

```ts
import Phaser from 'phaser';

class HelloScene extends Phaser.Scene {
    constructor() {
        super('hello');
    }

    create(): void {
        const { width, height } = this.scale;
        this.add
            .text(width / 2, height / 2, 'Phaser 已就位 · M1 OK', {
                fontFamily: 'monospace',
                fontSize: '32px',
                color: '#7df9ff'
            })
            .setOrigin(0.5);

        this.cameras.main.setBackgroundColor('#020617');
    }
}

new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#020617',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [HelloScene]
});
```

- [ ] **Step 2: typecheck**

```powershell
pnpm --filter @cp/game-plane typecheck
# 期望：无 error
```

- [ ] **Step 3: Commit**

```powershell
git add games/plane/src/main.ts
git commit -m "M1-6 plane 子包 Hello-World Phaser 场景"
```

---

## Task 7: 验证 dev 与 build

**Files:** 无新增，全部为命令验证

- [ ] **Step 1: 启动 dev server（在另一个终端跑，看到 1280×720 黑底青字即成功）**

```powershell
pnpm dev:plane
# 浏览器自动打开 http://localhost:5173/
# 期望：看到「Phaser 已就位 · M1 OK」文字
# 验证后 Ctrl+C 关闭
```

- [ ] **Step 2: 生产构建**

```powershell
pnpm build
# 期望：games/plane/dist/index.html + assets/*.js 生成，无 error
```

- [ ] **Step 3: 本地静态服务预览**

```powershell
pnpm exec vite preview --config games/plane/vite.config.ts
# 期望：http://localhost:4173/ 同样能看到 Hello 文字
# 验证后 Ctrl+C 关闭
```

- [ ] **Step 4: Commit（仅 dist 不入库；只补一次确认）**

```powershell
# 此 task 无文件变更，跳过 commit，进入下一任务
```

---

## Task 8: 根 README 工作流

**Files:**
- Modify: `README.md`（若不存在则创建）

- [ ] **Step 1: 检查根 README**

```powershell
Test-Path README.md
```

- [ ] **Step 2: 创建或覆盖根 `README.md`（不动 `plane/README.md`）**

```markdown
# claude_projects

多游戏公共引擎仓库（重构中）。

- `packages/core/` — 共享引擎 `@cp/core`（scenes / ui / audio / save / input / math / assets）
- `packages/marble-sim/` — 弹珠纯仿真包 `@cp/marble-sim`
- `games/plane/` — 雷霆战机（新版，基于 Phaser 3）
- `games/marble/` — 弹珠模拟器（新版）
- `plane/` / `marble/` — 旧版（保留作对比基线，请勿改动）
- `docs/superpowers/specs/2026-05-15-architecture-design.md` — 架构设计依据
- `docs/superpowers/plans/` — 实施计划

## 常用命令

| 命令 | 作用 |
|---|---|
| `pnpm install` | 安装所有子包依赖 |
| `pnpm dev:plane` | 启动雷霆战机 dev server（5173） |
| `pnpm dev:marble` | 启动弹珠模拟器 dev server |
| `pnpm build` | 全部子包生产构建 |
| `pnpm test` | 跑 vitest 全量测试 |
| `pnpm test:watch` | 测试 watch 模式 |
| `pnpm typecheck` | 全部子包类型检查 |
| `pnpm lint` | ESLint 全量检查 |
| `pnpm format` | Prettier 格式化全部文件 |

## 加一个新游戏

参见 `docs/superpowers/specs/2026-05-15-architecture-design.md` §5.9。
```

- [ ] **Step 3: Commit**

```powershell
git add README.md
git commit -m "M1-8 根 README 写入工作流命令说明"
```

---

# M1 验收

跑完 8 个任务后，确认：

- [ ] `pnpm dev:plane` 能看到 Hello 文字
- [ ] `pnpm build` 0 error
- [ ] `pnpm typecheck` 0 error
- [ ] `pnpm lint` 0 error
- [ ] `pnpm test` 0 test files（暂无测试，正常）
- [ ] 旧 `plane/` / `marble/` 目录未动

---

# M2 — `@cp/core` 包成型

> **顺序说明：** 按"叶子优先"顺序填模块。先做无依赖的 math / save / input / assets，再做依赖 Phaser 的 audio / ui / scenes。每个 task 完成立刻 commit。

## Task 9: @cp/core 包骨架

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/tests/.gitkeep`

- [ ] **Step 1: `packages/core/package.json`**

```jsonc
{
    "name": "@cp/core",
    "version": "0.0.0",
    "type": "module",
    "main": "./src/index.ts",
    "types": "./src/index.ts",
    "scripts": {
        "typecheck": "tsc --noEmit"
    },
    "peerDependencies": {
        "phaser": "^3.80"
    },
    "devDependencies": {
        "typescript": "^5.5",
        "phaser": "^3.80"
    }
}
```

- [ ] **Step 2: `packages/core/tsconfig.json`**

```jsonc
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "outDir": "dist",
        "rootDir": "src",
        "composite": true
    },
    "include": ["src"]
}
```

- [ ] **Step 3: 占位 `src/index.ts`**

```ts
export {};
```

- [ ] **Step 4: 把 `@cp/core` 加入 plane 子包依赖（便于后续 import）**

修改 `games/plane/package.json` 的 `dependencies`：

```jsonc
{
    "dependencies": {
        "phaser": "^3.80",
        "@cp/core": "workspace:*"
    }
}
```

- [ ] **Step 5: 安装**

```powershell
pnpm install
```

- [ ] **Step 6: Commit**

```powershell
git add packages/core games/plane/package.json
git commit -m "M2-9 创建 @cp/core 包骨架并接入 plane 依赖"
```

---

## Task 10: math/ — clamp / lerp / rand / randInt

**Files:**
- Create: `packages/core/src/math/index.ts`
- Create: `packages/core/tests/math.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/core/tests/math.test.ts
import { describe, it, expect } from 'vitest';
import { clamp, lerp, rand, randInt } from '../src/math/index.js';

describe('math/clamp', () => {
    it('限制下界', () => expect(clamp(-1, 0, 10)).toBe(0));
    it('限制上界', () => expect(clamp(99, 0, 10)).toBe(10));
    it('区间内不变', () => expect(clamp(5, 0, 10)).toBe(5));
    it('min == max 时返回该值', () => expect(clamp(99, 3, 3)).toBe(3));
});

describe('math/lerp', () => {
    it('t=0 返回 a', () => expect(lerp(10, 20, 0)).toBe(10));
    it('t=1 返回 b', () => expect(lerp(10, 20, 1)).toBe(20));
    it('t=0.5 取中点', () => expect(lerp(10, 20, 0.5)).toBe(15));
    it('外推 t>1', () => expect(lerp(0, 10, 2)).toBe(20));
});

describe('math/rand', () => {
    it('落在区间内', () => {
        for (let i = 0; i < 100; i++) {
            const v = rand(1, 2);
            expect(v).toBeGreaterThanOrEqual(1);
            expect(v).toBeLessThan(2);
        }
    });
});

describe('math/randInt', () => {
    it('返回整数', () => {
        for (let i = 0; i < 100; i++) {
            expect(Number.isInteger(randInt(0, 5))).toBe(true);
        }
    });
    it('包含上下界', () => {
        const seen = new Set<number>();
        for (let i = 0; i < 2000; i++) seen.add(randInt(0, 3));
        expect(seen).toEqual(new Set([0, 1, 2, 3]));
    });
});
```

- [ ] **Step 2: 跑测试看到失败**

```powershell
pnpm test
# 期望：FAIL，找不到 ../src/math/index.js
```

- [ ] **Step 3: 实现**

```ts
// packages/core/src/math/index.ts
export function clamp(v: number, min: number, max: number): number {
    if (v < min) return min;
    if (v > max) return max;
    return v;
}

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export function rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min + 1));
}
```

- [ ] **Step 4: 跑测试看到通过**

```powershell
pnpm test
# 期望：PASS, 11 passed
```

- [ ] **Step 5: Commit**

```powershell
git add packages/core/src/math packages/core/tests/math.test.ts
git commit -m "M2-10 core/math 添加 clamp/lerp/rand/randInt"
```

---

## Task 11: math/ — SeededRNG 决定性随机

**Files:**
- Modify: `packages/core/src/math/index.ts`
- Modify: `packages/core/tests/math.test.ts`

- [ ] **Step 1: 追加失败测试**

```ts
// 追加到 packages/core/tests/math.test.ts 末尾
import { SeededRNG } from '../src/math/index.js';

describe('math/SeededRNG', () => {
    it('同 seed 产出相同序列', () => {
        const a = new SeededRNG(42);
        const b = new SeededRNG(42);
        for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
    });

    it('不同 seed 产出不同序列', () => {
        const a = new SeededRNG(1);
        const b = new SeededRNG(2);
        expect(a.next()).not.toBe(b.next());
    });

    it('next() 落在 [0,1)', () => {
        const rng = new SeededRNG(7);
        for (let i = 0; i < 1000; i++) {
            const v = rng.next();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it('range(a,b) 落在区间且决定性', () => {
        const r1 = new SeededRNG(123);
        const r2 = new SeededRNG(123);
        for (let i = 0; i < 20; i++) expect(r1.range(10, 20)).toBe(r2.range(10, 20));
    });
});
```

- [ ] **Step 2: 跑测试看到失败**

```powershell
pnpm test
# 期望：FAIL，SeededRNG not exported
```

- [ ] **Step 3: 实现（Mulberry32，32 位足够游戏用）**

```ts
// 追加到 packages/core/src/math/index.ts
export class SeededRNG {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
    }

    next(): number {
        this.state = (this.state + 0x6d2b79f5) >>> 0;
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
}
```

- [ ] **Step 4: 跑测试通过**

```powershell
pnpm test
# 期望：PASS
```

- [ ] **Step 5: Commit**

```powershell
git add packages/core/src/math/index.ts packages/core/tests/math.test.ts
git commit -m "M2-11 core/math 添加 SeededRNG 决定性随机"
```

---

## Task 12: math/ — hits AABB + easeOutQuad

**Files:**
- Modify: `packages/core/src/math/index.ts`
- Modify: `packages/core/tests/math.test.ts`

- [ ] **Step 1: 追加失败测试**

```ts
// 追加到 packages/core/tests/math.test.ts
import { hits, easeOutQuad } from '../src/math/index.js';

describe('math/hits AABB', () => {
    const box = { x: 0, y: 0, w: 10, h: 10 };
    it('相交返回 true', () => {
        expect(hits(box, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    });
    it('完全不相交返回 false', () => {
        expect(hits(box, { x: 20, y: 20, w: 5, h: 5 })).toBe(false);
    });
    it('边缘相接返回 false（半开区间）', () => {
        expect(hits(box, { x: 10, y: 0, w: 5, h: 10 })).toBe(false);
    });
});

describe('math/easeOutQuad', () => {
    it('t=0 -> 0', () => expect(easeOutQuad(0)).toBe(0));
    it('t=1 -> 1', () => expect(easeOutQuad(1)).toBe(1));
    it('单调递增', () => {
        let prev = -Infinity;
        for (let i = 0; i <= 100; i++) {
            const v = easeOutQuad(i / 100);
            expect(v).toBeGreaterThanOrEqual(prev);
            prev = v;
        }
    });
});
```

- [ ] **Step 2: 跑测试看到失败**

```powershell
pnpm test
```

- [ ] **Step 3: 实现**

```ts
// 追加到 packages/core/src/math/index.ts
export interface AABB {
    x: number;
    y: number;
    w: number;
    h: number;
}

export function hits(a: AABB, b: AABB): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
}
```

- [ ] **Step 4: 跑测试通过**

```powershell
pnpm test
```

- [ ] **Step 5: Commit**

```powershell
git add packages/core/src/math packages/core/tests/math.test.ts
git commit -m "M2-12 core/math 添加 AABB hits 与 easeOutQuad"
```

---

## Task 13: save/ — defineStore 基础读写

**Files:**
- Create: `packages/core/src/save/index.ts`
- Create: `packages/core/tests/save.test.ts`

- [ ] **Step 1: 改 vitest 环境为可用 localStorage（happy-dom）**

修改 `vitest.config.ts`，把 `environment: 'node'` 改成：

```ts
environment: 'happy-dom'
```

并在根 `package.json` devDependencies 加上 `"happy-dom": "^15"`，运行 `pnpm install`。

- [ ] **Step 2: 写失败测试**

```ts
// packages/core/tests/save.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { defineStore } from '../src/save/index.js';

beforeEach(() => localStorage.clear());

describe('save/defineStore', () => {
    it('未写入时返回 defaults', () => {
        const store = defineStore('test', 1, { hp: 100, name: 'p' });
        const v = store.read();
        expect(v.hp).toBe(100);
        expect(v.name).toBe('p');
    });

    it('写入后能读回', () => {
        const store = defineStore('test', 1, { hp: 100 });
        store.write({ hp: 42 });
        expect(store.read().hp).toBe(42);
    });

    it('不同 namespace 互不干扰', () => {
        const a = defineStore('a', 1, { v: 1 });
        const b = defineStore('b', 1, { v: 2 });
        a.write({ v: 9 });
        expect(b.read().v).toBe(2);
    });
});
```

- [ ] **Step 3: 跑测试看失败**

```powershell
pnpm test
```

- [ ] **Step 4: 实现**

```ts
// packages/core/src/save/index.ts
export interface Store<T> {
    read(): T;
    write(value: T): void;
    clear(): void;
}

export function defineStore<T extends Record<string, unknown>>(
    namespace: string,
    version: number,
    defaults: T
): Store<T> {
    const key = `cp:${namespace}`;

    return {
        read(): T {
            const raw = localStorage.getItem(key);
            if (raw === null) return { ...defaults };
            try {
                const parsed = JSON.parse(raw) as T & { __v?: number };
                if (parsed.__v !== version) return { ...defaults };
                const { __v: _v, ...rest } = parsed;
                return { ...defaults, ...(rest as T) };
            } catch {
                return { ...defaults };
            }
        },
        write(value: T): void {
            localStorage.setItem(key, JSON.stringify({ ...value, __v: version }));
        },
        clear(): void {
            localStorage.removeItem(key);
        }
    };
}
```

- [ ] **Step 5: 跑测试通过**

```powershell
pnpm test
```

- [ ] **Step 6: Commit**

```powershell
git add packages/core/src/save packages/core/tests/save.test.ts vitest.config.ts package.json pnpm-lock.yaml
git commit -m "M2-13 core/save 添加 defineStore 基础读写"
```

---

## Task 14: save/ — 版本迁移 + JSON 损坏回退

**Files:**
- Modify: `packages/core/tests/save.test.ts`

- [ ] **Step 1: 追加失败测试**

```ts
describe('save/defineStore 版本与回退', () => {
    it('版本错配返回 defaults', () => {
        localStorage.setItem('cp:t', JSON.stringify({ hp: 99, __v: 1 }));
        const store = defineStore('t', 2, { hp: 100 });
        expect(store.read().hp).toBe(100);
    });

    it('JSON 损坏返回 defaults', () => {
        localStorage.setItem('cp:t', '{not json');
        const store = defineStore('t', 1, { hp: 100 });
        expect(store.read().hp).toBe(100);
    });

    it('写入时附带版本号', () => {
        const store = defineStore('t', 3, { hp: 100 });
        store.write({ hp: 50 });
        const raw = JSON.parse(localStorage.getItem('cp:t')!);
        expect(raw.__v).toBe(3);
    });

    it('clear 后回到 defaults', () => {
        const store = defineStore('t', 1, { hp: 100 });
        store.write({ hp: 1 });
        store.clear();
        expect(store.read().hp).toBe(100);
    });
});
```

- [ ] **Step 2: 跑测试（应当全 PASS——上一任务的实现已经覆盖这些路径）**

```powershell
pnpm test
# 若有 FAIL：检查 try/catch 与 __v 比较逻辑
```

- [ ] **Step 3: Commit**

```powershell
git add packages/core/tests/save.test.ts
git commit -m "M2-14 core/save 单测覆盖版本回退与 JSON 损坏"
```

---

## Task 15: input/ — InputMap 键盘

**Files:**
- Create: `packages/core/src/input/index.ts`
- Create: `packages/core/tests/input.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/core/tests/input.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { InputMap } from '../src/input/index.js';

type A = 'fire' | 'left' | 'right';

function fakeKb(): {
    isDown(code: string): boolean;
    press(code: string): void;
    release(code: string): void;
} {
    const down = new Set<string>();
    return {
        isDown: (c) => down.has(c),
        press: (c) => down.add(c),
        release: (c) => down.delete(c)
    };
}

describe('input/InputMap 键盘', () => {
    let kb: ReturnType<typeof fakeKb>;
    let map: InputMap<A>;

    beforeEach(() => {
        kb = fakeKb();
        map = new InputMap<A>({ isKeyDown: kb.isDown });
        map.bindKey('fire', 'Space', 'KeyJ');
        map.bindKey('left', 'ArrowLeft', 'KeyA');
        map.bindKey('right', 'ArrowRight', 'KeyD');
    });

    it('未按键 isDown 为 false', () => {
        expect(map.isDown('fire')).toBe(false);
    });

    it('按下任一绑定键 isDown 为 true', () => {
        kb.press('KeyJ');
        expect(map.isDown('fire')).toBe(true);
    });

    it('justPressed 单帧边沿仅触发一次', () => {
        kb.press('Space');
        map.tick();
        expect(map.justPressed('fire')).toBe(true);
        map.tick();
        expect(map.justPressed('fire')).toBe(false);
    });

    it('松开后再按下又触发一次 justPressed', () => {
        kb.press('Space');
        map.tick();
        kb.release('Space');
        map.tick();
        kb.press('Space');
        map.tick();
        expect(map.justPressed('fire')).toBe(true);
    });
});
```

- [ ] **Step 2: 跑测试看失败**

```powershell
pnpm test
```

- [ ] **Step 3: 实现**

```ts
// packages/core/src/input/index.ts
export interface InputSource {
    isKeyDown(code: string): boolean;
}

export class InputMap<A extends string = string> {
    private keys = new Map<A, string[]>();
    private gamepad = new Map<A, number[]>();
    private prevDown = new Map<A, boolean>();
    private nowDown = new Map<A, boolean>();
    private gpQuery: ((button: number) => boolean) | null = null;

    constructor(private readonly source: InputSource) {}

    bindKey(action: A, ...codes: string[]): void {
        this.keys.set(action, [...(this.keys.get(action) ?? []), ...codes]);
    }

    bindGamepad(action: A, button: number): void {
        this.gamepad.set(action, [...(this.gamepad.get(action) ?? []), button]);
    }

    setGamepadQuery(q: (button: number) => boolean): void {
        this.gpQuery = q;
    }

    isDown(action: A): boolean {
        const codes = this.keys.get(action);
        if (codes) for (const c of codes) if (this.source.isKeyDown(c)) return true;
        const buttons = this.gamepad.get(action);
        if (buttons && this.gpQuery) for (const b of buttons) if (this.gpQuery(b)) return true;
        return false;
    }

    justPressed(action: A): boolean {
        return this.nowDown.get(action) === true && this.prevDown.get(action) !== true;
    }

    tick(): void {
        for (const k of new Set([...this.keys.keys(), ...this.gamepad.keys()])) {
            this.prevDown.set(k, this.nowDown.get(k) ?? false);
            this.nowDown.set(k, this.isDown(k));
        }
    }
}
```

- [ ] **Step 4: 跑测试通过**

```powershell
pnpm test
```

- [ ] **Step 5: Commit**

```powershell
git add packages/core/src/input packages/core/tests/input.test.ts
git commit -m "M2-15 core/input 添加 InputMap 键盘绑定与单帧边沿"
```

---

## Task 16: input/ — 手柄按钮

**Files:**
- Modify: `packages/core/tests/input.test.ts`

- [ ] **Step 1: 追加失败测试**

```ts
describe('input/InputMap 手柄', () => {
    it('手柄按钮按下时 isDown 为 true', () => {
        const map = new InputMap<'fire'>({ isKeyDown: () => false });
        map.bindGamepad('fire', 0);
        const buttons = new Set<number>();
        map.setGamepadQuery((b) => buttons.has(b));

        expect(map.isDown('fire')).toBe(false);
        buttons.add(0);
        expect(map.isDown('fire')).toBe(true);
    });

    it('键盘或手柄任一触发都算 down', () => {
        const downKeys = new Set<string>();
        const map = new InputMap<'jump'>({ isKeyDown: (c) => downKeys.has(c) });
        map.bindKey('jump', 'Space');
        map.bindGamepad('jump', 1);
        const buttons = new Set<number>();
        map.setGamepadQuery((b) => buttons.has(b));

        expect(map.isDown('jump')).toBe(false);
        downKeys.add('Space');
        expect(map.isDown('jump')).toBe(true);
        downKeys.delete('Space');
        buttons.add(1);
        expect(map.isDown('jump')).toBe(true);
    });
});
```

- [ ] **Step 2: 跑测试（上一任务已实现 gamepad 路径，应当 PASS）**

```powershell
pnpm test
```

- [ ] **Step 3: Commit**

```powershell
git add packages/core/tests/input.test.ts
git commit -m "M2-16 core/input 单测覆盖手柄按钮与多源合并"
```

---

## Task 17: assets/ — AssetManifest 类型与加载辅助

**Files:**
- Create: `packages/core/src/assets/index.ts`
- Create: `packages/core/tests/assets.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/core/tests/assets.test.ts
import { describe, it, expect, vi } from 'vitest';
import { applyManifest, type AssetManifest } from '../src/assets/index.js';

describe('assets/applyManifest', () => {
    it('按 manifest 调用 Phaser loader 对应方法', () => {
        const loader = {
            image: vi.fn(),
            spritesheet: vi.fn(),
            audio: vi.fn()
        };
        const manifest: AssetManifest = {
            images: [{ key: 'hero', url: 'a.png' }],
            spritesheets: [{ key: 'enemy', url: 'b.png', frameW: 32, frameH: 32 }],
            audio: [{ key: 'sfx-fire', urls: ['c.mp3'] }]
        };

        applyManifest(loader as never, manifest);

        expect(loader.image).toHaveBeenCalledWith('hero', 'a.png');
        expect(loader.spritesheet).toHaveBeenCalledWith('enemy', 'b.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        expect(loader.audio).toHaveBeenCalledWith('sfx-fire', ['c.mp3']);
    });

    it('空 manifest 不抛错', () => {
        const loader = { image: vi.fn(), spritesheet: vi.fn(), audio: vi.fn() };
        expect(() => applyManifest(loader as never, {})).not.toThrow();
    });
});
```

- [ ] **Step 2: 跑测试看失败**

```powershell
pnpm test
```

- [ ] **Step 3: 实现**

```ts
// packages/core/src/assets/index.ts
export interface AssetManifest {
    images?: Array<{ key: string; url: string }>;
    spritesheets?: Array<{ key: string; url: string; frameW: number; frameH: number }>;
    audio?: Array<{ key: string; urls: string[] }>;
    fonts?: Array<{ family: string; url: string }>;
}

export interface LoaderLike {
    image(key: string, url: string): unknown;
    spritesheet(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown;
    audio(key: string, urls: string[]): unknown;
}

export function applyManifest(loader: LoaderLike, manifest: AssetManifest): void {
    for (const m of manifest.images ?? []) loader.image(m.key, m.url);
    for (const m of manifest.spritesheets ?? []) {
        loader.spritesheet(m.key, m.url, { frameWidth: m.frameW, frameHeight: m.frameH });
    }
    for (const m of manifest.audio ?? []) loader.audio(m.key, m.urls);
}
```

- [ ] **Step 4: 跑测试通过**

```powershell
pnpm test
```

- [ ] **Step 5: Commit**

```powershell
git add packages/core/src/assets packages/core/tests/assets.test.ts
git commit -m "M2-17 core/assets 添加 AssetManifest 类型与 applyManifest"
```

---

## Task 18: audio/ — AudioBank

**Files:**
- Create: `packages/core/src/audio/index.ts`
- Create: `packages/core/tests/audio.test.ts`

> **注：** AudioBank 包 Phaser sound，单测用伪 scene。Phaser 真实行为靠人工跑 dev 验证。

- [ ] **Step 1: 写失败测试**

```ts
// packages/core/tests/audio.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AudioBank } from '../src/audio/index.js';

function makeFakeScene() {
    const sounds = new Map<string, { stop: ReturnType<typeof vi.fn>; setRate?: ReturnType<typeof vi.fn>; setVolume?: ReturnType<typeof vi.fn> }>();
    return {
        sounds,
        sound: {
            add: vi.fn((key: string) => {
                const obj = {
                    play: vi.fn(),
                    stop: vi.fn(),
                    setRate: vi.fn(),
                    setVolume: vi.fn()
                };
                sounds.set(key, obj);
                return obj;
            }),
            removeByKey: vi.fn()
        }
    };
}

describe('audio/AudioBank', () => {
    it('play 不存在的 key 会先 add 再 play', () => {
        const scene = makeFakeScene();
        const bank = new AudioBank(scene as never);
        bank.play('sfx-fire');
        expect(scene.sound.add).toHaveBeenCalledWith('sfx-fire');
    });

    it('mute=true 时 play 被静音（音量 0）', () => {
        const scene = makeFakeScene();
        const bank = new AudioBank(scene as never, { volume: 0.8 });
        bank.setMuted(true);
        bank.play('sfx-fire');
        const obj = scene.sounds.get('sfx-fire')!;
        expect(obj.setVolume).toHaveBeenCalledWith(0);
    });

    it('setMasterVolume 改写后续 play 音量', () => {
        const scene = makeFakeScene();
        const bank = new AudioBank(scene as never);
        bank.setMasterVolume(0.3);
        bank.play('sfx-fire');
        const obj = scene.sounds.get('sfx-fire')!;
        expect(obj.setVolume).toHaveBeenCalledWith(0.3);
    });
});
```

- [ ] **Step 2: 跑测试看失败**

```powershell
pnpm test
```

- [ ] **Step 3: 实现**

```ts
// packages/core/src/audio/index.ts
import type Phaser from 'phaser';

interface SoundLike {
    play(config?: { rate?: number; volume?: number; loop?: boolean }): void;
    stop(): void;
    setRate(rate: number): void;
    setVolume(volume: number): void;
}

interface SceneLike {
    sound: {
        add(key: string): SoundLike;
        removeByKey(key: string): void;
    };
}

export interface AudioBankDefaults {
    volume?: number;
}

export interface PlayOpts {
    rate?: number;
    volume?: number;
    loop?: boolean;
}

export class AudioBank {
    private cache = new Map<string, SoundLike>();
    private masterVolume: number;
    private muted = false;

    constructor(private scene: SceneLike | Phaser.Scene, defaults?: AudioBankDefaults) {
        this.masterVolume = defaults?.volume ?? 1;
    }

    play(key: string, opts: PlayOpts = {}): void {
        let s = this.cache.get(key);
        if (!s) {
            s = (this.scene as SceneLike).sound.add(key);
            this.cache.set(key, s);
        }
        const v = this.muted ? 0 : (opts.volume ?? this.masterVolume);
        s.setVolume(v);
        if (opts.rate !== undefined) s.setRate(opts.rate);
        s.play({ loop: opts.loop ?? false });
    }

    stop(key: string): void {
        this.cache.get(key)?.stop();
    }

    setMasterVolume(v: number): void {
        this.masterVolume = v;
    }

    setMuted(m: boolean): void {
        this.muted = m;
    }
}
```

- [ ] **Step 4: 跑测试通过**

```powershell
pnpm test
```

- [ ] **Step 5: Commit**

```powershell
git add packages/core/src/audio packages/core/tests/audio.test.ts
git commit -m "M2-18 core/audio 添加 AudioBank 音量与静音管理"
```

---

## Task 19: ui/ — Button

**Files:**
- Create: `packages/core/src/ui/theme.ts`
- Create: `packages/core/src/ui/Button.ts`
- Create: `packages/core/tests/ui.test.ts`

> **注：** UI 控件依赖 Phaser DisplayList，跑 happy-dom 单测无法实例化真实 Phaser.Scene。这里只做"导出+类型"冒烟测试，视觉靠人工跑 dev。

- [ ] **Step 1: 写冒烟测试**

```ts
// packages/core/tests/ui.test.ts
import { describe, it, expect } from 'vitest';
import { Button } from '../src/ui/Button.js';
import { DEFAULT_THEME } from '../src/ui/theme.js';

describe('ui/Button 导出与默认主题', () => {
    it('Button 是 class', () => {
        expect(typeof Button).toBe('function');
    });
    it('默认主题含主色/次色/危险色', () => {
        expect(DEFAULT_THEME.primary).toMatch(/^0x|^#/);
        expect(DEFAULT_THEME.secondary).toBeDefined();
        expect(DEFAULT_THEME.danger).toBeDefined();
    });
});
```

- [ ] **Step 2: 实现**

```ts
// packages/core/src/ui/theme.ts
export interface Theme {
    primary: string;
    secondary: string;
    danger: string;
    text: string;
    bg: string;
    fontFamily: string;
}

export const DEFAULT_THEME: Theme = {
    primary: '#7df9ff',
    secondary: '#9d4edd',
    danger: '#ff5577',
    text: '#e6f1ff',
    bg: '#020617',
    fontFamily: 'monospace'
};
```

```ts
// packages/core/src/ui/Button.ts
import Phaser from 'phaser';
import { DEFAULT_THEME, type Theme } from './theme.js';

export interface ButtonOpts {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    onClick: () => void;
    theme?: Theme;
}

export class Button extends Phaser.GameObjects.Container {
    private bg: Phaser.GameObjects.Rectangle;
    private label: Phaser.GameObjects.Text;
    private theme: Theme;

    constructor(scene: Phaser.Scene, opts: ButtonOpts) {
        super(scene, opts.x, opts.y);
        this.theme = opts.theme ?? DEFAULT_THEME;

        this.bg = scene.add
            .rectangle(0, 0, opts.w, opts.h, Phaser.Display.Color.HexStringToColor(this.theme.bg).color)
            .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(this.theme.primary).color);

        this.label = scene.add
            .text(0, 0, opts.label, {
                fontFamily: this.theme.fontFamily,
                fontSize: '20px',
                color: this.theme.primary
            })
            .setOrigin(0.5);

        this.add([this.bg, this.label]);
        this.setSize(opts.w, opts.h);
        this.setInteractive({ useHandCursor: true });

        this.on('pointerover', () => this.bg.setFillStyle(Phaser.Display.Color.HexStringToColor(this.theme.primary).color, 0.2));
        this.on('pointerout', () => this.bg.setFillStyle(Phaser.Display.Color.HexStringToColor(this.theme.bg).color));
        this.on('pointerdown', () => opts.onClick());

        scene.add.existing(this);
    }
}
```

- [ ] **Step 3: 跑测试通过**

```powershell
pnpm test
```

- [ ] **Step 4: Commit**

```powershell
git add packages/core/src/ui packages/core/tests/ui.test.ts
git commit -m "M2-19 core/ui 添加 Button 与默认主题"
```

---

## Task 20: ui/ — Bar + Dialog + HudPanel

**Files:**
- Create: `packages/core/src/ui/Bar.ts`
- Create: `packages/core/src/ui/Dialog.ts`
- Create: `packages/core/src/ui/HudPanel.ts`
- Modify: `packages/core/tests/ui.test.ts`

- [ ] **Step 1: 追加冒烟测试**

```ts
import { Bar } from '../src/ui/Bar.js';
import { Dialog } from '../src/ui/Dialog.js';
import { HudPanel } from '../src/ui/HudPanel.js';

describe('ui/导出', () => {
    it('Bar / Dialog / HudPanel 都是 class', () => {
        expect(typeof Bar).toBe('function');
        expect(typeof Dialog).toBe('function');
        expect(typeof HudPanel).toBe('function');
    });
});
```

- [ ] **Step 2: 实现 Bar**

```ts
// packages/core/src/ui/Bar.ts
import Phaser from 'phaser';
import { DEFAULT_THEME, type Theme } from './theme.js';
import { clamp } from '../math/index.js';

export interface BarOpts {
    x: number;
    y: number;
    w: number;
    h: number;
    fill?: string;
    track?: string;
    theme?: Theme;
}

export class Bar extends Phaser.GameObjects.Container {
    private track: Phaser.GameObjects.Rectangle;
    private fill: Phaser.GameObjects.Rectangle;
    private opts: BarOpts;
    private theme: Theme;

    constructor(scene: Phaser.Scene, opts: BarOpts) {
        super(scene, opts.x, opts.y);
        this.opts = opts;
        this.theme = opts.theme ?? DEFAULT_THEME;
        const trackColor = Phaser.Display.Color.HexStringToColor(opts.track ?? this.theme.bg).color;
        const fillColor = Phaser.Display.Color.HexStringToColor(opts.fill ?? this.theme.primary).color;
        this.track = scene.add.rectangle(0, 0, opts.w, opts.h, trackColor).setOrigin(0, 0.5);
        this.fill = scene.add.rectangle(0, 0, opts.w, opts.h, fillColor).setOrigin(0, 0.5);
        this.add([this.track, this.fill]);
        scene.add.existing(this);
    }

    setValue(t: number): void {
        this.fill.width = this.opts.w * clamp(t, 0, 1);
    }
}
```

- [ ] **Step 3: 实现 Dialog**

```ts
// packages/core/src/ui/Dialog.ts
import Phaser from 'phaser';
import { DEFAULT_THEME, type Theme } from './theme.js';

export interface DialogOpts {
    title: string;
    body: string;
    onClose: () => void;
    theme?: Theme;
}

export class Dialog extends Phaser.GameObjects.Container {
    constructor(scene: Phaser.Scene, opts: DialogOpts) {
        const { width: W, height: H } = scene.scale;
        super(scene, W / 2, H / 2);
        const theme = opts.theme ?? DEFAULT_THEME;
        const bg = scene.add.rectangle(0, 0, 520, 280, 0x000000, 0.85).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(theme.primary).color);
        const title = scene.add.text(0, -100, opts.title, { fontFamily: theme.fontFamily, fontSize: '28px', color: theme.primary }).setOrigin(0.5);
        const body = scene.add.text(0, -20, opts.body, { fontFamily: theme.fontFamily, fontSize: '18px', color: theme.text, align: 'center', wordWrap: { width: 480 } }).setOrigin(0.5);
        const close = scene.add.text(0, 100, '[ 确认 ]', { fontFamily: theme.fontFamily, fontSize: '20px', color: theme.primary }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', () => opts.onClose());
        this.add([bg, title, body, close]);
        scene.add.existing(this);
    }
}
```

- [ ] **Step 4: 实现 HudPanel**

```ts
// packages/core/src/ui/HudPanel.ts
import Phaser from 'phaser';

export interface HudPanelOpts {
    x: number;
    y: number;
    direction?: 'row' | 'column';
    gap?: number;
}

export class HudPanel extends Phaser.GameObjects.Container {
    private opts: Required<HudPanelOpts>;

    constructor(scene: Phaser.Scene, opts: HudPanelOpts) {
        super(scene, opts.x, opts.y);
        this.opts = { x: opts.x, y: opts.y, direction: opts.direction ?? 'row', gap: opts.gap ?? 12 };
        scene.add.existing(this);
    }

    addChild(child: Phaser.GameObjects.GameObject): void {
        this.add(child);
        this.relayout();
    }

    private relayout(): void {
        let cursor = 0;
        for (const child of this.list as Phaser.GameObjects.Components.Transform[]) {
            if (this.opts.direction === 'row') {
                child.x = cursor;
                cursor += this.opts.gap;
            } else {
                child.y = cursor;
                cursor += this.opts.gap;
            }
        }
    }
}
```

- [ ] **Step 5: 跑测试通过**

```powershell
pnpm test
```

- [ ] **Step 6: Commit**

```powershell
git add packages/core/src/ui packages/core/tests/ui.test.ts
git commit -m "M2-20 core/ui 添加 Bar / Dialog / HudPanel"
```

---

## Task 21: scenes/ — BootScene

**Files:**
- Create: `packages/core/src/scenes/BootScene.ts`
- Create: `packages/core/tests/scenes.test.ts`

- [ ] **Step 1: 写冒烟测试**

```ts
// packages/core/tests/scenes.test.ts
import { describe, it, expect } from 'vitest';
import { BootScene } from '../src/scenes/BootScene.js';

describe('scenes/BootScene', () => {
    it('是 class，构造不抛错', () => {
        expect(typeof BootScene).toBe('function');
        expect(() => new BootScene({ manifest: {}, next: 'title' })).not.toThrow();
    });
});
```

- [ ] **Step 2: 实现**

```ts
// packages/core/src/scenes/BootScene.ts
import Phaser from 'phaser';
import { applyManifest, type AssetManifest } from '../assets/index.js';

export interface BootSceneOpts {
    manifest: AssetManifest;
    next: string;
}

export class BootScene extends Phaser.Scene {
    private opts: BootSceneOpts;

    constructor(opts: BootSceneOpts) {
        super('boot');
        this.opts = opts;
    }

    preload(): void {
        const { width: W, height: H } = this.scale;
        const bar = this.add.rectangle(W / 2, H / 2, 0, 8, 0x7df9ff).setOrigin(0, 0.5);
        const track = this.add.rectangle(W / 2 - 200, H / 2, 400, 8, 0x222222).setOrigin(0, 0.5);
        track.setDepth(-1);

        this.load.on('progress', (p: number) => {
            bar.x = W / 2 - 200;
            bar.width = 400 * p;
        });

        applyManifest(this.load, this.opts.manifest);
    }

    create(): void {
        this.scene.start(this.opts.next);
    }
}
```

- [ ] **Step 3: 跑测试通过**

```powershell
pnpm test
```

- [ ] **Step 4: Commit**

```powershell
git add packages/core/src/scenes/BootScene.ts packages/core/tests/scenes.test.ts
git commit -m "M2-21 core/scenes 添加 BootScene 资源加载模板"
```

---

## Task 22: scenes/ — Title + Pause + GameOver + 总出口

**Files:**
- Create: `packages/core/src/scenes/TitleScene.ts`
- Create: `packages/core/src/scenes/PauseOverlay.ts`
- Create: `packages/core/src/scenes/GameOverScene.ts`
- Create: `packages/core/src/index.ts`（覆盖 task 9 的占位）
- Modify: `packages/core/tests/scenes.test.ts`

- [ ] **Step 1: 追加冒烟测试**

```ts
import { TitleScene } from '../src/scenes/TitleScene.js';
import { PauseOverlay } from '../src/scenes/PauseOverlay.js';
import { GameOverScene } from '../src/scenes/GameOverScene.js';

describe('scenes/其他模板导出', () => {
    it('TitleScene 是 class', () => expect(typeof TitleScene).toBe('function'));
    it('GameOverScene 是 class', () => expect(typeof GameOverScene).toBe('function'));
    it('PauseOverlay 有 show 静态方法', () => expect(typeof PauseOverlay.show).toBe('function'));
});
```

- [ ] **Step 2: 实现 TitleScene**

```ts
// packages/core/src/scenes/TitleScene.ts
import Phaser from 'phaser';
import { DEFAULT_THEME, type Theme } from '../ui/theme.js';

export interface TitleSceneOpts {
    title: string;
    subtitle?: string;
    theme?: Theme;
    onStart: () => void;
}

export class TitleScene extends Phaser.Scene {
    private opts: TitleSceneOpts;

    constructor(opts: TitleSceneOpts) {
        super('title');
        this.opts = opts;
    }

    create(): void {
        const { width: W, height: H } = this.scale;
        const theme = this.opts.theme ?? DEFAULT_THEME;
        this.cameras.main.setBackgroundColor(theme.bg);

        this.add.text(W / 2, H / 2 - 80, this.opts.title, {
            fontFamily: theme.fontFamily,
            fontSize: '56px',
            color: theme.primary
        }).setOrigin(0.5);

        if (this.opts.subtitle) {
            this.add.text(W / 2, H / 2 - 20, this.opts.subtitle, {
                fontFamily: theme.fontFamily,
                fontSize: '20px',
                color: theme.text
            }).setOrigin(0.5);
        }

        const start = this.add.text(W / 2, H / 2 + 80, '[ 开始 ]', {
            fontFamily: theme.fontFamily,
            fontSize: '28px',
            color: theme.primary
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        start.on('pointerdown', () => this.opts.onStart());
    }
}
```

- [ ] **Step 3: 实现 PauseOverlay**

```ts
// packages/core/src/scenes/PauseOverlay.ts
import Phaser from 'phaser';
import { DEFAULT_THEME, type Theme } from '../ui/theme.js';

export class PauseOverlay {
    static show(scene: Phaser.Scene, opts: { onResume: () => void; onMenu: () => void; theme?: Theme }): Phaser.GameObjects.Container {
        const { width: W, height: H } = scene.scale;
        const theme = opts.theme ?? DEFAULT_THEME;
        const c = scene.add.container(W / 2, H / 2);
        const mask = scene.add.rectangle(0, 0, W, H, 0x000000, 0.7);
        const title = scene.add.text(0, -60, '已暂停', {
            fontFamily: theme.fontFamily,
            fontSize: '40px',
            color: theme.primary
        }).setOrigin(0.5);
        const resume = scene.add.text(0, 10, '[ 继续 ]', {
            fontFamily: theme.fontFamily,
            fontSize: '22px',
            color: theme.primary
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const menu = scene.add.text(0, 60, '[ 主菜单 ]', {
            fontFamily: theme.fontFamily,
            fontSize: '22px',
            color: theme.text
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        resume.on('pointerdown', () => opts.onResume());
        menu.on('pointerdown', () => opts.onMenu());
        c.add([mask, title, resume, menu]);
        c.setDepth(10000);
        return c;
    }
}
```

- [ ] **Step 4: 实现 GameOverScene**

```ts
// packages/core/src/scenes/GameOverScene.ts
import Phaser from 'phaser';
import { DEFAULT_THEME, type Theme } from '../ui/theme.js';

export interface StatLine {
    label: string;
    value: string | number;
}

export interface GameOverSceneOpts {
    stats: StatLine[];
    onRetry: () => void;
    onMenu: () => void;
    theme?: Theme;
}

export class GameOverScene extends Phaser.Scene {
    private opts: GameOverSceneOpts;

    constructor(opts: GameOverSceneOpts) {
        super('gameover');
        this.opts = opts;
    }

    create(): void {
        const { width: W, height: H } = this.scale;
        const theme = this.opts.theme ?? DEFAULT_THEME;
        this.cameras.main.setBackgroundColor(theme.bg);

        this.add.text(W / 2, H / 2 - 180, '结算', {
            fontFamily: theme.fontFamily,
            fontSize: '48px',
            color: theme.primary
        }).setOrigin(0.5);

        let y = H / 2 - 80;
        for (const s of this.opts.stats) {
            this.add.text(W / 2, y, `${s.label}：${s.value}`, {
                fontFamily: theme.fontFamily,
                fontSize: '22px',
                color: theme.text
            }).setOrigin(0.5);
            y += 36;
        }

        const retry = this.add.text(W / 2 - 80, H / 2 + 140, '[ 再来 ]', {
            fontFamily: theme.fontFamily,
            fontSize: '22px',
            color: theme.primary
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const menu = this.add.text(W / 2 + 80, H / 2 + 140, '[ 主菜单 ]', {
            fontFamily: theme.fontFamily,
            fontSize: '22px',
            color: theme.text
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        retry.on('pointerdown', () => this.opts.onRetry());
        menu.on('pointerdown', () => this.opts.onMenu());
    }
}
```

- [ ] **Step 5: 写包总出口 `packages/core/src/index.ts`（覆盖占位）**

```ts
export * from './math/index.js';
export * from './save/index.js';
export * from './input/index.js';
export * from './assets/index.js';
export * from './audio/index.js';
export * from './ui/theme.js';
export { Button } from './ui/Button.js';
export { Bar } from './ui/Bar.js';
export { Dialog } from './ui/Dialog.js';
export { HudPanel } from './ui/HudPanel.js';
export { BootScene } from './scenes/BootScene.js';
export { TitleScene } from './scenes/TitleScene.js';
export { PauseOverlay } from './scenes/PauseOverlay.js';
export { GameOverScene } from './scenes/GameOverScene.js';
```

- [ ] **Step 6: typecheck 全包通过**

```powershell
pnpm --filter @cp/core typecheck
pnpm test
```

- [ ] **Step 7: 在 plane main.ts 中 smoke-import 一次（不必使用，证明依赖通）**

修改 `games/plane/src/main.ts` 顶部加入：

```ts
import { clamp } from '@cp/core';
void clamp; // 避免 unused
```

跑：

```powershell
pnpm --filter @cp/game-plane typecheck
pnpm build
```

- [ ] **Step 8: Commit**

```powershell
git add packages/core games/plane/src/main.ts
git commit -m "M2-22 core/scenes 完成 Title/Pause/GameOver 与总出口"
```

---

# M2 验收

- [ ] `pnpm test` 全 PASS（math/save/input/assets/audio/ui/scenes 共 ≥ 30 测试）
- [ ] `pnpm --filter @cp/core typecheck` 0 error
- [ ] `games/plane` 能 import `@cp/core` 不报错
- [ ] core 内部无 `from '../../games/'` 反向引用（用 `pnpm exec rg -n "games/" packages/core/src` 检查）

---

# M3 — `@cp/marble-sim` 包成型

> **设计前提：** 纯仿真，零渲染。Node 环境 100% 可跑测试。坐标系：x 向右、y 向下（与浏览器一致），重力默认 `+g`。

## Task 23: 包骨架 + types.ts

**Files:**
- Create: `packages/marble-sim/package.json`
- Create: `packages/marble-sim/tsconfig.json`
- Create: `packages/marble-sim/src/types.ts`
- Create: `packages/marble-sim/src/index.ts`
- Create: `packages/marble-sim/tests/.gitkeep`

- [ ] **Step 1: `packages/marble-sim/package.json`**

```jsonc
{
    "name": "@cp/marble-sim",
    "version": "0.0.0",
    "type": "module",
    "main": "./src/index.ts",
    "types": "./src/index.ts",
    "scripts": {
        "typecheck": "tsc --noEmit"
    },
    "devDependencies": {
        "typescript": "^5.5"
    }
}
```

- [ ] **Step 2: `packages/marble-sim/tsconfig.json`**

```jsonc
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "outDir": "dist",
        "rootDir": "src",
        "composite": true
    },
    "include": ["src"]
}
```

- [ ] **Step 3: `src/types.ts`**

```ts
export interface Vec2 {
    x: number;
    y: number;
}

export interface WorldConfig {
    bounds: { x: number; y: number; w: number; h: number };
    gravity: number;       // px/s^2
    bounce: number;        // 0..1 反弹系数
    drag?: number;         // 每秒线性阻尼，默认 0
    maxSteps?: number;     // 单帧最大子步，默认 4
}

export type CollisionEvent =
    | { kind: 'wall'; ballId: number }
    | { kind: 'obstacle'; ballId: number; obstacleId: number }
    | { kind: 'sweep'; ballId: number; sweepId: number }
    | { kind: 'pipe'; ballId: number; pipeId: number }
    | { kind: 'zone'; ballId: number; zoneId: number };

export interface BallSnapshot {
    id: number;
    pos: Vec2;
    vel: Vec2;
    r: number;
    alive: boolean;
}
```

- [ ] **Step 4: 占位 `src/index.ts`**

```ts
export * from './types.js';
```

- [ ] **Step 5: 把 `@cp/marble-sim` 加进 plane 子包依赖**

```jsonc
// games/plane/package.json dependencies 追加：
"@cp/marble-sim": "workspace:*"
```

跑：

```powershell
pnpm install
```

- [ ] **Step 6: Commit**

```powershell
git add packages/marble-sim games/plane/package.json
git commit -m "M3-23 创建 @cp/marble-sim 包骨架与基础类型"
```

---

## Task 24: World + step() + snapshot() + addBall

**Files:**
- Create: `packages/marble-sim/src/world.ts`
- Create: `packages/marble-sim/src/ball.ts`
- Create: `packages/marble-sim/tests/world.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/marble-sim/tests/world.test.ts
import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

const cfg = {
    bounds: { x: 0, y: 0, w: 100, h: 200 },
    gravity: 1000,
    bounce: 0.8
};

describe('World/addBall + snapshot', () => {
    it('addBall 后 snapshot 能查到', () => {
        const w = new World(cfg);
        const id = w.addBall({ pos: { x: 50, y: 10 }, vel: { x: 0, y: 0 }, r: 5 });
        const snap = w.snapshot();
        expect(snap.balls.length).toBe(1);
        expect(snap.balls[0].id).toBe(id);
        expect(snap.balls[0].pos.y).toBe(10);
    });
});

describe('World/step 重力作用', () => {
    it('单球自由下落 1 秒 y 增量 ≈ 0.5gt^2', () => {
        const w = new World(cfg);
        w.addBall({ pos: { x: 50, y: 0 }, vel: { x: 0, y: 0 }, r: 1 });
        // 1 秒，以 dt=1/60 切片
        for (let i = 0; i < 60; i++) w.step(1 / 60);
        const ball = w.snapshot().balls[0];
        // 解析解 500，离散累积误差容差 ±15
        expect(ball.pos.y).toBeGreaterThan(485);
        expect(ball.pos.y).toBeLessThan(515);
    });

    it('碰底反弹后 |vy| 减半（bounce=0.5）', () => {
        const w = new World({ ...cfg, gravity: 0, bounce: 0.5 });
        w.addBall({ pos: { x: 50, y: 190 }, vel: { x: 0, y: 100 }, r: 5 });
        w.step(1);
        const b = w.snapshot().balls[0];
        expect(b.vel.y).toBeCloseTo(-50, 1);
    });

    it('左右墙反弹', () => {
        const w = new World({ ...cfg, gravity: 0, bounce: 1 });
        w.addBall({ pos: { x: 10, y: 100 }, vel: { x: -100, y: 0 }, r: 5 });
        w.step(0.2);
        const b = w.snapshot().balls[0];
        expect(b.vel.x).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 2: 跑测试看失败**

```powershell
pnpm test
```

- [ ] **Step 3: 实现 `ball.ts` 与 `world.ts`**

```ts
// packages/marble-sim/src/ball.ts
import type { Vec2 } from './types.js';

export interface BallInit {
    pos: Vec2;
    vel: Vec2;
    r: number;
}

export class Ball {
    id: number;
    pos: Vec2;
    vel: Vec2;
    r: number;
    alive = true;

    constructor(id: number, init: BallInit) {
        this.id = id;
        this.pos = { x: init.pos.x, y: init.pos.y };
        this.vel = { x: init.vel.x, y: init.vel.y };
        this.r = init.r;
    }
}
```

```ts
// packages/marble-sim/src/world.ts
import { Ball, type BallInit } from './ball.js';
import type { BallSnapshot, CollisionEvent, WorldConfig } from './types.js';

export interface WorldSnapshot {
    balls: BallSnapshot[];
}

export class World {
    private balls: Ball[] = [];
    private nextId = 1;
    private cfg: Required<WorldConfig>;

    constructor(cfg: WorldConfig) {
        this.cfg = {
            drag: 0,
            maxSteps: 4,
            ...cfg
        };
    }

    addBall(init: BallInit): number {
        const b = new Ball(this.nextId++, init);
        this.balls.push(b);
        return b.id;
    }

    step(dt: number): CollisionEvent[] {
        const events: CollisionEvent[] = [];
        const { gravity, bounce, drag, bounds } = this.cfg;
        const dragK = Math.exp(-drag * dt);

        for (const b of this.balls) {
            if (!b.alive) continue;
            // 半隐式欧拉
            b.vel.y += gravity * dt;
            b.vel.x *= dragK;
            b.vel.y *= dragK;
            b.pos.x += b.vel.x * dt;
            b.pos.y += b.vel.y * dt;

            // 墙反弹
            const minX = bounds.x + b.r;
            const maxX = bounds.x + bounds.w - b.r;
            const minY = bounds.y + b.r;
            const maxY = bounds.y + bounds.h - b.r;

            if (b.pos.x < minX) {
                b.pos.x = minX;
                b.vel.x = -b.vel.x * bounce;
                events.push({ kind: 'wall', ballId: b.id });
            } else if (b.pos.x > maxX) {
                b.pos.x = maxX;
                b.vel.x = -b.vel.x * bounce;
                events.push({ kind: 'wall', ballId: b.id });
            }
            if (b.pos.y < minY) {
                b.pos.y = minY;
                b.vel.y = -b.vel.y * bounce;
                events.push({ kind: 'wall', ballId: b.id });
            } else if (b.pos.y > maxY) {
                b.pos.y = maxY;
                b.vel.y = -b.vel.y * bounce;
                events.push({ kind: 'wall', ballId: b.id });
            }
        }
        return events;
    }

    snapshot(): WorldSnapshot {
        return {
            balls: this.balls.map((b) => ({
                id: b.id,
                pos: { x: b.pos.x, y: b.pos.y },
                vel: { x: b.vel.x, y: b.vel.y },
                r: b.r,
                alive: b.alive
            }))
        };
    }
}
```

- [ ] **Step 4: 更新 `src/index.ts`**

```ts
export * from './types.js';
export { World, type WorldSnapshot } from './world.js';
export { Ball, type BallInit } from './ball.js';
```

- [ ] **Step 5: 跑测试通过**

```powershell
pnpm test
```

- [ ] **Step 6: Commit**

```powershell
git add packages/marble-sim
git commit -m "M3-24 marble-sim 添加 World/Ball 与墙反弹"
```

---

## Task 25: Obstacle + 圆-圆弹性碰撞

**Files:**
- Create: `packages/marble-sim/src/obstacle.ts`
- Create: `packages/marble-sim/src/collision.ts`
- Modify: `packages/marble-sim/src/world.ts`
- Create: `packages/marble-sim/tests/obstacle.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/marble-sim/tests/obstacle.test.ts
import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

const cfg = {
    bounds: { x: 0, y: 0, w: 1000, h: 1000 },
    gravity: 0,
    bounce: 1
};

describe('marble-sim/Obstacle 圆-圆碰撞', () => {
    it('正对撞回弹（一维对称）', () => {
        const w = new World(cfg);
        w.addBall({ pos: { x: 100, y: 500 }, vel: { x: 200, y: 0 }, r: 10 });
        w.addObstacle({ pos: { x: 200, y: 500 }, r: 10 });
        for (let i = 0; i < 30; i++) w.step(1 / 60);
        const b = w.snapshot().balls[0];
        expect(b.vel.x).toBeLessThan(0);
    });

    it('能量守恒（bounce=1）', () => {
        const w = new World(cfg);
        w.addBall({ pos: { x: 100, y: 500 }, vel: { x: 200, y: 0 }, r: 10 });
        w.addObstacle({ pos: { x: 200, y: 500 }, r: 10 });
        const ke0 = 0.5 * (200 ** 2);
        for (let i = 0; i < 30; i++) w.step(1 / 60);
        const b = w.snapshot().balls[0];
        const ke1 = 0.5 * (b.vel.x ** 2 + b.vel.y ** 2);
        expect(ke1).toBeGreaterThan(ke0 * 0.95);
        expect(ke1).toBeLessThan(ke0 * 1.05);
    });

    it('未接触不变速', () => {
        const w = new World(cfg);
        w.addBall({ pos: { x: 100, y: 500 }, vel: { x: 50, y: 0 }, r: 5 });
        w.addObstacle({ pos: { x: 800, y: 500 }, r: 5 });
        w.step(1 / 60);
        const b = w.snapshot().balls[0];
        expect(b.vel.x).toBeCloseTo(50, 1);
    });
});
```

- [ ] **Step 2: 跑测试看失败（addObstacle 未定义）**

```powershell
pnpm test
```

- [ ] **Step 3: 实现 `obstacle.ts`**

```ts
// packages/marble-sim/src/obstacle.ts
import type { Vec2 } from './types.js';

export interface ObstacleInit {
    pos: Vec2;
    r: number;
}

export class Obstacle {
    id: number;
    pos: Vec2;
    r: number;

    constructor(id: number, init: ObstacleInit) {
        this.id = id;
        this.pos = { x: init.pos.x, y: init.pos.y };
        this.r = init.r;
    }
}
```

- [ ] **Step 4: 实现 `collision.ts`**

```ts
// packages/marble-sim/src/collision.ts
import type { Ball } from './ball.js';
import type { Obstacle } from './obstacle.js';

export function resolveCircleVsCircle(b: Ball, o: Obstacle, bounce: number): boolean {
    const dx = b.pos.x - o.pos.x;
    const dy = b.pos.y - o.pos.y;
    const distSq = dx * dx + dy * dy;
    const rSum = b.r + o.r;
    if (distSq >= rSum * rSum) return false;

    const dist = Math.sqrt(distSq) || 1e-6;
    const nx = dx / dist;
    const ny = dy / dist;

    // 推到法向交界外侧（防止穿透）
    const penetration = rSum - dist;
    b.pos.x += nx * penetration;
    b.pos.y += ny * penetration;

    // 速度沿法线反射
    const vn = b.vel.x * nx + b.vel.y * ny;
    if (vn < 0) {
        b.vel.x -= (1 + bounce) * vn * nx;
        b.vel.y -= (1 + bounce) * vn * ny;
    }
    return true;
}
```

- [ ] **Step 5: 修改 `world.ts` 引入 Obstacle**

在 `World` 类内加入：

```ts
import { Obstacle, type ObstacleInit } from './obstacle.js';
import { resolveCircleVsCircle } from './collision.js';

// ...class World:
private obstacles: Obstacle[] = [];
private nextObsId = 1;

addObstacle(init: ObstacleInit): number {
    const o = new Obstacle(this.nextObsId++, init);
    this.obstacles.push(o);
    return o.id;
}
```

在 `step()` 内的墙处理之后追加：

```ts
for (const o of this.obstacles) {
    if (resolveCircleVsCircle(b, o, bounce)) {
        events.push({ kind: 'obstacle', ballId: b.id, obstacleId: o.id });
    }
}
```

- [ ] **Step 6: 跑测试通过**

```powershell
pnpm test
```

- [ ] **Step 7: 更新 index 导出**

```ts
// packages/marble-sim/src/index.ts 追加：
export { Obstacle, type ObstacleInit } from './obstacle.js';
```

- [ ] **Step 8: Commit**

```powershell
git add packages/marble-sim
git commit -m "M3-25 marble-sim 添加 Obstacle 与圆-圆弹性碰撞"
```

---

## Task 26: Sweep（转动臂）+ 圆-线段碰撞

**Files:**
- Create: `packages/marble-sim/src/sweep.ts`
- Modify: `packages/marble-sim/src/collision.ts`
- Modify: `packages/marble-sim/src/world.ts`
- Create: `packages/marble-sim/tests/sweep.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/marble-sim/tests/sweep.test.ts
import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

const cfg = {
    bounds: { x: 0, y: 0, w: 1000, h: 1000 },
    gravity: 0,
    bounce: 1
};

describe('marble-sim/Sweep 圆-线段碰撞', () => {
    it('水平球碰上水平臂法向反弹', () => {
        const w = new World(cfg);
        // 球从下方上来撞上水平静止线段（omega=0）
        w.addBall({ pos: { x: 500, y: 520 }, vel: { x: 0, y: -200 }, r: 5 });
        w.addSweep({ pivot: { x: 400, y: 500 }, length: 200, omega: 0, angle: 0 });
        for (let i = 0; i < 20; i++) w.step(1 / 60);
        const b = w.snapshot().balls[0];
        expect(b.vel.y).toBeGreaterThan(0);
    });

    it('远离 sweep 时不变速', () => {
        const w = new World(cfg);
        w.addBall({ pos: { x: 50, y: 50 }, vel: { x: 0, y: 100 }, r: 5 });
        w.addSweep({ pivot: { x: 800, y: 800 }, length: 100, omega: 1, angle: 0 });
        w.step(1 / 60);
        const b = w.snapshot().balls[0];
        expect(b.vel.x).toBe(0);
    });

    it('转动臂 angle 累加', () => {
        const w = new World(cfg);
        const id = w.addSweep({ pivot: { x: 500, y: 500 }, length: 100, omega: Math.PI, angle: 0 });
        w.step(1);
        const sweep = w.snapshotSweeps().find((s) => s.id === id)!;
        expect(sweep.angle).toBeCloseTo(Math.PI, 2);
    });
});
```

- [ ] **Step 2: 跑测试看失败**

```powershell
pnpm test
```

- [ ] **Step 3: `sweep.ts`**

```ts
// packages/marble-sim/src/sweep.ts
import type { Vec2 } from './types.js';

export interface SweepInit {
    pivot: Vec2;
    length: number;
    omega: number;       // rad/s
    angle?: number;      // 初始角度
    thickness?: number;  // 半宽，默认 4
}

export class Sweep {
    id: number;
    pivot: Vec2;
    length: number;
    omega: number;
    angle: number;
    thickness: number;

    constructor(id: number, init: SweepInit) {
        this.id = id;
        this.pivot = { x: init.pivot.x, y: init.pivot.y };
        this.length = init.length;
        this.omega = init.omega;
        this.angle = init.angle ?? 0;
        this.thickness = init.thickness ?? 4;
    }

    advance(dt: number): void {
        this.angle += this.omega * dt;
    }

    endpoint(): Vec2 {
        return {
            x: this.pivot.x + Math.cos(this.angle) * this.length,
            y: this.pivot.y + Math.sin(this.angle) * this.length
        };
    }
}
```

- [ ] **Step 4: 在 `collision.ts` 追加 圆-线段 算法**

```ts
import type { Sweep } from './sweep.js';

export function resolveCircleVsSweep(b: Ball, s: Sweep, bounce: number): boolean {
    const ax = s.pivot.x;
    const ay = s.pivot.y;
    const ex = s.endpoint();
    const bx = ex.x;
    const by = ex.y;

    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy || 1e-6;
    let t = ((b.pos.x - ax) * dx + (b.pos.y - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    const ox = b.pos.x - cx;
    const oy = b.pos.y - cy;
    const distSq = ox * ox + oy * oy;
    const rSum = b.r + s.thickness;
    if (distSq >= rSum * rSum) return false;

    const dist = Math.sqrt(distSq) || 1e-6;
    const nx = ox / dist;
    const ny = oy / dist;
    const penetration = rSum - dist;
    b.pos.x += nx * penetration;
    b.pos.y += ny * penetration;

    const vn = b.vel.x * nx + b.vel.y * ny;
    if (vn < 0) {
        b.vel.x -= (1 + bounce) * vn * nx;
        b.vel.y -= (1 + bounce) * vn * ny;
    }
    return true;
}
```

- [ ] **Step 5: 修改 `world.ts`**

加 sweeps 数组、`addSweep`、`snapshotSweeps`，并在 `step()` 中每球判碰：

```ts
import { Sweep, type SweepInit } from './sweep.js';
import { resolveCircleVsSweep } from './collision.js';

private sweeps: Sweep[] = [];
private nextSweepId = 1;

addSweep(init: SweepInit): number {
    const s = new Sweep(this.nextSweepId++, init);
    this.sweeps.push(s);
    return s.id;
}

snapshotSweeps(): Array<{ id: number; pivot: Vec2; length: number; angle: number; thickness: number }> {
    return this.sweeps.map((s) => ({ id: s.id, pivot: { ...s.pivot }, length: s.length, angle: s.angle, thickness: s.thickness }));
}
```

`step()` 起始处推进角度：

```ts
for (const s of this.sweeps) s.advance(dt);
```

在每个球的碰撞处理（在 obstacle 之后）追加：

```ts
for (const s of this.sweeps) {
    if (resolveCircleVsSweep(b, s, bounce)) {
        events.push({ kind: 'sweep', ballId: b.id, sweepId: s.id });
    }
}
```

- [ ] **Step 6: 跑测试通过**

```powershell
pnpm test
```

- [ ] **Step 7: 导出**

```ts
// packages/marble-sim/src/index.ts 追加：
export { Sweep, type SweepInit } from './sweep.js';
```

- [ ] **Step 8: Commit**

```powershell
git add packages/marble-sim
git commit -m "M3-26 marble-sim 添加 Sweep 转动臂与圆-线段碰撞"
```

---

## Task 27: Pipe（管道）+ 圆-墙反弹

**Files:**
- Create: `packages/marble-sim/src/pipe.ts`
- Modify: `packages/marble-sim/src/collision.ts`
- Modify: `packages/marble-sim/src/world.ts`
- Create: `packages/marble-sim/tests/pipe.test.ts`

> Pipe = 两条平行线段，沿轴向开放，垂直方向把球夹住反弹。

- [ ] **Step 1: 写失败测试**

```ts
// packages/marble-sim/tests/pipe.test.ts
import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

const cfg = {
    bounds: { x: 0, y: 0, w: 1000, h: 1000 },
    gravity: 0,
    bounce: 1
};

describe('marble-sim/Pipe', () => {
    it('水平管道内球沿 x 行进，y 速度被夹回', () => {
        const w = new World(cfg);
        w.addPipe({ a: { x: 100, y: 500 }, b: { x: 900, y: 500 }, halfWidth: 20 });
        w.addBall({ pos: { x: 500, y: 510 }, vel: { x: 200, y: 50 }, r: 5 });
        for (let i = 0; i < 60; i++) w.step(1 / 60);
        const ball = w.snapshot().balls[0];
        // y 不应飞出管道
        expect(ball.pos.y).toBeGreaterThan(480);
        expect(ball.pos.y).toBeLessThan(540);
    });

    it('管道外不影响', () => {
        const w = new World(cfg);
        w.addPipe({ a: { x: 100, y: 100 }, b: { x: 200, y: 100 }, halfWidth: 10 });
        w.addBall({ pos: { x: 500, y: 500 }, vel: { x: 0, y: 100 }, r: 5 });
        w.step(0.1);
        const b = w.snapshot().balls[0];
        expect(b.vel.y).toBeCloseTo(100, 1);
    });
});
```

- [ ] **Step 2: 跑测试看失败**

```powershell
pnpm test
```

- [ ] **Step 3: `pipe.ts`**

```ts
// packages/marble-sim/src/pipe.ts
import type { Vec2 } from './types.js';

export interface PipeInit {
    a: Vec2;
    b: Vec2;
    halfWidth: number;
}

export class Pipe {
    id: number;
    a: Vec2;
    b: Vec2;
    halfWidth: number;

    constructor(id: number, init: PipeInit) {
        this.id = id;
        this.a = { x: init.a.x, y: init.a.y };
        this.b = { x: init.b.x, y: init.b.y };
        this.halfWidth = init.halfWidth;
    }
}
```

- [ ] **Step 4: 在 `collision.ts` 追加 Pipe 碰撞**

```ts
import type { Pipe } from './pipe.js';

export function resolveCircleVsPipe(ball: Ball, p: Pipe, bounce: number): boolean {
    const dx = p.b.x - p.a.x;
    const dy = p.b.y - p.a.y;
    const lenSq = dx * dx + dy * dy || 1e-6;
    const t = ((ball.pos.x - p.a.x) * dx + (ball.pos.y - p.a.y) * dy) / lenSq;
    if (t < 0 || t > 1) return false; // 仅在管道轴向范围内生效

    const cx = p.a.x + dx * t;
    const cy = p.a.y + dy * t;
    const ox = ball.pos.x - cx;
    const oy = ball.pos.y - cy;
    const distSq = ox * ox + oy * oy;
    const limit = p.halfWidth - ball.r;
    if (limit <= 0 || distSq <= limit * limit) return false;

    const dist = Math.sqrt(distSq) || 1e-6;
    const nx = ox / dist;
    const ny = oy / dist;
    const overshoot = dist - limit;
    ball.pos.x -= nx * overshoot;
    ball.pos.y -= ny * overshoot;

    const vn = ball.vel.x * nx + ball.vel.y * ny;
    if (vn > 0) {
        ball.vel.x -= (1 + bounce) * vn * nx;
        ball.vel.y -= (1 + bounce) * vn * ny;
    }
    return true;
}
```

- [ ] **Step 5: 修改 `world.ts`**

```ts
import { Pipe, type PipeInit } from './pipe.js';
import { resolveCircleVsPipe } from './collision.js';

private pipes: Pipe[] = [];
private nextPipeId = 1;

addPipe(init: PipeInit): number {
    const p = new Pipe(this.nextPipeId++, init);
    this.pipes.push(p);
    return p.id;
}
```

`step()` 球循环内（sweep 之后）追加：

```ts
for (const p of this.pipes) {
    if (resolveCircleVsPipe(b, p, bounce)) {
        events.push({ kind: 'pipe', ballId: b.id, pipeId: p.id });
    }
}
```

- [ ] **Step 6: 跑测试通过**

```powershell
pnpm test
```

- [ ] **Step 7: 导出**

```ts
// packages/marble-sim/src/index.ts 追加：
export { Pipe, type PipeInit } from './pipe.js';
```

- [ ] **Step 8: Commit**

```powershell
git add packages/marble-sim
git commit -m "M3-27 marble-sim 添加 Pipe 管道与圆-墙反弹"
```

---

## Task 28: Zone + Launcher + presets

**Files:**
- Create: `packages/marble-sim/src/zone.ts`
- Create: `packages/marble-sim/src/launcher.ts`
- Create: `packages/marble-sim/src/presets.ts`
- Modify: `packages/marble-sim/src/world.ts`
- Modify: `packages/marble-sim/src/index.ts`
- Create: `packages/marble-sim/tests/zone-launcher.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/marble-sim/tests/zone-launcher.test.ts
import { describe, it, expect, vi } from 'vitest';
import { World } from '../src/world.js';
import { PLANE_SPAWNER_PRESET, STANDALONE_PRESET } from '../src/presets.js';

describe('marble-sim/Zone onEnter', () => {
    it('球进入矩形 zone 触发回调', () => {
        const w = new World({ bounds: { x: 0, y: 0, w: 1000, h: 1000 }, gravity: 0, bounce: 1 });
        const enter = vi.fn();
        w.addZone({ x: 400, y: 400, w: 200, h: 200, onEnter: enter });
        w.addBall({ pos: { x: 500, y: 500 }, vel: { x: 0, y: 0 }, r: 5 });
        w.step(0.01);
        expect(enter).toHaveBeenCalledTimes(1);
    });

    it('球在 zone 外不触发', () => {
        const w = new World({ bounds: { x: 0, y: 0, w: 1000, h: 1000 }, gravity: 0, bounce: 1 });
        const enter = vi.fn();
        w.addZone({ x: 0, y: 0, w: 50, h: 50, onEnter: enter });
        w.addBall({ pos: { x: 500, y: 500 }, vel: { x: 0, y: 0 }, r: 5 });
        w.step(0.01);
        expect(enter).not.toHaveBeenCalled();
    });

    it('球离开后重新进入会再触发', () => {
        const w = new World({ bounds: { x: 0, y: 0, w: 1000, h: 1000 }, gravity: 0, bounce: 1 });
        const enter = vi.fn();
        w.addZone({ x: 400, y: 400, w: 100, h: 100, onEnter: enter });
        const id = w.addBall({ pos: { x: 450, y: 450 }, vel: { x: 0, y: 0 }, r: 5 });
        w.step(0.01); // 进入
        // 手动挪出
        w.teleportBall(id, { x: 100, y: 100 });
        w.step(0.01);
        w.teleportBall(id, { x: 450, y: 450 });
        w.step(0.01);
        expect(enter).toHaveBeenCalledTimes(2);
    });
});

describe('marble-sim/Launcher', () => {
    it('按周期发射球', () => {
        const w = new World({ bounds: { x: 0, y: 0, w: 1000, h: 1000 }, gravity: 0, bounce: 1 });
        w.addLauncher({ pos: { x: 50, y: 50 }, vel: { x: 100, y: 0 }, r: 4, interval: 0.5 });
        // 跑 1.6 秒 -> 应当发射 4 颗（t=0, 0.5, 1.0, 1.5）
        for (let i = 0; i < 96; i++) w.step(1 / 60);
        expect(w.snapshot().balls.length).toBe(4);
    });
});

describe('marble-sim/presets', () => {
    it('PLANE_SPAWNER_PRESET 与 STANDALONE_PRESET 都暴露 bounds/gravity/bounce', () => {
        for (const p of [PLANE_SPAWNER_PRESET, STANDALONE_PRESET]) {
            expect(p.bounds.w).toBeGreaterThan(0);
            expect(p.gravity).toBeGreaterThanOrEqual(0);
            expect(p.bounce).toBeGreaterThanOrEqual(0);
            expect(p.bounce).toBeLessThanOrEqual(1);
        }
    });
});
```

- [ ] **Step 2: 跑测试看失败**

```powershell
pnpm test
```

- [ ] **Step 3: `zone.ts`**

```ts
// packages/marble-sim/src/zone.ts
import type { Ball } from './ball.js';

export interface ZoneInit {
    x: number;
    y: number;
    w: number;
    h: number;
    onEnter: (ball: Ball) => void;
}

export class Zone {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    onEnter: (ball: Ball) => void;
    contained = new Set<number>();

    constructor(id: number, init: ZoneInit) {
        this.id = id;
        this.x = init.x;
        this.y = init.y;
        this.w = init.w;
        this.h = init.h;
        this.onEnter = init.onEnter;
    }

    contains(ball: Ball): boolean {
        return ball.pos.x >= this.x && ball.pos.x <= this.x + this.w && ball.pos.y >= this.y && ball.pos.y <= this.y + this.h;
    }
}
```

- [ ] **Step 4: `launcher.ts`**

```ts
// packages/marble-sim/src/launcher.ts
import type { Vec2 } from './types.js';

export interface LauncherInit {
    pos: Vec2;
    vel: Vec2;
    r: number;
    interval: number;
}

export class Launcher {
    id: number;
    pos: Vec2;
    vel: Vec2;
    r: number;
    interval: number;
    elapsed = 0;
    sinceLast: number;

    constructor(id: number, init: LauncherInit) {
        this.id = id;
        this.pos = { x: init.pos.x, y: init.pos.y };
        this.vel = { x: init.vel.x, y: init.vel.y };
        this.r = init.r;
        this.interval = init.interval;
        this.sinceLast = init.interval; // 让 t=0 立刻发射
    }
}
```

- [ ] **Step 5: `presets.ts`**

```ts
// packages/marble-sim/src/presets.ts
import type { WorldConfig } from './types.js';

export const PLANE_SPAWNER_PRESET: WorldConfig = {
    bounds: { x: 0, y: 0, w: 220, h: 560 },
    gravity: 600,
    bounce: 0.6,
    drag: 0.05
};

export const STANDALONE_PRESET: WorldConfig = {
    bounds: { x: 0, y: 0, w: 1280, h: 720 },
    gravity: 1200,
    bounce: 0.7,
    drag: 0.02
};
```

- [ ] **Step 6: 在 `world.ts` 接入 Zone / Launcher / teleportBall**

```ts
import { Zone, type ZoneInit } from './zone.js';
import { Launcher, type LauncherInit } from './launcher.js';

private zones: Zone[] = [];
private launchers: Launcher[] = [];
private nextZoneId = 1;
private nextLauncherId = 1;

addZone(init: ZoneInit): number {
    const z = new Zone(this.nextZoneId++, init);
    this.zones.push(z);
    return z.id;
}

addLauncher(init: LauncherInit): number {
    const l = new Launcher(this.nextLauncherId++, init);
    this.launchers.push(l);
    return l.id;
}

launchBall(init: BallInit): number {
    return this.addBall(init);
}

teleportBall(id: number, pos: Vec2): void {
    const b = this.balls.find((x) => x.id === id);
    if (b) {
        b.pos.x = pos.x;
        b.pos.y = pos.y;
    }
}
```

在 `step()` 起始处推进 Launcher（在墙循环外）：

```ts
for (const l of this.launchers) {
    l.sinceLast += dt;
    while (l.sinceLast >= l.interval) {
        l.sinceLast -= l.interval;
        this.addBall({ pos: { ...l.pos }, vel: { ...l.vel }, r: l.r });
    }
}
```

在每个球的处理末尾（pipe 之后）追加 Zone 判定：

```ts
for (const z of this.zones) {
    const inside = z.contains(b);
    const was = z.contained.has(b.id);
    if (inside && !was) {
        z.contained.add(b.id);
        z.onEnter(b);
        events.push({ kind: 'zone', ballId: b.id, zoneId: z.id });
    } else if (!inside && was) {
        z.contained.delete(b.id);
    }
}
```

- [ ] **Step 7: 更新 `src/index.ts` 全量导出**

```ts
export * from './types.js';
export { World, type WorldSnapshot } from './world.js';
export { Ball, type BallInit } from './ball.js';
export { Obstacle, type ObstacleInit } from './obstacle.js';
export { Sweep, type SweepInit } from './sweep.js';
export { Pipe, type PipeInit } from './pipe.js';
export { Zone, type ZoneInit } from './zone.js';
export { Launcher, type LauncherInit } from './launcher.js';
export { PLANE_SPAWNER_PRESET, STANDALONE_PRESET } from './presets.js';
```

- [ ] **Step 8: 跑测试通过**

```powershell
pnpm test
# 期望：marble-sim 全套 ≥ 15 测试 PASS
pnpm --filter @cp/marble-sim typecheck
```

- [ ] **Step 9: Commit**

```powershell
git add packages/marble-sim
git commit -m "M3-28 marble-sim 添加 Zone/Launcher/presets 完成基础包"
```

---

# M3 验收

- [ ] `pnpm test` 全 PASS（math/save/input/assets/audio/ui/scenes + marble-sim 共 ≥ 45 测试）
- [ ] `pnpm typecheck` 全包 0 error
- [ ] `pnpm build` 0 error
- [ ] `pnpm lint` 0 error
- [ ] `packages/marble-sim/src` 中无 phaser / DOM 引用（用 `pnpm exec rg -n "phaser|document|window" packages/marble-sim/src` 检查）
- [ ] 旧 `plane/` 与 `marble/` 目录依然完好可运行

---

# 整体 M1-M3 退出条件

完成本计划后，仓库应当具备：

1. **可独立交付：** `pnpm dev:plane` 起来一个 Phaser Hello-World 页面；任意时刻能 `pnpm test` 与 `pnpm build`
2. **可被复用：** `@cp/core` 与 `@cp/marble-sim` 均能在 `games/plane` 中 import 不报错
3. **可回滚：** 全部 28 个 commit 独立、有意义、可逐个 `git revert`
4. **零回归：** 旧 `plane/` `marble/` 未动，启动旧 `index.html` 表现与重构前一致
5. **进 M4 准备就绪：** 计划文档 `docs/superpowers/plans/2026-05-15-m4-plane-rewrite.md` 是下一步的入口（本计划不创建）

执行 M4 前，强烈建议跑一次 `superpowers:requesting-code-review`。


