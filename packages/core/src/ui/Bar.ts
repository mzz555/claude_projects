import Phaser from 'phaser';
import { DEFAULT_THEME, type Theme } from './theme.js';
import { clamp } from '../math/index.js';

export interface BarOpts {
    x: number;
    y: number;
    w: number;
    h: number;
    fill?: string;
    track?: string;
    theme?: Theme;
}

export class Bar extends Phaser.GameObjects.Container {
    private track: Phaser.GameObjects.Rectangle;
    private fill: Phaser.GameObjects.Rectangle;
    private opts: BarOpts;
    private theme: Theme;

    constructor(scene: Phaser.Scene, opts: BarOpts) {
        super(scene, opts.x, opts.y);
        this.opts = opts;
        this.theme = opts.theme ?? DEFAULT_THEME;
        const trackColor = Phaser.Display.Color.HexStringToColor(opts.track ?? this.theme.bg).color;
        const fillColor = Phaser.Display.Color.HexStringToColor(opts.fill ?? this.theme.primary).color;
        this.track = scene.add.rectangle(0, 0, opts.w, opts.h, trackColor).setOrigin(0, 0.5);
        this.fill = scene.add.rectangle(0, 0, opts.w, opts.h, fillColor).setOrigin(0, 0.5);
        this.add([this.track, this.fill]);
        scene.add.existing(this);
    }

    setValue(t: number): void {
        this.fill.width = this.opts.w * clamp(t, 0, 1);
    }
}
