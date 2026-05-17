// 可调试参数集中模块。Enemy / EnemyBullet / DebugPanel 都读这个对象的当前值。
// 修改后只影响新 spawn 的实例（已存在的不回炉）——避免半路改尺寸引起的物理抖动。
//
// showHitbox 会被 PlayScene 每帧同步到 physics.world.drawDebug。

export type EnemyBulletTextureKey =
    | 'enemy-bullet-small'
    | 'enemy-bullet-teardrop'
    | 'enemy-bullet-shrapnel'
    | 'enemy-bullet-orb'
    | 'enemy-bullet-heavy';

export type EnemyTypeKey =
    | 'scout'
    | 'fighter'
    | 'interceptor'
    | 'elite'
    | 'cruiser'
    | 'bomber'
    | 'carrier';

export interface BodyShape {
    /** 宽方向比例（1.0 = 紧贴 alpha 包围盒宽） */
    w: number;
    /** 高方向比例 */
    h: number;
}

export interface EnemyOverride {
    behaviorId?: string;
    hp?: number;
    score?: number;
    dmg?: number;
    vy?: number;
}

export interface DebugParams {
    enemyDisplayScale: number;
    enemyBodyRatio: number;
    /** 每机在 alpha 紧致包围盒基础上的 W/H 独立微调比例 */
    perEnemyBodyRatio: Record<EnemyTypeKey, BodyShape>;
    bulletSize: Record<EnemyBulletTextureKey, [number, number]>;
    showHitbox: boolean;
    /** 每机 override（仅 TestScene 用，PlayScene 不设值就走 ENEMY_TYPES 默认） */
    enemyOverrides: Partial<Record<EnemyTypeKey, EnemyOverride>>;
    /** 当前选中查看的敌机 typeKey（EnemyInspector 用） */
    selectedEnemyTypeKey: EnemyTypeKey | null;
    /** 暂停 */
    paused: boolean;
    /** 时间缩放（1.0 正常，0.25 慢放） */
    timeScale: number;
}

export const debugParams: DebugParams = {
    enemyDisplayScale: 3,
    enemyBodyRatio: 1.0,
    perEnemyBodyRatio: {
        scout: { w: 1, h: 1 },
        fighter: { w: 1, h: 1 },
        interceptor: { w: 1, h: 1 },
        elite: { w: 1, h: 1 },
        cruiser: { w: 1, h: 1 },
        bomber: { w: 1, h: 1 },
        carrier: { w: 1, h: 1 }
    },
    bulletSize: {
        'enemy-bullet-small': [66, 96],
        'enemy-bullet-teardrop': [72, 120],
        'enemy-bullet-shrapnel': [72, 126],
        'enemy-bullet-orb': [96, 96],
        'enemy-bullet-heavy': [96, 162]
    },
    showHitbox: false,
    enemyOverrides: {},
    selectedEnemyTypeKey: null,
    paused: false,
    timeScale: 1.0
};

export const ENEMY_TYPE_KEYS: EnemyTypeKey[] = [
    'scout',
    'fighter',
    'interceptor',
    'elite',
    'cruiser',
    'bomber',
    'carrier'
];

export const ENEMY_TYPE_LABELS: Record<EnemyTypeKey, string> = {
    scout: '侦察机',
    fighter: '战斗机',
    interceptor: '拦截机',
    elite: '精英机',
    cruiser: '巡洋舰',
    bomber: '轰炸机',
    carrier: '母舰'
};

export const ENEMY_BULLET_KEYS: EnemyBulletTextureKey[] = [
    'enemy-bullet-small',
    'enemy-bullet-teardrop',
    'enemy-bullet-shrapnel',
    'enemy-bullet-orb',
    'enemy-bullet-heavy'
];
