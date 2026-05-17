import Phaser from 'phaser';
import { PLANE_THEME } from '../data/theme.js';

export class PlaneTitleScene extends Phaser.Scene {
    constructor() {
        super('title');
    }

    create(): void {
        const { width: W, height: H } = this.scale;
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);

        this.add.text(W / 2, H / 2 - 100, '雷霆战机', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '56px',
            color: PLANE_THEME.primary
        }).setOrigin(0.5);

        this.add.text(W / 2, H / 2 - 40, 'Phaser 重写版 · M5', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '20px',
            color: PLANE_THEME.text
        }).setOrigin(0.5);

        const startBtn = this.add.text(W / 2, H / 2 + 60, '[ 开始游戏 ]', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '28px',
            color: PLANE_THEME.primary
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        startBtn.on('pointerdown', () => this.scene.start('play'));

        const testBtn = this.add.text(W / 2, H / 2 + 120, '[ 测试战场 ]', {
            fontFamily: PLANE_THEME.fontFamily,
            fontSize: '22px',
            color: '#ffaa00'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        testBtn.on('pointerdown', () => this.scene.start('test'));
    }
}
