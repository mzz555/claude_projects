import type { EnemyTypeKey } from './enemyTypes.js';

/** 对峙距离表：敌机到玩家的 y 差超过该值时进入对峙模式。scout 不参与 */
export const CONFRONTATION_DISTANCE: Partial<Record<EnemyTypeKey, number>> = {
    fighter: 190,
    interceptor: 130,
    elite: 170,
    cruiser: 240,
    bomber: 270,
    carrier: 300
};
