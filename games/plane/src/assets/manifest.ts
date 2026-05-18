import type { AssetManifest } from '@cp/core';

export const planeManifest: AssetManifest = {
    images: [
        { key: 'hero', url: 'static/飞机png/hero/plane_01_blue_striker_hires.png' },
        { key: 'enemy-1', url: 'static/飞机png/enemy/enemy-1.png' },
        { key: 'enemy-2', url: 'static/飞机png/enemy/enemy-2.png' },
        { key: 'enemy-3', url: 'static/飞机png/enemy/enemy-3.png' },
        { key: 'enemy-4', url: 'static/飞机png/enemy/enemy-4.png' },
        { key: 'enemy-5', url: 'static/飞机png/enemy/enemy-5.png' },
        { key: 'enemy-6', url: 'static/飞机png/enemy/enemy-6.png' },
        { key: 'enemy-7', url: 'static/飞机png/enemy/enemy-7.png' },
        { key: 'bullet-hero', url: 'static/子弹/bullet-hero.png' },
        { key: 'bullet-hero-cyan-needle', url: 'static/子弹/hero/cyan-laser-needle.png' },
        { key: 'bullet-hero-emerald-zigzag', url: 'static/子弹/hero/emerald-zigzag-ion.png' },
        { key: 'bullet-hero-amber-spear', url: 'static/子弹/hero/amber-energy-spear.png' },
        { key: 'bullet-hero-amber-wedge', url: 'static/子弹/hero/amber-energy-wedge.png' },
        { key: 'bullet-hero-red-bolt', url: 'static/子弹/hero/red-orange-light-bolt.png' },
        { key: 'bullet-hero-blue-spiral', url: 'static/子弹/hero/blue-spiral-helix.png' },
        { key: 'enemy-bullet-small', url: 'static/子弹/enemy/enemy-small.png' },
        { key: 'enemy-bullet-teardrop', url: 'static/子弹/enemy/enemy-teardrop.png' },
        { key: 'enemy-bullet-shrapnel', url: 'static/子弹/enemy/enemy-shrapnel.png' },
        { key: 'enemy-bullet-orb', url: 'static/子弹/enemy/enemy-slow-orb.png' },
        { key: 'enemy-bullet-heavy', url: 'static/子弹/enemy/enemy-heavy.png' },
        { key: 'jet-flame', url: 'static/飞机尾部脉冲/jet-pulse-blue.png' }
    ],
    spritesheets: [
        { key: 'hit-spark', url: 'static/特效/hit-spark.png', frameW: 260, frameH: 180 }
    ]
};
