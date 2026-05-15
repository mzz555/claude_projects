import Phaser from 'phaser';
import { DEFAULT_THEME, type Theme } from './theme.js';

export interface DialogOpts {
    title: string;
    body: string;
    onClose: () => void;
    theme?: Theme;
}

export class Dialog extends Phaser.GameObjects.Container {
    constructor(scene: Phaser.Scene, opts: DialogOpts) {
        const { width: W, height: H } = scene.scale;
        super(scene, W / 2, H / 2);
        const theme = opts.theme ?? DEFAULT_THEME;
        const bg = scene.add.rectangle(0, 0, 520, 280, 0x000000, 0.85).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(theme.primary).color);
        const title = scene.add.text(0, -100, opts.title, { fontFamily: theme.fontFamily, fontSize: '28px', color: theme.primary }).setOrigin(0.5);
        const body = scene.add.text(0, -20, opts.body, { fontFamily: theme.fontFamily, fontSize: '18px', color: theme.text, align: 'center', wordWrap: { width: 480 } }).setOrigin(0.5);
        const close = scene.add.text(0, 100, '[ 确认 ]', { fontFamily: theme.fontFamily, fontSize: '20px', color: theme.primary }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', () => opts.onClose());
        this.add([bg, title, body, close]);
        scene.add.existing(this);
    }
}
