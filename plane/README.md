# 雷霆战机 — Thunder Strike v6.0

A canvas-based vertical scrolling shooter built with vanilla HTML5/JS. No frameworks, no dependencies.

---

## Controls / 操作

| Key | Action |
|-----|--------|
| `↑ ↓ ← →` / `W A S D` | Move |
| `SPACE` | Fire (auto-fires, no hold required) |
| `B` | Call support wingmen |
| `P` | Pause / Resume |

---

## Game Flow / 游戏节奏

The game is time-driven — no levels. Enemy types unlock progressively over 90 seconds, then the Boss spawns.

| Time | New Enemy Type |
|------|---------------|
| 0 s | Scout only |
| 5 s | Fighter added |
| 10 s | Interceptor added |
| 15 s | Elite added |
| 25 s | Cruiser added |
| 40 s | Bomber added |
| 60 s | Carrier added |
| **90 s** | **Boss spawns** |

Wave rhythm:
- 0–20 s: 1 enemy per wave, every 120 frames (~2 s)
- 20–50 s: 2 enemies per wave, every 100 frames (~1.7 s)
- 50 s+: 3 enemies per wave, every 85 frames (~1.4 s)
- Max 12 enemies on screen simultaneously

After the Boss is defeated, waves resume (using the 60 s+ spawn table) — the game continues indefinitely.

---

## Enemy Roster / 敌机档案

| Type | HP | Speed | Score | Tier | Behavior |
|------|----|-------|-------|------|----------|
| Scout 侦察机 | 2 | 1.0–2.0 | 100 | Lv1 | Sine-wave drift |
| Fighter 战斗机 | 8 | 0.6–1.0 | 260 | Lv2 | Tracks player X, strafes |
| Interceptor 拦截机 | 4 | 1.4–2.2 | 150 | Lv2 | Fast horizontal sweeps, dashes toward player |
| Elite 精英机 | 12 | 0.5–0.9 | 380 | Lv3 | Aggressive tracking, close confront range |
| Cruiser 巡洋舰 | 20 | 0.35–0.65 | 520 | Lv3 | Slow drift, spread shot ×3 |
| Bomber 轰炸机 | 32 | 0.25–0.5 | 450 | Lv4 | Very slow, 5-bullet cluster burst |
| Carrier 母舰 | 44 | 0.18–0.35 | 900 | Lv4 | Deploys scouts, slow arc |
| Boss | 300 | 0.3 | 7000 | Lv5 | 3-phase attack, 100×79 px |

**Confront behavior** (Lv2+): Instead of stopping dead, non-scout enemies enter a confront zone above the player and strafe horizontally with type-specific speed and direction-change timing. The hard floor prevents any enemy from flying past the player.

Confront zone offsets (distance above player):
- Fighter: 190 px | Interceptor: 130 px | Elite: 170 px
- Cruiser: 240 px | Bomber: 270 px | Carrier: 300 px

---

## Boss Fight / Boss战

| Phase | HP Range | Fire Rate | Attack Pattern |
|-------|----------|-----------|---------------|
| 1 | 300–150 | 36 frames | 5-bullet horizontal spread |
| 2 | 150–75 | 30 frames | 5-bullet aimed spread |
| 3 | 75–0 | 18 frames | 7-bullet full circle + 1 heavy aimed bullet |

Boss movement: cycles through 4 positions (left edge, right edge, center, player-tracking) every 220 frames.

---

## Weapon System / 武器系统

| Level | Weapon | Description |
|-------|--------|-------------|
| Lv0 | Main Gun | Single front shot, fires every 8 frames |
| Lv1 | Side Cannon 副炮 | +2 diagonal shots |
| Lv2 | Swarm 蜂群散射 | 6 small bullets (2×10 px, dmg 0.1/ea) in periodic bursts: 0.1 s on / 0.3 s off |
| Lv3 | Missile 追踪导弹 | 1 homing missile (dmg 8), cooldown 120 frames |
| Lv4 | Dual Missile 双导弹 | 2 homing missiles, faster reload |
| Lv5 | Laser 激光炮 | Full-screen piercing beam, 6 px wide, cycles charge→fire |
| Lv6 | Overclock MAX 超频 | All weapons enhanced; laser 12 px; swarm fires every frame |

Weapon upgrade is obtained via FIREPOWER powerups dropped by enemies.

---

## Powerup System / 道具系统

### Drop Rates by Enemy Tier

| Enemy Tier | Enemies | Drop Rate |
|-----------|---------|-----------|
| Lv1 | Scout | 3% |
| Lv2 | Fighter, Interceptor | 10% |
| Lv3 | Elite, Cruiser | 30% |
| Lv4 | Bomber, Carrier | 50% |
| Lv5 | Boss | 100% |

### Powerup Types

| Icon | Type | Effect |
|------|------|--------|
| ⊕ | FIREPOWER | Weapon level +1 (50% of successful drops) |
| ◈ | SHIELD | Full shield restore |
| ✈ | SUPPORT +1 | Gain 1 support charge |
| ♥ | HEALTH +3 | Restore 3 HP |
| ▶ | SPEED | Speed boost for 6 s |

Rules:
- Max 3 powerups active on screen
- Only 1 of each type on screen at once
- FIREPOWER has a 5 s (300-frame) cooldown after being collected
- FIREPOWER only spawns if player fireLevel < 6 and no other FIREPOWER is active

---

## Player Stats / 玩家参数

| Stat | Value |
|------|-------|
| HP | 30 |
| Speed | 5 px/frame |
| Support charges | 3 (default) |
| Shield | 100 (depletes with hits, no passive regen) |
| Invincibility after hit | ~90 frames (0.5 s) |

Support wingmen: 2 allies spawn beside the player, each with HP=8, firing every 20 frames (dmg 1). Duration: 720 frames (~12 s).

---

## Performance Notes / 性能实现

- **Batch bullet rendering**: All player and enemy bullets grouped by color, drawn with single `fillStyle` set per color group — eliminates per-bullet state changes.
- **Pre-rendered scanlines**: Static scanline overlay rendered once to an offscreen canvas, reused each frame with `drawImage`.
- **Audio hit deduplication**: `audio.hit()` called at most once per frame regardless of swarm bullet count, preventing Audio API oscillator overload.
- **Boss HP bar gradient cached**: Linear gradient object created once when boss spawns, reused each frame.
- **Boss body shadow optimized**: Decorative `stroke()` rendered with `shadowBlur=0`; hit-flash `shadowBlur` reduced from 26→16.
- **Enemy bullet cap**: Hard limit of 80 on-screen enemy bullets.
- **Particle cap**: 400 particles; trimmed to 320 when exceeded.
- **Stars**: 120 procedural stars with per-instance speed/alpha/phase.

---

## Change History / 修改历史

| Version | Summary |
|---------|---------|
| v1.0 | Initial: 7 enemy types, 5 fire levels, support skill |
| v2.0 | Bigger map, 10 lives, carrier enemy |
| v3.0 | 30 HP, auto-attack, ally HP ×2, entry animations |
| v4.0 | Unified fire system, 6-level weapons, swarm periodic burst, laser MAX width ×2 |
| v4.1 | Swarm bullets smaller (2×10), enemy fire rate reduced, boss phase 2/3 fire rates softened, eBullets cap added, boss body shadow optimized |
| **v5.0** | **Time-driven wave system (90 s → boss), single medium difficulty, dynamic enemy confront strafing, tier-based powerup rates (3/10/30/50/100%), boss audio freeze fixed (per-frame audio dedup), level system removed** |

---

## File Structure

```
plane/
├── index.html   — Game canvas + HUD + stats panel
├── game.js      — All game logic (~1450 lines)
├── style.css    — Styling for game container, HUD, stats panel
└── README.md    — This file
```
