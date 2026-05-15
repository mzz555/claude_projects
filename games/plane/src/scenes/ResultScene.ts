import Phaser from 'phaser';
import { PLANE_THEME } from '../data/theme.js';

export interface ResultData {
    score: number;
    kills: number;
}

export class ResultScene extends Phaser.Scene {
    constructor() {
        super('result');
    }

    create(data: ResultData): void {
        const { width: W, height: H } = this.scale;
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);
        this.add
            .text(W / 2, H / 2 - 120, '本局结算', {
                fontFamily: PLANE_THEME.fontFamily,
                fontSize: '48px',
                color: PLANE_THEME.primary
            })
            .setOrigin(0.5);
        this.add
            .text(W / 2, H / 2 - 20, `分数：${data.score}`, {
                fontFamily: PLANE_THEME.fontFamily,
                fontSize: '28px',
                color: PLANE_THEME.text
            })
            .setOrigin(0.5);
        this.add
            .text(W / 2, H / 2 + 30, `击杀：${data.kills}`, {
                fontFamily: PLANE_THEME.fontFamily,
                fontSize: '28px',
                color: PLANE_THEME.text
            })
            .setOrigin(0.5);
        const back = this.add
            .text(W / 2, H / 2 + 140, '[ 返回标题 ]', {
                fontFamily: PLANE_THEME.fontFamily,
                fontSize: '24px',
                color: PLANE_THEME.primary
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => this.scene.start('title'));
    }
}
