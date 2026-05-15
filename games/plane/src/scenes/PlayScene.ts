import Phaser from 'phaser';
import { PLANE_THEME, PLAY_AREA } from '../data/theme.js';
import { Player } from '../entities/Player.js';

export class PlayScene extends Phaser.Scene {
    private player!: Player;

    constructor() {
        super('play');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(PLANE_THEME.bg);
        this.physics.world.setBounds(PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.w, PLAY_AREA.h);

        const kbSource = {
            isKeyDown: (code: string): boolean => {
                const k = this.input.keyboard;
                if (!k) return false;
                return k.checkDown(k.addKey(code));
            }
        };

        this.player = new Player(
            this,
            this.scale.width / 2,
            PLAY_AREA.y + PLAY_AREA.h - 80,
            kbSource
        );
    }

    override update(_time: number, _delta: number): void {
        this.player.tick();
    }
}
