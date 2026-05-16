import type { EnemyTypeKey } from './data/enemyTypes.js';

export const E = {
    EnemyKilled: 'enemy-killed',
    EnemyHit: 'enemy-hit',
    PlayerHit: 'player-hit',
    PlayerFire: 'player-fire',
    PowerupTaken: 'powerup-taken',
    WeaponChanged: 'weapon-changed',
    BossEntered: 'boss-entered',
    MarbleSpawn: 'marble-spawn'
} as const;

export type EventName = (typeof E)[keyof typeof E];

export interface EventPayloads {
    [E.EnemyKilled]: { enemyType: string; score: number; x: number; y: number };
    [E.EnemyHit]: { x: number; y: number };
    [E.PlayerHit]: { damage: number };
    [E.PlayerFire]: { weaponLevel: number };
    [E.PowerupTaken]: { kind: string };
    [E.WeaponChanged]: { level: number };
    [E.BossEntered]: { type: string };
    [E.MarbleSpawn]: { enemyType: EnemyTypeKey };
}
