// games/plane/src/behaviors/index.ts
import { BehaviorRegistry } from './BehaviorRegistry.js';
import { SinusoidalBehavior } from './SinusoidalBehavior.js';
import { PlayerTrackerBehavior } from './PlayerTrackerBehavior.js';
import { HorizontalSweepBehavior } from './HorizontalSweepBehavior.js';
import { HoverBehavior } from './HoverBehavior.js';

let registered = false;

export function registerAllBehaviors(): void {
    if (registered) return;
    registered = true;
    const r = BehaviorRegistry.instance;
    r.register('sinusoidal', () => new SinusoidalBehavior());
    r.register('player-tracker', () => new PlayerTrackerBehavior({ id: 'player-tracker', displayName: '追踪玩家', trackSpeed: 80 }));
    r.register('elite-tracker', () => new PlayerTrackerBehavior({ id: 'elite-tracker', displayName: '精英追踪', trackSpeed: 60 }));
    r.register('horizontal-sweep', () => new HorizontalSweepBehavior({ speed: 240 }));
    r.register('hover', () => new HoverBehavior());
}

export { BehaviorRegistry } from './BehaviorRegistry.js';
export type { IEnemyBehavior, TunableDef, BehaviorFactory } from './IEnemyBehavior.js';
