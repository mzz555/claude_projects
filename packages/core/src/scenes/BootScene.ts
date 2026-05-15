import Phaser from 'phaser';
import { applyManifest, type AssetManifest } from '../assets/index.js';

export interface BootSceneOpts {
    manifest: AssetManifest;
    next: string;
}

export class BootScene extends Phaser.Scene {
    private opts: BootSceneOpts;

    constructor(opts: BootSceneOpts) {
        super('boot');
        this.opts = opts;
    }

    preload(): void {
        const { width: W, height: H } = this.scale;
        const bar = this.add.rectangle(W / 2, H / 2, 0, 8, 0x7df9ff).setOrigin(0, 0.5);
        const track = this.add.rectangle(W / 2 - 200, H / 2, 400, 8, 0x222222).setOrigin(0, 0.5);
        track.setDepth(-1);

        this.load.on('progress', (p: number) => {
            bar.x = W / 2 - 200;
            bar.width = 400 * p;
        });

        applyManifest(this.load, this.opts.manifest);
    }

    create(): void {
        this.scene.start(this.opts.next);
    }
}
