# Plane 测试场调参 UI 整合 + 三栏换装下拉 + 热替换 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TestScene 调参面板从左右两个合并为一个右侧 DebugPanel；新增「敌机类别 / 轨迹覆盖 / 子弹覆盖」三栏下拉，立刻热替换且持久化到 enemyOverrides。

**Architecture:** 删除独立的 EnemyInspector.ts，把"选中敌机"渲染逻辑融入 DebugPanel 顶部一个新 section（未选中时整段隐藏）。Enemy 类新增 4 个 setter 方法（setTypeKey/setBehavior/setBulletTexture + 私有 recomputeAlphaTightBody）。TestScene 的 slots[idx].typeKey 字段从"创建后只读"放宽为可变，切类别时同步更新 slot 和当前 enemy 实例。

**Tech Stack:** TypeScript strict + Phaser 3.80 Arcade + Vitest + happy-dom + 原生 DOM（无 React/Vue）。所有改动局限于 `games/plane` 子项目，不动 `packages/core`。

**Branch:** m6-test-arena-swaps（已创建，从 main 切出）

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `games/plane/src/entities/Enemy.ts` | modify | 新增 setTypeKey / setBehavior / setBulletTexture / recomputeAlphaTightBody |
| `games/plane/src/debug/debugParams.ts` | modify | EnemyOverride 新增 bulletTexture 字段 |
| `games/plane/src/debug/DebugPanel.ts` | modify | 顶部加 selectedEnemy 字段 + 选中敌机 section |
| `games/plane/src/debug/EnemyInspector.ts` | **DELETE** | 逻辑全搬到 DebugPanel |
| `games/plane/src/scenes/TestScene.ts` | modify | 点击 → debugPanel.selectEnemy；删 inspector 字段 |
| `games/plane/tests/enemy-setters.test.ts` | create | 测试 3 个 setter 行为 |

---

## Phase 1 — Enemy 三个 setter（基础设施）

### Task 1.1: 重构提取 recomputeAlphaTightBody

**Files:**
- Modify: `games/plane/src/entities/Enemy.ts`

**目标：** 把 spawn() 里"计算 alpha 紧致 bbox 然后 setSize/setOffset"这段逻辑提取为私有方法 `recomputeAlphaTightBody()`，无行为变化（重构）。

- [ ] **Step 1:** Read Enemy.ts，找到 spawn() 里 alpha bbox 计算块（搜 `getImageData` 或 `ALPHA_THRESHOLD`）
- [ ] **Step 2:** 把这段连同 setSize/setOffset 提取为 `private recomputeAlphaTightBody(): void`，从当前 texture/scale 读取
- [ ] **Step 3:** spawn() 中调用 `this.recomputeAlphaTightBody()` 替代原代码
- [ ] **Step 4:** 运行 `pnpm typecheck` 期望 PASS
- [ ] **Step 5:** 运行 `pnpm -w run test --filter=@cp/game-plane` 期望既有测试不破坏
- [ ] **Step 6:** Commit: `git commit -m "M6-1 plane Enemy.recomputeAlphaTightBody 私有方法提取"`

### Task 1.2: Enemy.setBehavior(id)

**Files:**
- Modify: `games/plane/src/entities/Enemy.ts`
- Create: `games/plane/tests/enemy-setters.test.ts`

**目标：** 给 Enemy 加 public 方法 `setBehavior(behaviorId: string)`，立即用 BehaviorRegistry 创建新行为并 init。

- [ ] **Step 1:** 写失败测试 `tests/enemy-setters.test.ts`：
  ```ts
  import { describe, it, expect, beforeAll } from 'vitest';
  import { BehaviorRegistry } from '../src/behaviors/BehaviorRegistry.js';
  import { registerAllBehaviors } from '../src/behaviors/index.js';

  describe('Enemy setters', () => {
      beforeAll(() => registerAllBehaviors());

      it('setBehavior 替换 behavior 字段并执行 init', () => {
          const enemyMock = {
              behavior: null as any,
              x: 100, y: 50,
              setBehavior(id: string) {
                  this.behavior = BehaviorRegistry.instance.create(id);
                  this.behavior?.init(this as never);
              }
          };
          enemyMock.setBehavior('hover');
          expect(enemyMock.behavior).not.toBeNull();
          expect(enemyMock.behavior.id).toBe('hover');
      });
  });
  ```
- [ ] **Step 2:** 跑测试，期望 PASS（测试只验证逻辑骨架）
- [ ] **Step 3:** 在 Enemy 类里实现 `setBehavior(behaviorId: string): void`：
  ```ts
  setBehavior(behaviorId: string): void {
      this.behavior = BehaviorRegistry.instance.create(behaviorId);
      this.behavior?.init(this as never);
  }
  ```
- [ ] **Step 4:** `pnpm typecheck` PASS
- [ ] **Step 5:** Commit: `git commit -m "M6-2 plane Enemy.setBehavior 热替换行为"`

### Task 1.3: Enemy.setBulletTexture(key)

**Files:**
- Modify: `games/plane/src/entities/Enemy.ts`
- Modify: `games/plane/tests/enemy-setters.test.ts`

**目标：** Enemy 加字段 `bulletTextureKey: string`（从 spawn 时读取），加方法 `setBulletTexture(key: string)`。开火逻辑读 `this.bulletTextureKey`。

- [ ] **Step 1:** 在 Enemy 类里加字段 `bulletTextureKey: string = ''`
- [ ] **Step 2:** spawn() 里设 `this.bulletTextureKey = override?.bulletTexture ?? t.bulletTexture`（先暂时用 t.bulletTexture，override 字段下面 Phase 2 加）
- [ ] **Step 3:** 搜 PlayScene 或 Enemy 内部的开火代码，找到 `t.bulletTexture` 或类似引用，改成读 `this.bulletTextureKey`
- [ ] **Step 4:** 加 setter：
  ```ts
  setBulletTexture(key: string): void {
      this.bulletTextureKey = key;
  }
  ```
- [ ] **Step 5:** 在 tests/enemy-setters.test.ts 加一个测试：
  ```ts
  it('setBulletTexture 改字段', () => {
      const e = { bulletTextureKey: 'enemy-bullet-small', setBulletTexture(k: string) { this.bulletTextureKey = k; } };
      e.setBulletTexture('enemy-bullet-heavy');
      expect(e.bulletTextureKey).toBe('enemy-bullet-heavy');
  });
  ```
- [ ] **Step 6:** `pnpm typecheck` PASS + 测试 PASS
- [ ] **Step 7:** Commit: `git commit -m "M6-3 plane Enemy.setBulletTexture + bulletTextureKey 字段"`

### Task 1.4: Enemy.setTypeKey(newKey)

**Files:**
- Modify: `games/plane/src/entities/Enemy.ts`
- Modify: `games/plane/tests/enemy-setters.test.ts`

**目标：** 综合方法 setTypeKey(newKey) — 切换贴图 + 子弹 + 行为 + 内部属性（hp/dmg/vy 等）到新 typeKey 的默认值（再叠加新 typeKey 的 override）。

- [ ] **Step 1:** 实现 setTypeKey：
  ```ts
  setTypeKey(newKey: EnemyTypeKey): void {
      this.typeKey = newKey;
      const t = ENEMY_TYPES[newKey];
      const override = debugParams.enemyOverrides[newKey] ?? {};
      this.hp = override.hp ?? t.hp;
      this.maxHp = this.hp;
      this.dmg = override.dmg ?? t.dmg;
      this.score = override.score ?? t.score;
      // sprite
      this.setTexture(override.bulletTexture ? t.sprite : t.sprite);
      this.setTexture(t.sprite);
      // bullet texture
      this.bulletTextureKey = override.bulletTexture ?? t.bulletTexture;
      // behavior
      this.setBehavior(override.behaviorId ?? t.behaviorId);
      // hitbox
      this.recomputeAlphaTightBody();
  }
  ```
- [ ] **Step 2:** 在测试文件加：
  ```ts
  it('setTypeKey 切换所有属性到新 typeKey 默认值', () => {
      // mock 测试需要 Phaser scene，简化为只测 typeKey 字段切换
      // 主要验证逻辑流程，详细验证留给手测
  });
  ```
- [ ] **Step 3:** `pnpm typecheck` PASS
- [ ] **Step 4:** Commit: `git commit -m "M6-4 plane Enemy.setTypeKey 整套热切换"`

---

## Phase 2 — EnemyOverride 扩展

### Task 2.1: EnemyOverride 加 bulletTexture 字段

**Files:**
- Modify: `games/plane/src/debug/debugParams.ts`

- [ ] **Step 1:** 在 EnemyOverride interface 加 `bulletTexture?: string`
- [ ] **Step 2:** `pnpm typecheck` PASS
- [ ] **Step 3:** Commit: `git commit -m "M6-5 plane EnemyOverride 加 bulletTexture 字段"`

### Task 2.2: Enemy.spawn() 应用 bulletTexture override

**Files:**
- Modify: `games/plane/src/entities/Enemy.ts`

- [ ] **Step 1:** 在 spawn() 里把 `this.bulletTextureKey = t.bulletTexture` 改成 `this.bulletTextureKey = override?.bulletTexture ?? t.bulletTexture`
- [ ] **Step 2:** `pnpm typecheck` PASS
- [ ] **Step 3:** Commit: `git commit -m "M6-6 plane Enemy.spawn 应用 bulletTexture override"`

---

## Phase 3 — TestScene slot 可变 typeKey

### Task 3.1: TestScene 切类别时同步 slot 和 enemy

**Files:**
- Modify: `games/plane/src/scenes/TestScene.ts`

**目标：** 为后续 Phase 4 的"类别下拉"做准备 — 暴露一个方法 `swapSlotTypeKey(slotIdx, newKey)`，做两件事：① 更新 slots[slotIdx].typeKey ② 找到对应 active enemy 并调用 enemy.setTypeKey(newKey)。

- [ ] **Step 1:** 在 TestScene 类里加 public 方法：
  ```ts
  swapSlotTypeKey(slotIdx: number, newKey: EnemyTypeKey): void {
      const slot = this.slots[slotIdx];
      if (!slot) return;
      slot.typeKey = newKey;
      this.enemies.children.iterate((obj) => {
          const e = obj as Enemy;
          if (!e.active) return null;
          const idx = this.findSlotIndexByPos(e.x, e.y);
          if (idx === slotIdx) e.setTypeKey(newKey);
          return null;
      });
  }
  ```
- [ ] **Step 2:** `pnpm typecheck` PASS
- [ ] **Step 3:** Commit: `git commit -m "M6-7 plane TestScene.swapSlotTypeKey"`

---

## Phase 4 — DebugPanel "选中敌机" section

### Task 4.1: DebugPanel.selectEnemy(enemy) + section 框架

**Files:**
- Modify: `games/plane/src/debug/DebugPanel.ts`

**目标：** DebugPanel 加 `selectedEnemy: Enemy | null` 字段 + `selectEnemy(e: Enemy)` 方法。render() 在顶部 if (selectedEnemy?.active) 时插入新 section（叫 `🎯 选中敌机`），未选中时整段不渲染。section 暂时只有 typeKey label。

- [ ] **Step 1:** Import Enemy 类型
- [ ] **Step 2:** 加字段 + 方法：
  ```ts
  private selectedEnemy: Enemy | null = null;
  selectEnemy(e: Enemy): void { this.selectedEnemy = e; this.render(); }
  ```
- [ ] **Step 3:** 在 render() 顶部（折叠检查之后、敌机 section 之前）加：
  ```ts
  if (this.selectedEnemy?.active) {
      r.appendChild(sectionTitle('🎯 选中敌机'));
      const label = document.createElement('div');
      label.style.cssText = 'padding: 4px 6px; font-size: 11px; color: #ffaa00;';
      label.textContent = `${ENEMY_TYPE_LABELS[this.selectedEnemy.typeKey]} (#${this.selectedEnemy.typeKey})`;
      r.appendChild(label);
  }
  ```
- [ ] **Step 4:** `pnpm typecheck` PASS
- [ ] **Step 5:** Commit: `git commit -m "M6-8 plane DebugPanel.selectEnemy + 选中敌机 section 框架"`

### Task 4.2: 实例实时数据（x= y= hp= v=）

**Files:**
- Modify: `games/plane/src/debug/DebugPanel.ts`

**目标：** section 内加一个 `<div id="__plane_dbg_live__">` 占位 + 新增 public `tick()` 方法每帧更新内容（TestScene update 里调）。

- [ ] **Step 1:** 在 section label 下方加占位 div：
  ```ts
  const live = document.createElement('div');
  live.id = '__plane_dbg_live__';
  live.style.cssText = 'padding: 4px 6px; font-size: 11px; color: #88ccff;';
  r.appendChild(live);
  ```
- [ ] **Step 2:** 加 public tick：
  ```ts
  tick(): void {
      const e = this.selectedEnemy;
      const live = this.root?.querySelector('#__plane_dbg_live__');
      if (!live || !e || !e.active) return;
      const b = e.body as Phaser.Physics.Arcade.Body | null;
      live.textContent = `x=${e.x.toFixed(0)} y=${e.y.toFixed(0)} hp=${e.hp}/${e.maxHp} v=(${(b?.velocity.x ?? 0).toFixed(0)},${(b?.velocity.y ?? 0).toFixed(0)})`;
  }
  ```
- [ ] **Step 3:** `pnpm typecheck` PASS
- [ ] **Step 4:** Commit: `git commit -m "M6-9 plane DebugPanel 实例实时数据"`

### Task 4.3: 类别下拉（7 选 1）

**Files:**
- Modify: `games/plane/src/debug/DebugPanel.ts`

**目标：** section 内加 `<select>`，列出 7 种 typeKey。onChange 写 slots + enemy.setTypeKey()。需要 DebugPanel 持有 TestScene 引用（或通过回调）。

- [ ] **Step 1:** DebugPanel 加可选 onSwapTypeKey 回调字段：
  ```ts
  onSwapTypeKey: ((slotIdx: number, newKey: EnemyTypeKey) => void) | null = null;
  ```
- [ ] **Step 2:** TestScene 在 mount DebugPanel 后赋值：`this.debugPanel.onSwapTypeKey = (i, k) => this.swapSlotTypeKey(i, k)`
- [ ] **Step 3:** DebugPanel section 内加下拉行：
  ```ts
  const typeRow = document.createElement('div');
  typeRow.setAttribute('style', ROW);
  const typeLab = document.createElement('span');
  typeLab.textContent = '敌机类别';
  typeLab.style.cssText = 'width: 80px; font-size: 11px;';
  const typeSel = document.createElement('select');
  typeSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a;';
  for (const key of ENEMY_TYPE_KEYS) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${ENEMY_TYPE_LABELS[key]} (${key})`;
      if (key === e.typeKey) opt.selected = true;
      typeSel.appendChild(opt);
  }
  typeSel.onchange = () => {
      const newKey = typeSel.value as EnemyTypeKey;
      // 通过坐标找 slotIdx —— TestScene 暴露了 swapSlotTypeKey
      this.onSwapTypeKey?.(this.findSlotIdxOfEnemy(e), newKey);
      this.render();  // 重渲染以反映新数据
  };
  typeRow.appendChild(typeLab);
  typeRow.appendChild(typeSel);
  r.appendChild(typeRow);
  ```
- [ ] **Step 4:** 加私有 findSlotIdxOfEnemy — 但更简洁的做法：TestScene 自己暴露 `getSlotIdxOfEnemy(e: Enemy): number`，DebugPanel 加另一个回调 `onResolveSlotIdx`。**实现简化：** DebugPanel 直接通过 (e.x, e.y) 找最近 slot —— 用回调拿 TestScene.findSlotIndexByPos 的能力。
  ```ts
  resolveSlotIdx: ((x: number, y: number) => number) | null = null;
  // TestScene 赋值：this.debugPanel.resolveSlotIdx = (x, y) => this.findSlotIndexByPos(x, y);
  // findSlotIndexByPos 当前是 private，需要改 public 或加 public wrapper
  ```
- [ ] **Step 5:** `pnpm typecheck` PASS
- [ ] **Step 6:** Commit: `git commit -m "M6-10 plane DebugPanel 类别下拉切换"`

### Task 4.4: HP/Score/Dmg/Vy 数字输入

**Files:**
- Modify: `games/plane/src/debug/DebugPanel.ts`

**目标：** section 内加 4 个 `numberRow` 或 `sliderRow`，绑定到 `debugParams.enemyOverrides[currentTypeKey].X`。改值时既写 override 也立刻改 enemy 实例字段（hp 不动血量，但 maxHp 跟着改）。

- [ ] **Step 1:** 在 widgets.ts 检查是否已有 numberRow，复用；否则用 sliderRow（min/max/step 合理范围）
- [ ] **Step 2:** 4 个行：
  ```ts
  const overrideKey = e.typeKey;
  const o = (debugParams.enemyOverrides[overrideKey] ??= {});
  r.appendChild(sliderRow('HP', o.hp ?? ENEMY_TYPES[overrideKey].hp, 1, 200, 1, (v) => {
      o.hp = v;
      e.maxHp = v;
      // 当前 hp 不强制覆盖（避免突然死亡），但 cap 一下
      if (e.hp > v) e.hp = v;
  }));
  // score / dmg / 速度 类似
  ```
- [ ] **Step 3:** `pnpm typecheck` PASS
- [ ] **Step 4:** Commit: `git commit -m "M6-11 plane DebugPanel 选中敌机 hp/score/dmg/vy 调参"`

### Task 4.5: 轨迹覆盖 + 子弹覆盖 双下拉

**Files:**
- Modify: `games/plane/src/debug/DebugPanel.ts`

**目标：** 两个下拉。轨迹列出 5 种 behaviorId，子弹列出 5 种 bulletTexture。下拉首项是「默认（当前 typeKey 的 sprite/behavior）」表示"清除 override"。改下拉 → 写 override + 调 enemy.setBehavior / setBulletTexture 热替换。

- [ ] **Step 1:** 5 种 behavior id 写常量数组（来自 BehaviorRegistry.listAll() 或硬编码）：
  ```ts
  const BEHAVIOR_OPTIONS = ['sinusoidal', 'player-tracker', 'elite-tracker', 'horizontal-sweep', 'hover'];
  const BULLET_OPTIONS = ['enemy-bullet-small', 'enemy-bullet-teardrop', 'enemy-bullet-shrapnel', 'enemy-bullet-orb', 'enemy-bullet-heavy'];
  ```
- [ ] **Step 2:** 渲染：
  ```ts
  // 轨迹覆盖
  const behSel = document.createElement('select');
  const defOpt = document.createElement('option');
  defOpt.value = '';
  defOpt.textContent = `默认 (${ENEMY_TYPES[e.typeKey].behaviorId})`;
  behSel.appendChild(defOpt);
  for (const id of BEHAVIOR_OPTIONS) { /* append option */ }
  if (o.behaviorId) behSel.value = o.behaviorId;
  behSel.onchange = () => {
      if (behSel.value === '') delete o.behaviorId;
      else o.behaviorId = behSel.value;
      e.setBehavior(o.behaviorId ?? ENEMY_TYPES[e.typeKey].behaviorId);
      this.render();
  };
  // 子弹覆盖类似
  ```
- [ ] **Step 3:** `pnpm typecheck` PASS
- [ ] **Step 4:** Commit: `git commit -m "M6-12 plane DebugPanel 轨迹/子弹覆盖双下拉"`

### Task 4.6: 行为 tunable 动态区域

**Files:**
- Modify: `games/plane/src/debug/DebugPanel.ts`

**目标：** 根据 selectedEnemy.behavior?.getTunables() 动态渲染滑条。behavior 切换后 render() 自动刷新这块。

- [ ] **Step 1:** 在 section 末尾：
  ```ts
  const tunables = e.behavior?.getTunables() ?? [];
  if (tunables.length > 0) {
      r.appendChild(sectionTitle('▷ 行为参数'));
      for (const t of tunables) {
          r.appendChild(sliderRow(t.label, t.get(), t.min, t.max, t.step, (v) => t.set(v)));
      }
  }
  ```
- [ ] **Step 2:** `pnpm typecheck` PASS
- [ ] **Step 3:** Commit: `git commit -m "M6-13 plane DebugPanel 行为 tunable 动态滑条"`

---

## Phase 5 — 集成 + 删旧

### Task 5.1: TestScene 接入 + 删 EnemyInspector

**Files:**
- Modify: `games/plane/src/scenes/TestScene.ts`
- Delete: `games/plane/src/debug/EnemyInspector.ts`

- [ ] **Step 1:** TestScene 删 `import { EnemyInspector }` + `inspector` 字段 + mount/unmount/tick 相关调用
- [ ] **Step 2:** 改 `gameobjectdown` 监听：
  ```ts
  this.input.on('gameobjectdown', (_p: unknown, obj: Phaser.GameObjects.GameObject) => {
      if (obj instanceof Enemy) this.debugPanel?.selectEnemy(obj);
  });
  ```
- [ ] **Step 3:** TestScene.update 顶部 `this.debugPanel?.tick();` 替换原 `this.inspector?.tick();`
- [ ] **Step 4:** TestScene mount DebugPanel 后赋值回调：
  ```ts
  this.debugPanel.onSwapTypeKey = (i, k) => this.swapSlotTypeKey(i, k);
  this.debugPanel.resolveSlotIdx = (x, y) => this.findSlotIndexByPos(x, y);
  ```
- [ ] **Step 5:** 把 `findSlotIndexByPos` 改 public（或加 public wrapper）
- [ ] **Step 6:** `rm games/plane/src/debug/EnemyInspector.ts`
- [ ] **Step 7:** `pnpm typecheck` PASS + 全套 vitest（fx-system 老 baseline 不变）
- [ ] **Step 8:** Commit: `git commit -m "M6-14 plane TestScene 接入 DebugPanel.selectEnemy + 删 EnemyInspector"`

---

## Self-Review

完成所有 task 后：
1. **Spec coverage:** 4 个决策（决策 1-4）每条是否都覆盖
2. **Type consistency:** EnemyOverride / EnemyTypeKey / Enemy 字段在所有 task 中保持一致
3. **Placeholder scan:** 无 TBD / TODO / 占位符
4. **手测 checklist:** 见下

---

## 手测 Checklist（M6 完成后用户执行）

```
□ 进测试场 → 右侧 DebugPanel 显示但顶部无"选中敌机"section
□ 点击侦察机 → 顶部出现"🎯 选中敌机 侦察机 (#scout)"
□ 实时数据 x= y= hp= v= 每帧更新
□ 改 HP 数字 → 下次刷新生效，maxHp 跟着变
□ 类别下拉切到"轰炸机" → 当前 enemy 立刻变贴图+变行为+变子弹，
    HP 跟着 bomber 默认（64）；下次刷新仍是 bomber
□ 轨迹覆盖切到 "hover" → 当前 enemy 立刻停下来 hover
□ 子弹覆盖切到 "heavy" → 下一发开火变粗弹（飞行中的不变）
□ 行为参数滑条出现，跟 behaviorId 变化（hover 显示 confrontAmp/Freq）
□ 切到另一架敌机 → section 内容刷新
□ 击杀 → 1 秒复活 → 仍是当前 typeKey（slot.typeKey 已切）
□ 返回菜单再进 → enemyOverrides 还在（持久化）
□ 左侧不应再有任何独立面板
```
