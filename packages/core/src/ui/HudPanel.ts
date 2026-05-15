import Phaser from 'phaser';

export interface HudPanelOpts {
    x: number;
    y: number;
    direction?: 'row' | 'column';
    gap?: number;
}

export class HudPanel extends Phaser.GameObjects.Container {
    private opts: Required<HudPanelOpts>;

    constructor(scene: Phaser.Scene, opts: HudPanelOpts) {
        super(scene, opts.x, opts.y);
        this.opts = { x: opts.x, y: opts.y, direction: opts.direction ?? 'row', gap: opts.gap ?? 12 };
        scene.add.existing(this);
    }

    addChild(child: Phaser.GameObjects.GameObject): void {
        this.add(child);
        this.relayout();
    }

    private relayout(): void {
        let cursor = 0;
        for (const child of this.list as Phaser.GameObjects.Components.Transform[]) {
            if (this.opts.direction === 'row') {
                child.x = cursor;
                cursor += this.opts.gap;
            } else {
                child.y = cursor;
                cursor += this.opts.gap;
            }
        }
    }
}
