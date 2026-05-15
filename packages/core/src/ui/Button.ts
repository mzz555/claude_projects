import Phaser from 'phaser';
import { DEFAULT_THEME, type Theme } from './theme.js';

export interface ButtonOpts {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    onClick: () => void;
    theme?: Theme;
}

export class Button extends Phaser.GameObjects.Container {
    private bg: Phaser.GameObjects.Rectangle;
    private label: Phaser.GameObjects.Text;
    private theme: Theme;

    constructor(scene: Phaser.Scene, opts: ButtonOpts) {
        super(scene, opts.x, opts.y);
        this.theme = opts.theme ?? DEFAULT_THEME;

        this.bg = scene.add
            .rectangle(0, 0, opts.w, opts.h, Phaser.Display.Color.HexStringToColor(this.theme.bg).color)
            .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(this.theme.primary).color);

        this.label = scene.add
            .text(0, 0, opts.label, {
                fontFamily: this.theme.fontFamily,
                fontSize: '20px',
                color: this.theme.primary
            })
            .setOrigin(0.5);

        this.add([this.bg, this.label]);
        this.setSize(opts.w, opts.h);
        this.setInteractive({ useHandCursor: true });

        this.on('pointerover', () => this.bg.setFillStyle(Phaser.Display.Color.HexStringToColor(this.theme.primary).color, 0.2));
        this.on('pointerout', () => this.bg.setFillStyle(Phaser.Display.Color.HexStringToColor(this.theme.bg).color));
        this.on('pointerdown', () => opts.onClick());

        scene.add.existing(this);
    }
}
