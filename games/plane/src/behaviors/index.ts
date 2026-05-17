// games/plane/src/behaviors/index.ts
import { BehaviorRegistry } from './BehaviorRegistry.js';
import { SinusoidalBehavior } from './SinusoidalBehavior.js';
import { PlayerTrackerBehavior } from './PlayerTrackerBehavior.js';
import { HorizontalSweepBehavior } from './HorizontalSweepBehavior.js';
import { HoverBehavior } from './HoverBehavior.js';
import { ZigzagBehavior } from './ZigzagBehavior.js';
import { CircleBehavior } from './CircleBehavior.js';
import { Figure8Behavior } from './Figure8Behavior.js';
import { RandomWalkBehavior } from './RandomWalkBehavior.js';
import { DiveBombBehavior } from './DiveBombBehavior.js';
import { PulseBehavior } from './PulseBehavior.js';
import { ChargeBehavior } from './ChargeBehavior.js';
import { FlankBehavior } from './FlankBehavior.js';
import { MirrorBehavior } from './MirrorBehavior.js';
import { TornadoBehavior } from './TornadoBehavior.js';
import { SCurveBehavior } from './SCurveBehavior.js';
import { LoopBackBehavior } from './LoopBackBehavior.js';
import { BezierPathBehavior } from './BezierPathBehavior.js';
import { RamBehavior } from './RamBehavior.js';
import { CycloidBehavior } from './CycloidBehavior.js';
import { SpiralEntryBehavior } from './SpiralEntryBehavior.js';
import { HelicopterBehavior } from './HelicopterBehavior.js';
import { VeeringSwoopBehavior } from './VeeringSwoopBehavior.js';

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
    r.register('zigzag', () => new ZigzagBehavior());
    r.register('circle', () => new CircleBehavior());
    r.register('figure-8', () => new Figure8Behavior());
    r.register('random-walk', () => new RandomWalkBehavior());
    r.register('dive-bomb', () => new DiveBombBehavior());
    r.register('pulse', () => new PulseBehavior());
    r.register('charge', () => new ChargeBehavior());
    r.register('flank', () => new FlankBehavior());
    r.register('mirror', () => new MirrorBehavior());
    r.register('tornado', () => new TornadoBehavior());
    r.register('s-curve', () => new SCurveBehavior());
    r.register('loop-back', () => new LoopBackBehavior());
    r.register('bezier-path', () => new BezierPathBehavior());
    r.register('ram', () => new RamBehavior());
    r.register('cycloid', () => new CycloidBehavior());
    r.register('spiral-entry', () => new SpiralEntryBehavior());
    r.register('helicopter', () => new HelicopterBehavior());
    r.register('veering-swoop', () => new VeeringSwoopBehavior());
}

export { BehaviorRegistry } from './BehaviorRegistry.js';
export type { IEnemyBehavior, TunableDef, BehaviorFactory } from './IEnemyBehavior.js';
