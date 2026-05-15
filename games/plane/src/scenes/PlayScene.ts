import Phaser from 'phaser';
import { PLANE_THEME } from '../data/theme.js';

export class PlayScene extends Phaser.Scene {
    constructor() {
        super('play');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);
        this.add
            .text(this.scale.width / 2, this.scale.height / 2, 'PlayScene 占位 · M4a-4', {
                fontFamily: PLANE_THEME.fontFamily,
                fontSize: '24px',
                color: PLANE_THEME.text
            })
            .setOrigin(0.5);
    }
}
