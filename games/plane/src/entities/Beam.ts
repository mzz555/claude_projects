import Phaser from 'phaser';

export class Beam extends Phaser.GameObjects.Rectangle {
    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0, 6, 720, 0x7df9ff);
        this.setOrigin(0.5, 1);
        this.setVisible(false);
        scene.add.existing(this);
    }

    show(playerX: number, playerY: number, width: number): void {
        this.setVisible(true);
        this.setPosition(playerX, playerY - 30);
        this.width = width;
    }

    hide(): void {
        this.setVisible(false);
    }
}
