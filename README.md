# Claude Projects — 小游戏合集

用 Claude Code 辅助开发的网页小游戏集合。

## 项目结构

```
ccTest/
├── snake/          # 贪吃蛇游戏
│   ├── index.html
│   ├── style.css
│   └── game.js
└── plane/          # 雷霆战机 —— 飞机大战
    ├── index.html
    ├── style.css
    └── game.js
```

## 游戏列表

### 🐍 贪吃蛇 (snake/)
经典贪吃蛇玩法。

**操作：** 方向键控制移动

---

### ✈️ 雷霆战机 (plane/)
参考雷霆战机风格的纵版射击游戏。

**操作：**
| 按键 | 功能 |
|------|------|
| ↑ ↓ ← → / WASD | 移动 |
| 空格 | 射击 |
| B | 使用炸弹 |
| P | 暂停 |

**特性：**
- 4 种敌机：侦察机、战斗机、巡洋舰、Boss
- Boss 三阶段弹幕变化
- 道具系统：双倍子弹 / 护盾 / 炸弹 / 加命 / 加速
- 粒子爆炸特效
- Web Audio API 音效
- 关卡系统（每关打 Boss 升级）
- 三档难度

## 更新记录

### 2026-03-25

**commit `8315644`** — 初始提交：新增贪吃蛇与飞机大战

- 新增 `snake/` 贪吃蛇游戏（`index.html` / `style.css` / `game.js`）
- 新增 `plane/` 雷霆战机游戏（`index.html` / `style.css` / `game.js`）
- 修复飞机大战开始界面按钮点击无响应的问题（CSS `.screen.active` 优先级覆盖 `.screen.hidden` 导致界面无法隐藏）
