import Phaser from 'phaser';
import { DEFAULT_THEME, type Theme } from '../ui/theme.js';

export interface StatLine {
    label: string;
    value: string | number;
}

export interface GameOverSceneOpts {
    stats: StatLine[];
    onRetry: () => void;
    onMenu: () => void;
    theme?: Theme;
}

export class GameOverScene extends Phaser.Scene {
    private opts: GameOverSceneOpts;

    constructor(opts: GameOverSceneOpts) {
        super('gameover');
        this.opts = opts;
    }

    create(): void {
        const { width: W, height: H } = this.scale;
        const theme = this.opts.theme ?? DEFAULT_THEME;
        this.cameras.main.setBackgroundColor(theme.bg);

        this.add.text(W / 2, H / 2 - 180, '结算', {
            fontFamily: theme.fontFamily,
            fontSize: '48px',
            color: theme.primary
        }).setOrigin(0.5);

        let y = H / 2 - 80;
        for (const s of this.opts.stats) {
            this.add.text(W / 2, y, `${s.label}：${s.value}`, {
                fontFamily: theme.fontFamily,
                fontSize: '22px',
                color: theme.text
            }).setOrigin(0.5);
            y += 36;
        }

        const retry = this.add.text(W / 2 - 80, H / 2 + 140, '[ 再来 ]', {
            fontFamily: theme.fontFamily,
            fontSize: '22px',
            color: theme.primary
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const menu = this.add.text(W / 2 + 80, H / 2 + 140, '[ 主菜单 ]', {
            fontFamily: theme.fontFamily,
            fontSize: '22px',
            color: theme.text
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        retry.on('pointerdown', () => this.opts.onRetry());
        menu.on('pointerdown', () => this.opts.onMenu());
    }
}
