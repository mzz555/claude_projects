import { WEAPONS, PRIMARY, SPREAD, OVERDRIVE, type WeaponLevelSpec } from '../data/weapons.js';

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
        if (this.overdriveRemainingMs > 0) {
            this.overdriveRemainingMs = Math.max(0, this.overdriveRemainingMs - dtMs);
        }
        const spec = WEAPONS[this.level]!;
        const shots: ShotSpec[] = [];
        this.tickPrimary(spec, dtMs, shots);
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
}
