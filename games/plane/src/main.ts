import Phaser from 'phaser';
import { BootScene, TitleScene } from '@cp/core';
import { PLANE_THEME } from './data/theme.js';
import { planeManifest } from './assets/manifest.js';
import { PlayScene } from './scenes/PlayScene.js';
import { ResultScene } from './scenes/ResultScene.js';

const boot = new BootScene({ manifest: planeManifest, next: 'title' });
const title = new TitleScene({
    title: '雷霆战机',
    subtitle: 'Phaser 重写版 · M4b',
    theme: PLANE_THEME,
    onStart: () => game.scene.start('play')
});
const play = new PlayScene();
const result = new ResultScene();

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: PLANE_THEME.bg,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    scene: [boot, title, play, result]
});
