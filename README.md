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
