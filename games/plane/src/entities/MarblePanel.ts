import Phaser from 'phaser';
import type { WorldSnapshot } from '@cp/marble-sim';
import { MARBLE_PANEL, MARBLE_WORLD, PLANE_THEME } from '../data/theme.js';
import {
    MARBLE_OBSTACLES,
    MARBLE_ZONES,
    MARBLE_LAUNCHER
} from '../data/marbleLayout.js';

function worldX(localX: number): number {
    return MARBLE_PANEL.x + MARBLE_WORLD.paddingX + localX;
}
function worldY(localY: number): number {
    return MARBLE_PANEL.y + MARBLE_WORLD.paddingY + localY;
}

export class MarblePanel {
    private dynamic: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene) {
        const bg = scene.add.graphics();
        bg.fillStyle(0x0a1422, 1);
        bg.fillRect(MARBLE_PANEL.x, MARBLE_PANEL.y, MARBLE_PANEL.w, MARBLE_PANEL.h);
        bg.lineStyle(2, 0x00ff66, 0.6);
        bg.strokeRect(
            MARBLE_PANEL.x + 1,
            MARBLE_PANEL.y + 1,
            MARBLE_PANEL.w - 2,
            MARBLE_PANEL.h - 2
        );

        bg.fillStyle(0x103020, 1);
        bg.lineStyle(1.5, 0x00cc66, 0.8);
        for (const o of MARBLE_OBSTACLES) {
            bg.fillCircle(worldX(o.x), worldY(o.y), o.r);
            bg.strokeCircle(worldX(o.x), worldY(o.y), o.r);
        }

        for (const z of MARBLE_ZONES) {
            const sx = worldX(z.x);
            const sy = worldY(z.y);
            bg.fillStyle(0x00ff66, 0.12);
            bg.fillRect(sx, sy, z.w, z.h);
            bg.lineStyle(1, 0x00ff66, 0.5);
            bg.strokeRect(sx, sy, z.w, z.h);
            scene.add
                .text(sx + z.w / 2, sy + z.h / 2, z.label, {
                    fontFamily: PLANE_THEME.fontFamily,
                    fontSize: '14px',
                    color: '#00ff66'
                })
                .setOrigin(0.5);
        }

        bg.fillStyle(0x00ff66, 0.8);
        bg.fillTriangle(
            worldX(MARBLE_LAUNCHER.x) - 6,
            worldY(MARBLE_LAUNCHER.y) - 6,
            worldX(MARBLE_LAUNCHER.x) + 6,
            worldY(MARBLE_LAUNCHER.y) - 6,
            worldX(MARBLE_LAUNCHER.x),
            worldY(MARBLE_LAUNCHER.y) + 6
        );

        this.dynamic = scene.add.graphics();
    }

    draw(snap: WorldSnapshot): void {
        this.dynamic.clear();
        this.dynamic.fillStyle(0x7dffaa, 1);
        this.dynamic.lineStyle(1, 0x00ff66, 0.9);
        for (const b of snap.balls) {
            if (!b.alive) continue;
            this.dynamic.fillCircle(worldX(b.pos.x), worldY(b.pos.y), b.r);
            this.dynamic.strokeCircle(worldX(b.pos.x), worldY(b.pos.y), b.r);
        }
    }
}
