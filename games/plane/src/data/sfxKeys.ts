export const SFX = {
    EnemyExplode: 'sfx-enemy-explode',
    PlayerHit: 'sfx-player-hit',
    MeteorBreak: 'sfx-meteor-break',
    PlayerFire: 'sfx-player-fire'
} as const;

export type SfxKey = (typeof SFX)[keyof typeof SFX];
