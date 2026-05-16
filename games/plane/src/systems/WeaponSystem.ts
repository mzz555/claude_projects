import { WEAPONS, PRIMARY, SPREAD, SWARM, TRACKER, OVERDRIVE, type WeaponLevelSpec } from '../data/weapons.js';

export type ShotLayer = 'primary' | 'spread' | 'swarm' | 'tracker';

export interface ShotSpec {
    layer: ShotLayer;
    kind: 'bullet' | 'tracker';
    ox: number;
    oy: number;
    vx: number;
    vy: number;
    damage: number;
    color?: number;
    lifetimeMs?: number;
}

export interface BeamState {
    state: 'idle' | 'charging' | 'firing';
    tNormalized: number;
    width: number;
    damagePerSec: number;
}

export class WeaponSystem {
    private level = 0;
    private primaryCooldown = 0;
    private swarmCycleElapsed = 0;
    private swarmCooldown = 0;
    private trackerCooldown = 0;
    private overdriveRemainingMs = 0;

    /**
     * 切换武器等级。
     *
     * 重置：所有层的冷却计时器（primaryCooldown，后续 spread/swarm/tracker/beam 同样应重置）。
     * 不重置：overdriveRemainingMs（超频是独立时效性 buff，与等级无关）。
     */
    setLevel(level: number): void {
        this.level = Math.max(0, Math.min(WEAPONS.length - 1, level));
        this.primaryCooldown = 0;
        this.swarmCycleElapsed = 0;
        this.swarmCooldown = 0;
        this.trackerCooldown = 0;
    }

    getLevel(): number {
        return this.level;
    }

    enterOverdrive(): void {
        // 可重复获得：Math.max 模式刷新（与原版一致：不叠加，取较大值）
        this.overdriveRemainingMs = Math.max(this.overdriveRemainingMs, OVERDRIVE.durationMs);
    }

    isOverdrive(): boolean {
        return this.overdriveRemainingMs > 0;
    }

    /**
     * 激光层不产生抛射物 ShotSpec，而是返回一个状态机快照（idle/charging/firing）。
     * 调用者须独立轮询此方法，不经过 tick() 的 ShotSpec[] 管道。
     *
     * 返回值语义：
     * - null：当前等级未启用激光层（Lv0-Lv4，或未来禁用激光的等级）
     * - BeamState：当前激光状态机快照
     *
     * M4f-6 任务实现具体状态机；当前为占位。
     */
    tickBeam(_dtMs: number): BeamState | null {
        return null;
    }

    tick(dtMs: number): ShotSpec[] {
        // 拆 dtMs：超频内时间 + 超频外时间。这样 swarm 的 normal cycle 只在 normal 段累加，
        // 避免巨步 tick（如 dtMs 远大于 overdriveRemainingMs）把 cycle 推进到不可预测的相位。
        const overdrivePortion = Math.min(this.overdriveRemainingMs, dtMs);
        const normalPortion = dtMs - overdrivePortion;
        if (this.overdriveRemainingMs > 0) {
            this.overdriveRemainingMs = Math.max(0, this.overdriveRemainingMs - dtMs);
        }
        const spec = WEAPONS[this.level]!;
        const shots: ShotSpec[] = [];
        this.tickPrimary(spec, dtMs, shots);
        this.tickSwarm(spec, overdrivePortion, normalPortion, shots);
        this.tickTracker(spec, dtMs, shots);
        return shots;
    }

    private tickPrimary(spec: WeaponLevelSpec, dtMs: number, out: ShotSpec[]): void {
        if (!spec.layers.primary) return;
        this.primaryCooldown -= dtMs;
        if (this.primaryCooldown > 0) return;
        const interval = this.isOverdrive() ? PRIMARY.overdriveIntervalMs : PRIMARY.intervalMs;
        // 用 `=` 而非 `+= interval`：游戏 60fps 下 dtMs (~17ms) 远小于 interval (133ms)，不会出现跨越多个周期的低帧率漂移；用 `=` 让“首帧立即触发”后下一发严格等满 interval，与原版行为一致且测试可精确断言
        this.primaryCooldown = interval;
        out.push({
            layer: 'primary',
            kind: 'bullet',
            ox: 0,
            oy: -30,
            vx: 0,
            vy: -PRIMARY.bulletSpeed,
            damage: PRIMARY.damage
        });
        // 副炮层与主炮共享同一次 cooldown 触发：原版行为为 if(cd<=0){...; bullets.push(主炮); if(fireLevel>=1){副炮}}
        // 故此处不维护独立 spreadCooldown，由主炮的 cooldown 决定何时联动喷出两道斜向弹
        if (spec.layers.spread) {
            for (const side of [-1, 1] as const) {
                out.push({
                    layer: 'spread',
                    kind: 'bullet',
                    ox: side * SPREAD.offsetX,
                    oy: SPREAD.oy,
                    vx: 0,
                    vy: SPREAD.vy,
                    damage: SPREAD.damage,
                    color: SPREAD.color
                });
            }
        }
    }

    /**
     * 蜂群层：与主炮/副炮 cooldown 完全独立的双闸门周期。
     *
     * 非超频：300ms 周期 = 前 100ms burst 窗口（每 33ms 发 6 颗）+ 后 200ms 静默。
     * 超频：绕过 cycle 闸门，按 17ms 持续发射 6 颗（无静默期）。
     *
     * dtMs 由 tick() 拆为 overdrivePortion + normalPortion，分别走两条路径，
     * 保证「超频结束后从 normal cycle 起点重新计时」的语义在巨步 dtMs 下也成立。
     */
    private tickSwarm(spec: WeaponLevelSpec, overdriveDtMs: number, normalDtMs: number, out: ShotSpec[]): void {
        if (!spec.layers.swarm) return;
        if (overdriveDtMs > 0) {
            // 超频段：忽略 cycle 闸门，按 overdriveSwarmRateMs 持续
            this.swarmCooldown -= overdriveDtMs;
            if (this.swarmCooldown <= 0) {
                this.swarmCooldown = SWARM.overdriveSwarmRateMs;
                this.emitSwarmPellets(out);
            }
            // 超频期间冻结 cycle 时钟；超频结束后下一帧从 0 开始新 cycle（避免 stale 状态导致 burst/silent 阶段不可预测）
            this.swarmCycleElapsed = 0;
            // 跨越超频→normal 边界的本帧：只走 overdrive 段，normal 段顺延到下一帧从干净状态开始
            if (this.overdriveRemainingMs === 0 && normalDtMs > 0) {
                this.swarmCooldown = 0;
                return;
            }
        }
        if (normalDtMs <= 0) return;
        this.swarmCycleElapsed = (this.swarmCycleElapsed + normalDtMs) % SWARM.cycleIntervalMs;
        const inBurst = this.swarmCycleElapsed < SWARM.burstDurMs;
        if (!inBurst) {
            this.swarmCooldown = 0;
            return;
        }
        this.swarmCooldown -= normalDtMs;
        if (this.swarmCooldown > 0) return;
        this.swarmCooldown = SWARM.swarmRateMs;
        this.emitSwarmPellets(out);
    }

    /** 一次发射 6 颗 swarm pellet（普通 + 超频共用） */
    private emitSwarmPellets(out: ShotSpec[]): void {
        for (const p of SWARM.pellets) {
            out.push({
                layer: 'swarm',
                kind: 'bullet',
                ox: p.ox,
                oy: SWARM.oy,
                vx: p.vxFactor * SWARM.bulletSpeed,
                vy: p.vyFactor * SWARM.bulletSpeed,
                damage: SWARM.damage,
                color: SWARM.color
            });
        }
    }

    /**
     * 追踪导弹层：Lv3 起启用，独立 cooldown（不与 primary/swarm 共享）。
     *
     * 参数三段调制：
     * - Lv3 单发：interval = TRACKER.intervalMs（2000ms）
     * - Lv4 双发：interval = TRACKER.intervalMs × dualIntervalFactor（0.65 倍 = 1300ms）
     * - 超频：上式再 × TRACKER.overdriveFactor（0.5 倍）
     *
     * 不需要像 swarm 那样拆 dtMs：tracker 用独立 cooldown 而非 cycle 相位，
     * interval 在 cooldown reset 那一刻一次性决定，不存在跨超频边界的相位漂移问题。
     */
    private tickTracker(spec: WeaponLevelSpec, dtMs: number, out: ShotSpec[]): void {
        if (spec.layers.tracker === 0) return;
        this.trackerCooldown -= dtMs;
        if (this.trackerCooldown > 0) return;
        let interval = TRACKER.intervalMs;
        if (spec.layers.tracker === 2) interval *= TRACKER.dualIntervalFactor;
        if (this.isOverdrive()) interval *= TRACKER.overdriveFactor;
        this.trackerCooldown = interval;
        const count = spec.layers.tracker;
        for (let i = 0; i < count; i++) {
            const offsetX = count === 1 ? 0 : i === 0 ? -16 : 16;
            out.push({
                layer: 'tracker',
                kind: 'tracker',
                ox: offsetX,
                oy: -30,
                vx: 0,
                vy: -TRACKER.bulletSpeed,
                damage: TRACKER.damage,
                lifetimeMs: TRACKER.lifetimeMs
            });
        }
    }
}
