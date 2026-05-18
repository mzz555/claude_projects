import type { ShotLayer } from '../systems/WeaponSystem.js';

/**
 * 英雄机子弹层 → 贴图 key 映射。颜色匹配 weapons.ts 各层 color：
 *   primary  青   → cyan-laser-needle
 *   spread   绿   → emerald-zigzag-ion
 *   swarm    黄   → amber-energy-spear
 *   tracker  红   → red-orange-light-bolt（实际走 Tracker entity，此处保留以备 Bullet 路径切回）
 */
const NORMAL: Record<ShotLayer, string> = {
    primary: 'bullet-hero-cyan-needle',
    spread: 'bullet-hero-emerald-zigzag',
    swarm: 'bullet-hero-amber-spear',
    tracker: 'bullet-hero-red-bolt'
};

/**
 * 超频态：主炮换蓝色螺旋（更暴烈的能量形态），蜂群换琥珀楔形（同色不同形）。
 * 副炮/追踪保持原贴图，避免颜色辨识混乱。
 */
const OVERDRIVE: Record<ShotLayer, string> = {
    primary: 'bullet-hero-blue-spiral',
    spread: 'bullet-hero-emerald-zigzag',
    swarm: 'bullet-hero-amber-wedge',
    tracker: 'bullet-hero-red-bolt'
};

export function pickHeroBulletTexture(layer: ShotLayer, overdrive: boolean): string {
    return (overdrive ? OVERDRIVE : NORMAL)[layer];
}
