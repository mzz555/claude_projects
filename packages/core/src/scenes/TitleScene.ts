import Phaser from 'phaser';
import { DEFAULT_THEME, type Theme } from '../ui/theme.js';

export interface TitleSceneOpts {
    title: string;
    subtitle?: string;
    theme?: Theme;
    onStart: () => void;
}

export class TitleScene extends Phaser.Scene {
    private opts: TitleSceneOpts;

    constructor(opts: TitleSceneOpts) {
        super('title');
        this.opts = opts;
    }

    create(): void {
        const { width: W, height: H } = this.scale;
        const theme = this.opts.theme ?? DEFAULT_THEME;
        this.cameras.main.setBackgroundColor(theme.bg);

        this.add.text(W / 2, H / 2 - 80, this.opts.title, {
            fontFamily: theme.fontFamily,
            fontSize: '56px',
            color: theme.primary
        }).setOrigin(0.5);

        if (this.opts.subtitle) {
            this.add.text(W / 2, H / 2 - 20, this.opts.subtitle, {
                fontFamily: theme.fontFamily,
                fontSize: '20px',
                color: theme.text
            }).setOrigin(0.5);
        }

        const start = this.add.text(W / 2, H / 2 + 80, '[ 开始 ]', {
            fontFamily: theme.fontFamily,
            fontSize: '28px',
            color: theme.primary
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        start.on('pointerdown', () => this.opts.onStart());
    }
}
