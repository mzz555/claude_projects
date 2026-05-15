import Phaser from 'phaser';
import { DEFAULT_THEME, type Theme } from '../ui/theme.js';

export class PauseOverlay {
    static show(scene: Phaser.Scene, opts: { onResume: () => void; onMenu: () => void; theme?: Theme }): Phaser.GameObjects.Container {
        const { width: W, height: H } = scene.scale;
        const theme = opts.theme ?? DEFAULT_THEME;
        const c = scene.add.container(W / 2, H / 2);
        const mask = scene.add.rectangle(0, 0, W, H, 0x000000, 0.7);
        const title = scene.add.text(0, -60, '已暂停', {
            fontFamily: theme.fontFamily,
            fontSize: '40px',
            color: theme.primary
        }).setOrigin(0.5);
        const resume = scene.add.text(0, 10, '[ 继续 ]', {
            fontFamily: theme.fontFamily,
            fontSize: '22px',
            color: theme.primary
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const menu = scene.add.text(0, 60, '[ 主菜单 ]', {
            fontFamily: theme.fontFamily,
            fontSize: '22px',
            color: theme.text
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        resume.on('pointerdown', () => opts.onResume());
        menu.on('pointerdown', () => opts.onMenu());
        c.add([mask, title, resume, menu]);
        c.setDepth(10000);
        return c;
    }
}
