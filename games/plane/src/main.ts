import Phaser from 'phaser';

class HelloScene extends Phaser.Scene {
    constructor() {
        super('hello');
    }

    create(): void {
        const { width, height } = this.scale;
        this.add
            .text(width / 2, height / 2, 'Phaser 已就位 · M1 OK', {
                fontFamily: 'monospace',
                fontSize: '32px',
                color: '#7df9ff'
            })
            .setOrigin(0.5);

        this.cameras.main.setBackgroundColor('#020617');
    }
}

new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#020617',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [HelloScene]
});
