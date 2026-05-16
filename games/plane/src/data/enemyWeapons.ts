export type EnemyWeaponKey = 'single' | 'double' | 'rapid' | 'fan' | 'barrage';

export interface EnemyWeapon {
    intervalMs: number;
    pelletsPerShot: number;
    spreadRad: number;
    burstSize: number;
    burstIntervalMs: number;
    bulletSpeed: number;
    damageMultiplier: number;
    color: number;
}

export const ENEMY_WEAPONS: Record<EnemyWeaponKey, EnemyWeapon> = {
    single: {
        intervalMs: 3333,
        pelletsPerShot: 1,
        spreadRad: 0,
        burstSize: 1,
        burstIntervalMs: 0,
        bulletSpeed: 360,
        damageMultiplier: 1,
        color: 0xff4444
    },
    double: {
        intervalMs: 1833,
        pelletsPerShot: 3,
        spreadRad: 0.28,
        burstSize: 1,
        burstIntervalMs: 0,
        bulletSpeed: 390,
        damageMultiplier: 1,
        color: 0xff8800
    },
    rapid: {
        intervalMs: 1083,
        pelletsPerShot: 1,
        spreadRad: 0,
        burstSize: 5,
        burstIntervalMs: 133,
        bulletSpeed: 420,
        damageMultiplier: 1,
        color: 0xffcc00
    },
    fan: {
        intervalMs: 1250,
        pelletsPerShot: 7,
        spreadRad: 0.5,
        burstSize: 1,
        burstIntervalMs: 0,
        bulletSpeed: 360,
        damageMultiplier: 2,
        color: 0xff44aa
    },
    barrage: {
        intervalMs: 1417,
        pelletsPerShot: 5,
        spreadRad: 0.6,
        burstSize: 1,
        burstIntervalMs: 0,
        bulletSpeed: 360,
        damageMultiplier: 1.5,
        color: 0xcc44ff
    }
};

export const ENEMY_WEAPON_MAP: Record<string, EnemyWeaponKey> = {
    scout: 'single',
    fighter: 'double',
    interceptor: 'rapid',
    elite: 'fan',
    cruiser: 'barrage',
    bomber: 'double',
    carrier: 'double'
};
